# 🎥 MeetUp — Real-Time Collaborative Meeting & Workspace Platform

MeetUp is a full-stack, production-oriented video meeting and real-time collaboration application. Built with **React 19**, **Express 5**, **WebRTC**, **Socket.IO**, **Yjs (CRDTs)**, **Clerk Authentication**, and **Neon PostgreSQL**.

Beyond peer-to-peer video/audio calls and chat, MeetUp features an in-meeting collaborative workspace with **Shared Notes**, an **Interactive Whiteboard**, and a **Collaborative Code Editor** with live cursors, role-based permissions (Host, Editor, Viewer), durable snapshot persistence, version history restoration, and offline conflict-free merging.

---

## ✨ Features

### 🤝 Collaborative Workspace
- **Shared Rich-Text Notes** — Collaborative markdown/rich-text document with formatting tools (Headings, Lists, Tasks, Code blocks, Quotes), word/character counters, live preview, and `.md` export.
- **Shared Whiteboard / Canvas** — High-performance vector drawing board with freehand pen, lines, arrows, rectangles, circles, text notes, color palette, stroke widths, undo/redo manager, and PNG export.
- **Collaborative Code Editor** — Multi-language editor (JavaScript, TypeScript, Python, HTML, JSON, SQL) with dark/light themes, line numbers, copy-to-clipboard, and a sandboxed JavaScript code execution console.
- **Live Ephemeral Cursors** — Real-time cursor coordinates and typing indicators rendered for all active participants without persistent database overhead.
- **Sync Status & Offline Recovery** — Real-time indicator ("Saved to cloud", "Syncing...", "Offline - X queued"). Queues local document updates during network drops and deterministically merges changes on reconnect using Yjs.
- **Version History & Restore** — Create named milestone snapshots and restore previous document states with one click, preserving complete audit provenance.

### 🔐 Roles, Permissions & Security (RBAC)
- **Role Enforcement** — Three distinct meeting roles:
  - **Host**: Manage meeting lifecycle, invite participants, update member roles, and end meeting for all.
  - **Editor**: Full read/write access to shared notes, whiteboard, and code editor.
  - **Viewer**: Real-time read-only access. Server strictly validates incoming Socket.IO events and blocks viewer updates (`PERMISSION_DENIED`).
- **Private & Open Meetings** — Hosts can mark rooms as private (accessible only to invited users) or open with configurable default roles.
- **Secure Socket Handshake** — Socket.IO connections require verified Clerk authentication tokens on handshake. Identity spoofing and client-supplied user IDs are strictly rejected.

### 🎥 Reliable Video & Audio Conferencing
- **Peer-to-Peer Mesh** — WebRTC-powered low-latency video and audio streams.
- **ICE Candidate Buffering** — Solves negotiation race conditions (`InvalidStateError`) by queueing early ICE candidates until remote descriptions are set.
- **Media Permission Fallbacks** — Automatic fallback to audio-only if camera access is denied or hardware is unavailable.
- **Configurable ICE Strategy** — Configurable STUN/TURN servers via `VITE_ICE_SERVERS`.
- **In-Meeting Chat** — Real-time persistent messaging with rate limiting and deduplication.

---

## 🛠️ Tech Stack

### Client
| Technology | Purpose |
|---|---|
| [React 19](https://react.dev) | UI framework |
| [Vite](https://vite.dev) | Build tool & dev server |
| [Tailwind CSS 4](https://tailwindcss.com) | Modern styling |
| [Yjs](https://yjs.dev) | CRDT shared document framework |
| [Socket.IO Client](https://socket.io) | Real-time WebSocket communication |
| [Clerk React](https://clerk.com) | Authentication & user session management |
| [Lucide React](https://lucide.dev) | Icon set |
| [React Hot Toast](https://react-hot-toast.com) | Toast notifications |

### Server
| Technology | Purpose |
|---|---|
| [Node.js 20+](https://nodejs.org) | Runtime environment |
| [Express 5](https://expressjs.com) | HTTP server framework |
| [Socket.IO 4](https://socket.io) | WebSocket server with Clerk auth middleware & rate limits |
| [Yjs](https://yjs.dev) | Server-side CRDT state vector diffing and snapshot merging |
| [Neon Serverless](https://neon.tech) | PostgreSQL database with connection pooling |
| [Clerk Express](https://clerk.com) | JWT verification & webhook handling |

---

## 📁 Project Structure

```
meetup/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── meeting/        # VideoGrid, ChatPanel, ControlBar, ParticipantList
│   │   │   ├── workspace/      # WorkspaceContainer, NotesEditor, Whiteboard, CodeEditor,
│   │   │   │                   # LiveCursors, SyncStatusBadge, VersionHistoryModal, InviteMemberModal
│   │   │   ├── sessions/       # Meeting session history components
│   │   │   └── Navbar.jsx      # Navigation bar
│   │   ├── hooks/
│   │   │   ├── useWebRTC.js    # WebRTC mesh hook with ICE queueing
│   │   │   ├── useWorkspace.js # Yjs CRDT synchronization & offline recovery
│   │   │   └── useChat.js      # In-meeting chat hook
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Create/join meeting dashboard
│   │   │   ├── MeetingRoom.jsx # Active room: Video Grid + Collaborative Workspace
│   │   │   ├── Sessions.jsx    # Session history & transcripts
│   │   │   └── Pricing.jsx     # Subscription plans
│   │   └── config/socket.js    # Socket.IO client with auth handshake
│   └── package.json
│
├── server/                     # Express & Socket.IO backend
│   ├── config/
│   │   └── db.js               # Database schema initialization & migrations
│   ├── controllers/
│   │   ├── meetingController.js# Meeting CRUD, RBAC, workspace & versioning APIs
│   │   └── webhookController.js# Clerk webhooks
│   ├── middleware/
│   │   └── auth.js             # HTTP auth & Socket.IO handshake token verification
│   ├── routes/
│   │   └── meetingRoutes.js    # REST endpoints
│   ├── services/
│   │   └── workspaceService.js # CRDT sync, persistence, snapshot compaction & metrics
│   ├── socket.js               # Real-time WebRTC signaling & collaborative events
│   ├── tests/
│   │   ├── concurrency.test.js # Multi-client concurrency & RBAC test suite
│   │   └── load-simulation.js  # Concurrent multi-room load benchmark
│   └── server.js               # Entry point & Socket.IO initialization
│
├── docs/                       # Technical reports & guides
│   ├── audit-report.md         # Initial audit & vulnerability report
│   ├── architecture-and-scaling.md # Scaling roadmap (Redis, sticky sessions)
│   └── load-test-report.md     # Multi-client load & convergence benchmark
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v20.9.0 or higher
- A **Clerk** account ([clerk.com](https://clerk.com))
- A **Neon** PostgreSQL database ([neon.tech](https://neon.tech))

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd meetup
```

### 2. Configure Environment Variables

**Server** (`server/.env`):
```env
ORIGINS="http://localhost:5173,http://localhost:3000"
DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SIGNING_SECRET="whsec_..."
```

**Client** (`client/.env`):
```env
VITE_BASE_URL="http://localhost:3000"
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
# Optional TURN server config (JSON string):
# VITE_ICE_SERVERS='[{"urls":"stun:stun.l.google.com:19302"}]'
```

### 3. Install Dependencies
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 4. Run Locally
```bash
# Terminal 1 — Backend Server
cd server
npm run server

# Terminal 2 — Frontend Client
cd client
npm run dev
```

- **Client App**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3000](http://localhost:3000)

---

## 📡 API Reference

All protected endpoints require an `Authorization: Bearer <clerk_token>` header.

### Meeting & Room Management
| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `POST` | `/api/meetings` | Authenticated | Create a new meeting (supports `isPrivate` & `defaultRole`) |
| `GET` | `/api/meetings/:meetingId` | Member / Host | Get meeting metadata, verified host, and caller's role |
| `GET` | `/api/meetings/stats` | Authenticated | Fetch monthly meeting usage and plan limits |
| `GET` | `/api/meetings/sessions` | Authenticated | Fetch past meeting sessions and transcripts |

### Roles & Invitations (RBAC)
| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `POST` | `/api/meetings/:meetingId/invite` | **Host only** | Invite user by email or ID with `editor` or `viewer` role |
| `GET` | `/api/meetings/:meetingId/members` | Member / Host | List all members and their assigned roles |
| `PATCH` | `/api/meetings/:meetingId/members/:targetUserId` | **Host only** | Promote or demote member role |
| `DELETE` | `/api/meetings/:meetingId/members/:targetUserId` | **Host only** | Remove member from room |

### Workspace & Version History
| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `GET` | `/api/meetings/:meetingId/workspace` | Member / Host | Get workspace metadata and last saved timestamp |
| `GET` | `/api/meetings/:meetingId/workspace/versions` | Member / Host | List version history snapshots for a tool |
| `POST` | `/api/meetings/:meetingId/workspace/versions` | Editor / Host | Create a named milestone version snapshot |
| `POST` | `/api/meetings/:meetingId/workspace/versions/:id/restore` | Editor / Host | Restore document to a previous snapshot |

### Observability
| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `GET` | `/api/meetings/observability/metrics` | Public / Ops | Real-time connection count, latency percentiles (p50/p95/p99) |

---

## 🔌 Socket.IO Real-Time Protocol

### Connection Handshake
Clients connect with authentication credentials:
```js
socket = io(SERVER_URL, {
  auth: { token: "<clerk_session_jwt>" }
});
```

### Collaborative Events
| Event | Direction | Payload | Description |
|---|---|---|---|
| `join-room` | Client → Server | `{ roomId, audioEnabled, videoEnabled }` | Join room with server-verified role |
| `room-joined` | Server → Client | `{ roomId, role, isHost, canEdit, existingUsers }` | Join acknowledgement |
| `workspace:get-doc` | Client → Server | `{ roomId, docType, stateVector }` | Request document state diff |
| `workspace:doc-sync`| Server → Client | `{ docType, update, serverTimestamp }` | Synchronize missing document state |
| `workspace:update`  | Client ↔ Server | `{ docType, opId, update, schemaVersion }` | Incremental CRDT update (deduplicated) |
| `workspace:presence`| Client ↔ Server | `{ docType, cursor: {x,y}, activeTool }` | Ephemeral live cursor broadcasting |
| `workspace:error`   | Server → Client | `{ code, message }` | Error (e.g. `PERMISSION_DENIED`) |
| `send-message`      | Client → Server | `{ roomId, message: { text } }` | Chat message with server-verified author |
| `receive-message`   | Server → Client | `{ id, text, senderId, senderName, time }` | Broadcasted persistent chat message |
| `end-meeting`       | Client → Server | `{ roomId }` | Terminate meeting (**Host only**) |

---

## 🗄️ Database Architecture

```
┌──────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│      users       │       │       meetings       │       │   meeting_members    │
├──────────────────┤       ├──────────────────────┤       ├──────────────────────┤
│ id (PK)          │◄──────│ host_id (FK)         │◄──────│ meeting_id (FK)      │
│ name             │       │ id (PK)              │       │ user_id (FK)         │
│ email (unique)   │       │ meeting_id (unique)  │       │ role (host/ed/vw)    │
│ plan             │       │ is_private           │       │ joined_at            │
│ created_at       │       │ default_role         │       └──────────────────────┘
└────────┬─────────┘       │ status / ended_at    │
         │                 └──────────┬───────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│  meeting_messages│       │ workspace_snapshots  │       │  workspace_updates   │
├──────────────────┤       ├──────────────────────┤       ├──────────────────────┤
│ id (PK)          │       │ id (PK)              │       │ id (PK)              │
│ meeting_id (FK)  │       │ meeting_id (FK)      │       │ meeting_id (FK)      │
│ sender_id (FK)   │       │ doc_type             │       │ doc_type             │
│ text             │       │ snapshot_data        │       │ update_data (base64) │
│ timestamp        │       │ version_number       │       │ op_id (dedup index)  │
└──────────────────┘       └──────────────────────┘       │ actor_id (FK)        │
                                                          └──────────────────────┘
```

---

## 🧪 Testing & Verification

MeetUp includes an automated test suite covering concurrency, role permissions, deduplication, and load testing.

### Run Concurrency & RBAC Test Suite
```bash
cd server
$env:NODE_ENV="test"  # Windows PowerShell
node --test tests/concurrency.test.js
```
**Test Coverage:**
1. Simultaneous typing by multiple users into identical text regions (deterministic convergence).
2. Viewer role cannot edit (validates server rejection with `PERMISSION_DENIED`).
3. Duplicate operations (validates `opId` deduplication buffer).
4. Concurrent whiteboard vector drawing operations.
5. Private meeting authorization enforcement (uninvited attendees rejected).

### Run Multi-Client Load Simulation
```bash
cd server
node tests/load-simulation.js
```
Simulates **12 concurrent clients** across **3 meeting rooms** simultaneously emitting update bursts:
- **Convergence Verification**: 100% byte-for-byte identical document state across all clients.
- **End-to-End Latency**: Mean `3 ms`, p95 `5 ms`, p99 `9 ms`.
- Results are saved to [`docs/load-test-report.md`](docs/load-test-report.md).

---

## 📄 Documentation

- [Audit & Remediation Report](docs/audit-report.md)
- [Architecture & Horizontal Scaling Guide](docs/architecture-and-scaling.md)
- [Load & Convergence Benchmark Report](docs/load-test-report.md)

---

## 📄 License

ISC
