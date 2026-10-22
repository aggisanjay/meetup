import { useState, useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { socket } from "../config/socket";
import api from "../config/api";
import toast from "react-hot-toast";

const OFFLINE_STORAGE_PREFIX = "meetup_workspace_offline_";

export const useWorkspace = (roomId, user, canEdit = true, token = null) => {
    // Current active tool: 'notes' | 'whiteboard' | 'code'
    const [activeTool, setActiveTool] = useState("notes");

    // Sync status: 'saved' | 'syncing' | 'offline' | 'error'
    const [syncStatus, setSyncStatus] = useState("saved");
    const [lastSavedTime, setLastSavedTime] = useState(new Date());
    const [queuedUpdatesCount, setQueuedUpdatesCount] = useState(0);

    // Ephemeral remote presence cursors: socketId -> { userId, userName, docType, cursor, selection, activeTool, isTyping }
    const [remotePresences, setRemotePresences] = useState(new Map());

    // Y.Docs per tool: 'notes' -> Y.Doc, 'code' -> Y.Doc, 'whiteboard' -> Y.Doc
    const ydocsRef = useRef({
        notes: new Y.Doc(),
        code: new Y.Doc(),
        whiteboard: new Y.Doc(),
    });

    // Offline queue storage key
    const offlineStorageKey = user?.id && roomId ? `${OFFLINE_STORAGE_PREFIX}${user.id}_${roomId}` : null;

    // Load offline queue
    const getOfflineQueue = useCallback(() => {
        if (!offlineStorageKey) return [];
        try {
            const data = localStorage.getItem(offlineStorageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to read offline queue:", e);
            return [];
        }
    }, [offlineStorageKey]);

    // Save offline queue
    const saveOfflineQueue = useCallback((queue) => {
        if (!offlineStorageKey) return;
        try {
            if (queue.length === 0) {
                localStorage.removeItem(offlineStorageKey);
            } else {
                localStorage.setItem(offlineStorageKey, JSON.stringify(queue));
            }
            setQueuedUpdatesCount(queue.length);
        } catch (e) {
            console.error("Failed to persist offline queue:", e);
        }
    }, [offlineStorageKey]);

    // Drain queued offline updates upon reconnect
    const drainOfflineQueue = useCallback(async () => {
        const queue = getOfflineQueue();
        if (queue.length === 0 || !socket.connected) return;

        setSyncStatus("syncing");
        const remainingQueue = [...queue];

        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            try {
                await new Promise((resolve, reject) => {
                    socket.emit("workspace:update", item, (response) => {
                        if (response?.status === "ok" || response?.status === "duplicate") {
                            resolve();
                        } else {
                            reject(new Error(response?.message || "Failed to sync update"));
                        }
                    });
                });
                remainingQueue.shift();
                saveOfflineQueue(remainingQueue);
            } catch (err) {
                console.warn("[Workspace] Failed to drain update, will retry:", err.message);
                setSyncStatus("offline");
                return;
            }
        }

        setSyncStatus("saved");
        setLastSavedTime(new Date());
        saveOfflineQueue([]);
    }, [getOfflineQueue, saveOfflineQueue]);

    // Send an incremental CRDT update to server
    const sendUpdate = useCallback((docType, updateUint8) => {
        if (!canEdit) {
            toast.error("You have view-only access.");
            return;
        }

        const updateBase64 = Buffer.from(updateUint8).toString("base64");
        const opId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const payload = {
            schemaVersion: "1.0",
            roomId,
            docType,
            opId,
            update: updateBase64,
            clientTimestamp: Date.now(),
        };

        setSyncStatus("syncing");

        if (socket.connected) {
            socket.emit("workspace:update", payload, (response) => {
                if (response?.status === "ok" || response?.status === "duplicate") {
                    setSyncStatus("saved");
                    setLastSavedTime(new Date());
                } else if (response?.code === "PERMISSION_DENIED") {
                    setSyncStatus("error");
                    toast.error("Permission denied: viewers cannot edit.");
                } else {
                    // Queue for offline recovery if server rejected temporarily
                    const queue = getOfflineQueue();
                    queue.push(payload);
                    saveOfflineQueue(queue);
                    setSyncStatus("offline");
                }
            });
        } else {
            // Socket disconnected -> Queue locally
            const queue = getOfflineQueue();
            queue.push(payload);
            saveOfflineQueue(queue);
            setSyncStatus("offline");
        }
    }, [canEdit, roomId, getOfflineQueue, saveOfflineQueue]);

    // Initialize document synchronization with server
    const syncDoc = useCallback((docType) => {
        if (!roomId || !socket.connected) return;

        const doc = ydocsRef.current[docType];
        const stateVector = Y.encodeStateVector(doc);
        const stateVectorBase64 = Buffer.from(stateVector).toString("base64");

        socket.emit("workspace:get-doc", {
            roomId,
            docType,
            stateVector: stateVectorBase64,
        }, (res) => {
            if (res?.status === "ok" && res.data?.update) {
                const binary = new Uint8Array(Buffer.from(res.data.update, "base64"));
                Y.applyUpdate(doc, binary, "server");
                setSyncStatus("saved");
                setLastSavedTime(new Date());
            }
        });
    }, [roomId]);

    // Setup Socket.IO workspace listeners and Y.Doc event bindings
    useEffect(() => {
        if (!roomId) return;

        const docs = ydocsRef.current;

        // 1. Hook up local Yjs update listeners for each tool doc
        const unsubs = ["notes", "code", "whiteboard"].map((docType) => {
            const doc = docs[docType];
            const handleUpdate = (update, origin) => {
                // If update came from the server or remote peer, do NOT echo back to server!
                if (origin === "server" || origin === "remote") return;
                sendUpdate(docType, update);
            };
            doc.on("update", handleUpdate);
            return () => doc.off("update", handleUpdate);
        });

        // 2. Incoming remote updates from server broadcast
        const handleRemoteUpdate = ({ docType, update, opId, actorId }) => {
            if (!update) return;
            const doc = docs[docType || "notes"];
            if (doc) {
                const binary = new Uint8Array(Buffer.from(update, "base64"));
                Y.applyUpdate(doc, binary, "remote");
                setLastSavedTime(new Date());
            }
        };

        // 3. Incoming document sync response (fallback if not in ack)
        const handleDocSync = ({ docType, update }) => {
            if (!update) return;
            const doc = docs[docType || "notes"];
            if (doc) {
                const binary = new Uint8Array(Buffer.from(update, "base64"));
                Y.applyUpdate(doc, binary, "server");
                setSyncStatus("saved");
            }
        };

        // 4. Remote presence updates
        const handleRemotePresence = (data) => {
            if (!data?.socketId || data.socketId === socket.id) return;
            setRemotePresences((prev) => {
                const updated = new Map(prev);
                updated.set(data.socketId, data);
                return updated;
            });
        };

        const handlePresenceLeave = ({ socketId }) => {
            setRemotePresences((prev) => {
                const updated = new Map(prev);
                updated.delete(socketId);
                return updated;
            });
        };

        // 5. Connection events
        const handleConnect = () => {
            setSyncStatus("syncing");
            // Sync all three documents
            syncDoc("notes");
            syncDoc("code");
            syncDoc("whiteboard");
            drainOfflineQueue();
        };

        const handleDisconnect = () => {
            setSyncStatus("offline");
        };

        socket.on("workspace:update", handleRemoteUpdate);
        socket.on("workspace:doc-sync", handleDocSync);
        socket.on("workspace:presence", handleRemotePresence);
        socket.on("workspace:presence-leave", handlePresenceLeave);
        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        // Initial sync if connected
        if (socket.connected) {
            handleConnect();
        }

        // Initial count of queued items
        const initialQueue = getOfflineQueue();
        setQueuedUpdatesCount(initialQueue.length);

        return () => {
            unsubs.forEach((unsub) => unsub());
            socket.off("workspace:update", handleRemoteUpdate);
            socket.off("workspace:doc-sync", handleDocSync);
            socket.off("workspace:presence", handleRemotePresence);
            socket.off("workspace:presence-leave", handlePresenceLeave);
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
        };
    }, [roomId, sendUpdate, syncDoc, drainOfflineQueue, getOfflineQueue]);

    // Throttle emit presence updates (e.g. mouse move, selection, cursor)
    const lastPresenceEmitRef = useRef(0);
    const updatePresence = useCallback((presenceData) => {
        if (!socket.connected || !roomId) return;
        const now = Date.now();
        if (now - lastPresenceEmitRef.current < 40) return; // 25fps max
        lastPresenceEmitRef.current = now;

        socket.emit("workspace:presence", {
            roomId,
            docType: activeTool,
            activeTool,
            ...presenceData,
        });
    }, [roomId, activeTool]);

    // Version management: Create Named Version
    const createVersion = useCallback(async (versionName, docType = activeTool) => {
        if (!token) return;
        try {
            const res = await api.post(`/api/meetings/${roomId}/workspace/versions`, {
                versionName,
                docType,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Version "${versionName}" saved!`);
            return res.data?.version;
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to create version";
            toast.error(msg);
            throw err;
        }
    }, [roomId, activeTool, token]);

    // Version management: Restore Version
    const restoreVersion = useCallback(async (versionId, docType = activeTool) => {
        if (!token) return;
        try {
            const res = await api.post(`/api/meetings/${roomId}/workspace/versions/${versionId}/restore`, {
                docType,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Document restored to selected version!");
            // Re-sync current doc to apply restored state
            syncDoc(docType);
            return res.data;
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to restore version";
            toast.error(msg);
            throw err;
        }
    }, [roomId, activeTool, token, syncDoc]);

    return {
        activeTool,
        setActiveTool,
        syncStatus,
        lastSavedTime,
        queuedUpdatesCount,
        remotePresences,
        updatePresence,
        createVersion,
        restoreVersion,
        retrySync: drainOfflineQueue,
        ydocs: ydocsRef.current,
    };
};
