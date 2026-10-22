import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../config/socket";
import api from "../config/api";

export const useChat = (roomId, user, token) => {
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const isChatOpenRef = useRef(isChatOpen);
    useEffect(() => {
        isChatOpenRef.current = isChatOpen;
    }, [isChatOpen]);

    // Fetch message history on initial load
    useEffect(() => {
        if (!roomId || !token) return;

        let isMounted = true;
        const fetchHistory = async () => {
            try {
                const res = await api.get(`/api/meetings/sessions/${roomId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (isMounted && res.data?.meeting?.messages) {
                    const formattedHistory = res.data.meeting.messages.map((m) => ({
                        id: m.id.toString(),
                        text: m.text,
                        senderId: m.sender,
                        senderName: m.senderName,
                        timestamp: m.timestamp,
                        time: new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    }));
                    setMessages(formattedHistory);
                }
            } catch (err) {
                // If session endpoint is restricted, continue with in-memory chat
                console.debug("[Chat] History not loaded or no past messages:", err?.response?.status);
            }
        };

        fetchHistory();
        return () => {
            isMounted = false;
        };
    }, [roomId, token]);

    // Listen for live messages
    useEffect(() => {
        if (!roomId) return;

        const handleReceiveMessage = (message) => {
            setMessages((prev) => {
                // Deduplicate by ID
                if (prev.some((m) => m.id === message.id)) {
                    return prev;
                }
                return [...prev, message];
            });

            if (!isChatOpenRef.current) {
                setUnreadCount((prev) => prev + 1);
            }
        };

        socket.on("receive-message", handleReceiveMessage);

        return () => {
            socket.off("receive-message", handleReceiveMessage);
        };
    }, [roomId]);

    const sendMessage = useCallback(
        (text) => {
            if (!text.trim() || !user) return;

            const message = {
                id: `client_${Date.now()}`,
                text: text.trim(),
                senderName: user.name || "You",
                senderId: user.id,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            socket.emit("send-message", { roomId, message });
        },
        [roomId, user]
    );

    const toggleChat = useCallback(() => {
        setIsChatOpen((prev) => {
            if (!prev) setUnreadCount(0);
            return !prev;
        });
    }, []);

    return {
        messages,
        sendMessage,
        unreadCount,
        isChatOpen,
        toggleChat,
    };
};