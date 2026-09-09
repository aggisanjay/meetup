# 🎥 MeetUp — Video Conferencing App

A full-stack, real-time video conferencing application built with **React**, **Express**, **WebRTC**, and **Socket.IO**. Features peer-to-peer video/audio calls, in-meeting chat, session history, and a subscription-based pricing model powered by **Clerk** and **Stripe**.

---

## ✨ Features

- **Instant Meetings** — Create a meeting with one click and share the unique meeting code
- **Join via Code** — Enter a meeting code (e.g., `abc-def-ghi`) to join any active meeting
- **Peer-to-Peer Video & Audio** — WebRTC-powered, low-latency video calls with direct peer connections
- **Audio/Video Controls** — Toggle microphone and camera on/off during meetings
- **In-Meeting Chat** — Real-time text chat persisted to the database
- **Participant List** — View all participants currently in the meeting
- **Session History** — Browse past meetings with participants and chat transcripts
- **Authentication** — Clerk-powered sign-in/sign-up with email and Google OAuth
- **Pricing & Plans** — Free and Premium tiers with Clerk's built-in `<PricingTable />`
  - **Free**: 30 meetings/month, up to 10 participants
  - **Premium**: Unlimited meetings, up to 100 participants
- **Webhook Sync** — Clerk webhooks keep the database in sync with user events
- **Auto-Provisioning** — Users missing from the database (e.g., webhook failure) are auto-created on first request

---

## 🛠️ Tech Stack

### Client
| Technology | Purpose |
|---|---|
| [React 19](https://react.dev) | UI framework |
| [Vite](https://vite.dev) | Build tool & dev server |
| [Tailwind CSS 4](https://tailwindcss.com) | Utility-first styling |
| [React Router 7](https://reactrouter.com) | Client-side routing |
| [Clerk React](https://clerk.com/docs/quickstarts/react) | Authentication & user management |
| [Socket.IO Client](https://socket.io) | Real-time WebSocket communication |
| [Axios](https://axios-http.com) | HTTP client |
| [Lucide React](https://lucide.dev) | Icon library |
| [React Hot Toast](https://react-hot-toast.com) | Toast notifications |

### Server
| Technology | Purpose |
|---|---|
| [Express 5](https://expressjs.com) | HTTP server framework |
| [Socket.IO](https://socket.io) | WebSocket server for real-time events |
| [Clerk Express](https://clerk.com/docs/quickstarts/express) | Authentication middleware & webhooks |
| [Neon Serverless](https://neon.tech) | Serverless PostgreSQL database |
| [dotenv](https://www.npmjs.com/package/dotenv) | Environment variable management |

---

## 📁 Project Structure

```
meetup/
├── client/                     # React frontend (Vite)
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── assets/             # Static data & assets
│   │   ├── components/
│   │   │   ├── meeting/        # Meeting room components (VideoGrid, ChatPanel, ControlBar, etc.)
│   │   │   ├── sessions/       # Session history components
│   │   │   ├── Navbar.jsx      # Navigation bar
│   │   │   ├── Footer.jsx      # Footer
│   │   │   ├── Loader.jsx      # Loading spinner
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── Protectedlayout.jsx
│   │   ├── config/             # API client config
│   │   ├── hooks/              # Custom hooks (useWebRTC, useChat)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Home — create/join meetings
│   │   │   ├── MeetingRoom.jsx # Active meeting room with video/chat
│   │   │   ├── Sessions.jsx    # Past meeting history
│   │   │   ├── Pricing.jsx     # Clerk PricingTable
│   │   │   └── Login.jsx       # Sign in / Sign up
│   │   ├── App.jsx             # Route definitions
│   │   ├── main.jsx            # Entry point with ClerkProvider
│   │   └── index.css           # Global styles
│   ├── .env                    # Client environment variables
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Express backend
│   ├── config/
│   │   └── db.js               # Neon DB connection & table initialization
│   ├── controllers/
│   │   ├── meetingController.js # Meeting CRUD & stats
│   │   └── webhookController.js# Clerk webhook handler
│   ├── middleware/
│   │   └── auth.js             # Auth middleware with user auto-provisioning
│   ├── routes/
│   │   └── meetingRoutes.js    # Meeting API routes
│   ├── socket.js               # Socket.IO event handlers (WebRTC signaling, chat)
│   ├── server.js               # Express app entry point
│   ├── .env                    # Server environment variables
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v20.9.0 or higher
- A [Clerk](https://clerk.com) account (for authentication)
- A [Neon](https://neon.tech) database (serverless PostgreSQL)
- A [Stripe](https://stripe.com) account (optional — for premium subscriptions)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd meetup
```

### 2. Set up environment variables

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
```

### 3. Install dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 4. Set up Clerk webhooks

1. Go to **Clerk Dashboard** → **Configure** → **Webhooks**
2. Add a new endpoint: `https://<your-server-url>/api/clerk`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy the **Signing Secret** into `CLERK_WEBHOOK_SIGNING_SECRET` in `server/.env`

> For local development, use [ngrok](https://ngrok.com) to expose your server:
> ```bash
> ngrok http 3000
> ```

### 5. Run the app

```bash
# Terminal 1 — Server
cd server
npm run server

# Terminal 2 — Client
cd client
npm run dev
```

- **Client**: http://localhost:5173
- **Server**: http://localhost:3000

---

## 📡 API Reference

All protected routes require an `Authorization: Bearer <token>` header (Clerk session token).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ❌ | Health check |
| `POST` | `/api/clerk` | ❌ | Clerk webhook receiver |
| `POST` | `/api/meetings` | ✅ | Create a new meeting |
| `GET` | `/api/meetings/stats` | ✅ | Get user's plan & meeting stats |
| `GET` | `/api/meetings/sessions` | ✅ | Get all user's meeting sessions |
| `GET` | `/api/meetings/sessions/:id` | ✅ | Get session details by meeting ID |
| `GET` | `/api/meetings/:meetingId` | ✅ | Get a meeting by meeting code |

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Join a meeting room |
| `all-users` | Server → Client | List of existing participants |
| `user-joined` | Server → Client | New participant joined |
| `user-left` | Server → Client | Participant disconnected |
| `offer` | Client ↔ Server | WebRTC SDP offer |
| `answer` | Client ↔ Server | WebRTC SDP answer |
| `ice-candidate` | Client ↔ Server | WebRTC ICE candidate |
| `toggle-audio` | Client → Server | Audio mute/unmute |
| `toggle-video` | Client → Server | Video on/off |
| `user-toggled-audio` | Server → Client | Peer audio state changed |
| `user-toggled-video` | Server → Client | Peer video state changed |
| `send-message` | Client → Server | Send a chat message |
| `receive-message` | Server → Client | Receive a chat message |
| `end-meeting` | Client → Server | Host ends the meeting |
| `meeting-ended` | Server → Client | Meeting was ended |

---

## 🗄️ Database Schema

The database tables are auto-created on server startup via `initDB()`.

```
┌──────────────┐       ┌──────────────────────┐
│    users      │       │      meetings         │
├──────────────┤       ├──────────────────────┤
│ id (PK)      │◄──────│ host_id (FK)          │
│ name         │       │ id (PK)               │
│ email        │       │ meeting_id (unique)    │
│ image        │       │ title                  │
│ plan         │       │ status                 │
│ created_at   │       │ ended_at               │
│ updated_at   │       │ created_at             │
└──────┬───────┘       └──────────┬────────────┘
       │                          │
       │  ┌───────────────────────┤
       │  │                       │
       ▼  ▼                       ▼
┌─────────────────────┐   ┌──────────────────────┐
│ meeting_participants │   │  meeting_messages     │
├─────────────────────┤   ├──────────────────────┤
│ id (PK)             │   │ id (PK)              │
│ meeting_id (FK)     │   │ meeting_id (FK)      │
│ user_id (FK)        │   │ sender_id (FK)       │
│ name                │   │ sender_name          │
│ joined_at           │   │ text                 │
│ left_at             │   │ timestamp            │
└─────────────────────┘   └──────────────────────┘
```

---

## 📄 License

ISC
