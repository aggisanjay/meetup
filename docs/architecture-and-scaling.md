# MeetUp Real-Time Collaborative Architecture & Scaling Guide

## 1. System Overview

MeetUp has been upgraded from a basic WebRTC signaling app into a real-time collaborative meeting platform. The architecture integrates:
- **WebRTC Mesh Signaling**: Direct peer-to-peer audio and video communication with ICE candidate queueing and graceful media fallbacks.
- **Yjs CRDT Engine**: Conflict-free document replication across notes, whiteboard, and code editors.
- **Neon Serverless PostgreSQL**: Durable persistence of document snapshots (`workspace_snapshots`), incremental updates (`workspace_updates`), version milestones (`workspace_versions`), and audit events (`audit_events`).
- **Socket.IO Transport**: Secure WebSockets transport with Clerk authentication token verification on handshake, rate limiting, and ephemeral presence broadcasting.

---

## 2. Real-Time Synchronization Protocol

### Event Specifications
Every collaborative event follows a typed, versioned schema:
```json
{
  "schemaVersion": "1.0",
  "roomId": "abc-def-ghi",
  "docType": "notes | code | whiteboard",
  "opId": "op_1792695712_8fa3b",
  "actorId": "user_2aX9...",
  "actorName": "Alex Rivera",
  "update": "<base64 encoded Yjs update binary>",
  "serverTimestamp": 1792695712045
}
```

### Idempotency & Deduplication
- Incoming `opId` tokens are tracked in an in-memory LRU ring buffer (`seenOpIds`).
- If a client resends an update (e.g. during network retries or reconnects), the server detects the duplicate and acknowledges with `{ status: "duplicate", opId }`, preventing duplicate inserts and redundant broadcasts.

### Permissions Enforcement (RBAC)
- **Host**: Manages room settings, invites members, modifies member roles, and terminates meeting sessions.
- **Editor**: Modifies notes, whiteboard drawings, and code.
- **Viewer**: Read-only access. The server validates `socket.userRole` on every `workspace:update` and rejects viewer edits with code `PERMISSION_DENIED`.

---

## 3. Persistence, Compaction & Recovery

### Persistence Model
1. **Incremental Updates**: Every authorized `workspace:update` is inserted into `workspace_updates`.
2. **Snapshot Compaction**: When the count of updates for a document reaches 50, a full `workspace_snapshot` is generated and older compacted updates up to `maxUpdateId` are safely purged.
3. **Server Restart Recovery**: On startup or room initialization, `getOrLoadDoc(meetingId, docType)` queries the latest snapshot from `workspace_snapshots` and merges any newer updates from `workspace_updates`.
4. **Client Reconnect Recovery**: The client sends its state vector (`Y.encodeStateVector(doc)`). The server calculates the exact delta using `Y.encodeStateAsUpdate(doc, clientVector)` and transmits missing updates.

---

## 4. Horizontal Scaling Architecture (Multi-Instance Deployment)

### In-Memory State Limits
- A single Node.js process holds active room maps and in-memory `Y.Doc` instances.
- Limits of a single instance: ~10,000 concurrent socket connections and ~500 active rooms before heap pressure.

### Multi-Instance Scaling Strategy
When scaling beyond one server instance:
```
                      [ Load Balancer (AWS ALB / NGINX / Cloudflare) ]
                                    │ (Sticky Sessions via Cookie)
                 ┌──────────────────┼──────────────────┐
                 ▼                                     ▼
        [ Node Instance 1 ]                   [ Node Instance 2 ]
                 │                                     │
                 └──────────────┬──────────────────────┘
                                │
                      [ Redis Cluster / PubSub ]
                        (@socket.io/redis-adapter)
                                │
                 ┌──────────────┴──────────────────────┐
                 ▼                                     ▼
       [ Neon PostgreSQL ]                    [ Clerk Auth API ]
       (Durable Snapshots)                    (JWT Verification)
```

1. **Sticky Sessions**: Required for HTTP long-polling handshake fallbacks before WebSocket upgrade. Configure `ip_hash` or cookie-based stickiness on the ingress load balancer.
2. **Redis Adapter (`@socket.io/redis-adapter`)**: Enables cross-instance room broadcasting for `workspace:update`, chat messages, and signaling.
3. **Durable Storage Invariant**: Redis is strictly used as an ephemeral message bus. PostgreSQL remains the sole authoritative source of durable document history and snapshots.
4. **Reconnect Storm Prevention**:
   - Clients implement exponential backoff with randomized jitter (1s - 5s).
   - In-memory rate limiting throttles excessive join requests (max 60 updates/sec per socket).
5. **Graceful Shutdown**:
   - On `SIGTERM`/`SIGINT`, the server stops accepting new connections, flushes in-memory document state vectors as final snapshots to Neon DB, and gives active sockets 5 seconds to gracefully disconnect.

---

## 5. WebRTC Network Resilience & STUN/TURN Strategy

- **STUN Servers**: Public Google STUN servers (`stun:stun.l.google.com:19302`) resolve public IP/port mappings for endpoints behind standard NATs.
- **TURN Requirement**: Symmetric NATs (common on cellular networks and corporate firewalls) block direct P2P connections. For production deployment, configure `VITE_ICE_SERVERS` with Coturn or Twilio/Xirsys short-lived credentials.
- **ICE Queueing**: The client implements candidate buffering to eliminate `InvalidStateError` when ICE candidates arrive ahead of SDP negotiation answers.
