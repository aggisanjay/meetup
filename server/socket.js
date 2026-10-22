import * as Y from "yjs";
import { sql } from "./config/db.js";
import { authenticateSocketToken } from "./middleware/auth.js";
import {
    getOrLoadDoc,
    applyAndPersistUpdate,
    recordLatency,
    metrics,
    removeRoomFromCache
} from "./services/workspaceService.js";

// Socket.IO Room State: roomId -> Map<socketId, participantObject>
const rooms = new Map();

// Rate limiting map: socketId -> { messageCount, lastMessageTime, updateCount, lastUpdateTime }
const rateLimits = new Map();

export function setupSocketIO(io) {
    // 1. Socket.IO Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || 
                          socket.handshake.headers?.authorization?.replace("Bearer ", "");

            if (!token) {
                // If no token, reject unauthenticated connections
                return next(new Error("Authentication required: token missing"));
            }

            const authenticatedUser = await authenticateSocketToken(token);
            socket.user = authenticatedUser;
            next();
        } catch (err) {
            console.error("[Socket Auth] Handshake rejected:", err.message);
            next(new Error(`Unauthorized: ${err.message}`));
        }
    });

    io.on("connection", (socket) => {
        metrics.activeConnections++;
        let currentRoomId = null;
        let currentMeetingId = null;
        let currentUserRole = "viewer";

        // Initialize rate limit record
        rateLimits.set(socket.id, {
            messageCount: 0,
            lastMessageTime: Date.now(),
            updateCount: 0,
            lastUpdateTime: Date.now()
        });

        // Helper: Check rate limit
        const checkRateLimit = (type, limit, windowMs) => {
            const record = rateLimits.get(socket.id);
            if (!record) return true;
            const now = Date.now();

            if (type === "message") {
                if (now - record.lastMessageTime > windowMs) {
                    record.messageCount = 1;
                    record.lastMessageTime = now;
                    return true;
                }
                record.messageCount++;
                return record.messageCount <= limit;
            }

            if (type === "update") {
                if (now - record.lastUpdateTime > windowMs) {
                    record.updateCount = 1;
                    record.lastUpdateTime = now;
                    return true;
                }
                record.updateCount++;
                return record.updateCount <= limit;
            }

            return true;
        };

        // User joins a meeting room
        socket.on("join-room", async ({ roomId, audioEnabled = true, videoEnabled = true, initialTool = "notes" }, callback) => {
            try {
                if (!roomId) {
                    socket.emit("meeting-error", { message: "Invalid room ID" });
                    if (typeof callback === "function") callback({ status: "error", message: "Invalid room ID" });
                    return;
                }

                // Verify meeting from DB
                const meetings = await sql`
                    SELECT m.*, u.id as host_user_id, u.name as host_name 
                    FROM meetings m
                    JOIN users u ON m.host_id = u.id
                    WHERE m.meeting_id = ${roomId}
                `;

                if (meetings.length === 0) {
                    socket.emit("meeting-ended", { message: "Meeting not found." });
                    return;
                }

                const meeting = meetings[0];
                if (meeting.status === "ended") {
                    socket.emit("meeting-ended", { message: "This meeting has already ended." });
                    return;
                }

                currentRoomId = roomId;
                currentMeetingId = meeting.id;

                // Determine verified user role
                const isHost = meeting.host_id.toString() === socket.user.id.toString();
                let role = isHost ? "host" : "editor";

                if (!isHost) {
                    const memberRecord = await sql`
                        SELECT role FROM meeting_members
                        WHERE meeting_id = ${meeting.id} AND user_id = ${socket.user.id}
                    `;

                    if (memberRecord.length > 0) {
                        role = memberRecord[0].role;
                    } else {
                        // Check if meeting is private
                        if (meeting.is_private) {
                            socket.emit("meeting-error", { message: "Access denied. This is a private meeting and you are not invited." });
                            return;
                        }

                        // Auto-enroll non-host
                        role = meeting.default_role || "editor";
                        await sql`
                            INSERT INTO meeting_members (meeting_id, user_id, role, invited_by)
                            VALUES (${meeting.id}, ${socket.user.id}, ${role}, ${meeting.host_id})
                            ON CONFLICT (meeting_id, user_id) DO NOTHING
                        `;
                    }
                }

                currentUserRole = role;
                socket.userRole = role;

                // Participant record using server-verified user identity
                const participant = {
                    socketId: socket.id,
                    userId: socket.user.id,
                    userName: socket.user.name || "Participant",
                    email: socket.user.email,
                    isHost,
                    role,
                    canEdit: role === "host" || role === "editor",
                    audioEnabled: Boolean(audioEnabled),
                    videoEnabled: Boolean(videoEnabled),
                    activeTool: initialTool,
                    joinedAt: new Date().toISOString()
                };

                if (!rooms.has(roomId)) {
                    rooms.set(roomId, new Map());
                    metrics.activeRooms = rooms.size;
                }

                const roomParticipants = rooms.get(roomId);

                // Capacity check based on host's plan
                const hosts = await sql`SELECT plan FROM users WHERE id = ${meeting.host_id}`;
                const hostPlan = hosts[0]?.plan || "free";
                const maxParticipants = hostPlan === "premium" ? 100 : 10;

                if (roomParticipants.size >= maxParticipants && !roomParticipants.has(socket.id)) {
                    socket.emit("meeting-ended", {
                        message: `Meeting capacity limit reached (${maxParticipants} max for ${hostPlan.toUpperCase()} plan). Host must upgrade to Premium.`,
                    });
                    return;
                }

                socket.join(roomId);

                // Add to room state
                const existingUsers = Array.from(roomParticipants.values());
                roomParticipants.set(socket.id, participant);

                // Register participant in meeting_participants
                await sql`
                    INSERT INTO meeting_participants (meeting_id, user_id, name, joined_at)
                    VALUES (${meeting.id}, ${socket.user.id}, ${participant.userName}, NOW())
                `;

                // Send self joined confirmation with role and existing participants
                socket.emit("room-joined", {
                    roomId,
                    meetingTitle: meeting.title,
                    role,
                    isHost,
                    canEdit: role === "host" || role === "editor",
                    existingUsers,
                    user: participant,
                    serverTimestamp: Date.now()
                });

                // Send all existing users for WebRTC peer connections
                socket.emit("all-users", existingUsers);

                // Notify others in room
                socket.to(roomId).emit("user-joined", participant);

                if (typeof callback === "function") {
                    callback({
                        status: "ok",
                        role,
                        isHost,
                        canEdit: role === "host" || role === "editor",
                        existingUsers
                    });
                }

            } catch (err) {
                console.error("[Socket] Error joining room:", err);
                socket.emit("meeting-ended", { message: "Failed to join room." });
                if (typeof callback === "function") callback({ status: "error", message: "Failed to join room" });
            }
        });

        // 2. Collaborative Workspace: Request Document Snapshot & Update Diff
        socket.on("workspace:get-doc", async ({ roomId, docType = "notes", stateVector = null }, callback) => {
            const startReq = Date.now();
            try {
                if (!roomId || !currentMeetingId) return;

                const doc = await getOrLoadDoc(currentMeetingId, docType);
                let updateUint8;

                if (stateVector) {
                    const clientVector = new Uint8Array(Buffer.from(stateVector, "base64"));
                    updateUint8 = Y.encodeStateAsUpdate(doc, clientVector);
                } else {
                    updateUint8 = Y.encodeStateAsUpdate(doc);
                }

                const updateBase64 = Buffer.from(updateUint8).toString("base64");
                const response = {
                    schemaVersion: "1.0",
                    roomId,
                    docType,
                    update: updateBase64,
                    serverTimestamp: Date.now()
                };

                recordLatency(metrics.receiveToAckLatencies, Date.now() - startReq);
                if (typeof callback === "function") {
                    callback({ status: "ok", data: response });
                } else {
                    socket.emit("workspace:doc-sync", response);
                }
            } catch (err) {
                console.error("[Workspace] Get doc error:", err);
                if (typeof callback === "function") {
                    callback({ status: "error", error: "Failed to load document" });
                }
            }
        });

        // 3. Collaborative Workspace: Apply & Broadcast Incremental CRDT Update
        socket.on("workspace:update", async ({ roomId, docType = "notes", opId, update, schemaVersion = "1.0" }, ack) => {
            const startUpdate = Date.now();
            try {
                if (!roomId || !update || !currentMeetingId) return;

                // Authorization check: Viewers cannot modify documents!
                if (currentUserRole === "viewer") {
                    metrics.unauthorizedActionsBlocked++;
                    socket.emit("workspace:error", {
                        code: "PERMISSION_DENIED",
                        message: "Viewers have read-only access and cannot edit documents."
                    });
                    if (typeof ack === "function") ack({ status: "error", code: "PERMISSION_DENIED" });
                    return;
                }

                // Rate limiting: max 60 updates per second
                if (!checkRateLimit("update", 60, 1000)) {
                    if (typeof ack === "function") ack({ status: "rate_limited" });
                    return;
                }

                // Bounded payload size check (max 512KB)
                if (typeof update === "string" && update.length > 512 * 1024) {
                    socket.emit("workspace:error", { code: "PAYLOAD_TOO_LARGE", message: "Update exceeds maximum allowed size" });
                    if (typeof ack === "function") ack({ status: "error", code: "PAYLOAD_TOO_LARGE" });
                    return;
                }

                // Apply update to in-memory Yjs doc and persist to DB
                const result = await applyAndPersistUpdate({
                    meetingId: currentMeetingId,
                    roomId,
                    docType,
                    updateBase64: update,
                    opId,
                    actorId: socket.user.id,
                    actorName: socket.user.name
                });

                if (result.duplicate) {
                    if (typeof ack === "function") ack({ status: "duplicate", opId });
                    return;
                }

                const broadcastPayload = {
                    schemaVersion,
                    roomId,
                    docType,
                    opId,
                    actorId: socket.user.id,
                    actorName: socket.user.name,
                    update,
                    serverTimestamp: Date.now()
                };

                const startBroadcast = Date.now();
                // Broadcast to everyone else in the room
                socket.to(roomId).emit("workspace:update", broadcastPayload);
                recordLatency(metrics.receiveToBroadcastLatencies, Date.now() - startBroadcast);

                // Acknowledge back to sender
                recordLatency(metrics.receiveToAckLatencies, Date.now() - startUpdate);
                if (typeof ack === "function") {
                    ack({ status: "ok", opId, serverTimestamp: Date.now() });
                }

            } catch (err) {
                console.error("[Workspace] Update error:", err);
                if (typeof ack === "function") {
                    ack({ status: "error", message: "Failed to persist update" });
                }
            }
        });

        // 4. Collaborative Presence: Live Cursors, Selection & Tool Switch (Ephemeral)
        socket.on("workspace:presence", ({ roomId, docType, cursor, selection, activeTool, isTyping }) => {
            if (!roomId || !currentRoomId) return;

            // Broadcast ephemeral presence without persisting
            socket.to(roomId).emit("workspace:presence", {
                socketId: socket.id,
                userId: socket.user.id,
                userName: socket.user.name,
                docType,
                cursor,
                selection,
                activeTool,
                isTyping: Boolean(isTyping),
                timestamp: Date.now()
            });
        });

        // 5. WebRTC Signaling: Offer
        socket.on("offer", ({ targetSocketId, callerSocketId, sdp }) => {
            io.to(targetSocketId).emit("offer", {
                callerSocketId: socket.id,
                sdp,
                callerUser: {
                    socketId: socket.id,
                    userId: socket.user.id,
                    userName: socket.user.name
                }
            });
        });

        // 6. WebRTC Signaling: Answer
        socket.on("answer", ({ targetSocketId, responderSocketId, sdp }) => {
            metrics.webrtcConnectionsEstablished++;
            io.to(targetSocketId).emit("answer", {
                responderSocketId: socket.id,
                sdp
            });
        });

        // 7. WebRTC Signaling: ICE Candidate
        socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
            io.to(targetSocketId).emit("ice-candidate", {
                senderSocketId: socket.id,
                candidate
            });
        });

        // 8. Media toggles
        socket.on("toggle-audio", ({ roomId, audioEnabled }) => {
            if (rooms.has(roomId) && rooms.get(roomId).has(socket.id)) {
                rooms.get(roomId).get(socket.id).audioEnabled = audioEnabled;
            }
            socket.to(roomId).emit("user-toggled-audio", {
                socketId: socket.id,
                audioEnabled
            });
        });

        socket.on("toggle-video", ({ roomId, videoEnabled }) => {
            if (rooms.has(roomId) && rooms.get(roomId).has(socket.id)) {
                rooms.get(roomId).get(socket.id).videoEnabled = videoEnabled;
            }
            socket.to(roomId).emit("user-toggled-video", {
                socketId: socket.id,
                videoEnabled
            });
        });

        // 9. Chat message event: Authoritative sender identity & DB persistence
        socket.on("send-message", async ({ roomId, message }) => {
            try {
                if (!roomId || !message?.text) return;

                // Rate limiting: max 5 messages per 2 seconds
                if (!checkRateLimit("message", 5, 2000)) {
                    socket.emit("chat-error", { message: "You are sending messages too quickly." });
                    return;
                }

                // Bounded message length
                const cleanText = message.text.trim().substring(0, 2000);
                if (!cleanText) return;

                const meetings = await sql`SELECT id, status FROM meetings WHERE meeting_id = ${roomId}`;
                if (meetings.length > 0 && meetings[0].status !== "ended") {
                    const meetingId = meetings[0].id;
                    const senderId = socket.user.id;
                    const senderName = socket.user.name || "Anonymous";

                    const [savedMsg] = await sql`
                        INSERT INTO meeting_messages (meeting_id, sender_id, sender_name, text, timestamp)
                        VALUES (${meetingId}, ${senderId}, ${senderName}, ${cleanText}, NOW())
                        RETURNING id, timestamp
                    `;

                    metrics.totalMessagesReceived++;

                    io.in(roomId).emit("receive-message", {
                        id: savedMsg.id.toString(),
                        text: cleanText,
                        senderId,
                        senderName,
                        senderSocketId: socket.id,
                        timestamp: savedMsg.timestamp,
                        time: new Date(savedMsg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    });
                }
            } catch (err) {
                console.error("[Socket] Error saving chat message:", err);
            }
        });

        // 10. End meeting for all participants (Verified Host Only)
        socket.on("end-meeting", async ({ roomId }) => {
            try {
                if (!roomId) return;

                const meetings = await sql`SELECT id, host_id FROM meetings WHERE meeting_id = ${roomId}`;
                if (meetings.length === 0) return;
                const meeting = meetings[0];

                // Verify caller is actually the host!
                if (meeting.host_id.toString() !== socket.user.id.toString()) {
                    metrics.unauthorizedActionsBlocked++;
                    socket.emit("meeting-error", { message: "Only the host can end the meeting." });
                    return;
                }

                await sql`
                    UPDATE meetings
                    SET status = 'ended', ended_at = NOW()
                    WHERE id = ${meeting.id}
                `;

                io.in(roomId).emit("meeting-ended", { message: "The meeting has been ended by the host." });
                rooms.delete(roomId);
                removeRoomFromCache(meeting.id);
            } catch (err) {
                console.error("[Socket] Error ending meeting:", err);
            }
        });

        // 11. Disconnect handling
        socket.on("disconnect", () => {
            metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
            rateLimits.delete(socket.id);

            if (currentRoomId && rooms.has(currentRoomId)) {
                const roomParticipants = rooms.get(currentRoomId);
                const departingUser = roomParticipants.get(socket.id);
                roomParticipants.delete(socket.id);

                if (roomParticipants.size === 0) {
                    rooms.delete(currentRoomId);
                    metrics.activeRooms = rooms.size;
                    if (currentMeetingId) removeRoomFromCache(currentMeetingId);
                } else {
                    // Notify peers
                    socket.to(currentRoomId).emit("user-left", {
                        socketId: socket.id,
                        user: departingUser
                    });
                    // Broadcast cursor removal
                    socket.to(currentRoomId).emit("workspace:presence-leave", {
                        socketId: socket.id,
                        userId: socket.user?.id
                    });
                }
            }
        });
    });
}