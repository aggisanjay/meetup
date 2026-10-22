import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";
import { initDB } from "./config/db.js";
import { clerkMiddleware } from '@clerk/express';
import { handleClerkWebhook } from "./controllers/webhookController.js";
import meetingRouter from "./routes/meetingRoutes.js";
import { Server } from "socket.io";
import { setupSocketIO } from "./socket.js";

const app = express();
const server = http.createServer(app);

// Connect to Neon & Initialize Tables
await initDB();

const allowedOrigins = (process.env.ORIGINS || "http://localhost:5173,http://localhost:3000").split(",");
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());

app.use("/api/clerk", express.raw({ type: "application/json" }), handleClerkWebhook);
app.use(express.json({ limit: "5mb" }));
app.use(clerkMiddleware());

app.get("/", (_req, res) => res.send("API is Live!"));
app.use("/api/meetings", meetingRouter);

const io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
    maxHttpBufferSize: 1e6 // 1MB max payload
});

setupSocketIO(io);

// Centralized Error Handler
app.use((err, _req, res, _next) => {
    console.error(`[Error] ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
    server.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}

export { app, server, io };