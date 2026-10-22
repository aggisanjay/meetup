import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

/**
 * Connect the shared socket using the authenticated Clerk token
 */
export const connectSocketWithAuth = (token) => {
    if (token) {
        socket.auth = { token };
    }
    if (!socket.connected) {
        socket.connect();
    }
    return socket;
};