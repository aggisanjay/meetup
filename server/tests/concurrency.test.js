import test from "node:test";
import assert from "node:assert";
import { io as Client } from "socket.io-client";
import * as Y from "yjs";
import { server } from "../server.js";
import { sql } from "../config/db.js";

const TEST_PORT = 4123;
let serverInstance;

test.before(async () => {
    // Start server on test port
    await new Promise((resolve) => {
        serverInstance = server.listen(TEST_PORT, () => {
            console.log(`[Test Server] Listening on port ${TEST_PORT}`);
            resolve();
        });
    });
});

test.after(async () => {
    // Close server and cleanup
    await new Promise((resolve) => {
        serverInstance.close(() => resolve());
    });
});

// Helper to ensure test user in DB
async function ensureTestUser(userId, name = "Test User") {
    const email = `${userId}@test.com`;
    await sql`
        INSERT INTO users (id, name, email, plan)
        VALUES (${userId}, ${name}, ${email}, 'free')
        ON CONFLICT (id) DO UPDATE SET name = ${name}
    `;
}

// Helper to create client socket with test auth token
function createTestClient(userId, userName) {
    return Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: `test:${userId}:${userName}:${userId}@test.com` },
        transports: ["websocket"],
        forceNew: true,
    });
}

test("1. Two users editing simultaneously converge deterministically", async () => {
    const testRoomId = `test-room-${Date.now()}`;
    const hostId = `host_${Date.now()}`;
    const editorId = `editor_${Date.now()}`;

    await ensureTestUser(hostId, "Host Alice");
    await ensureTestUser(editorId, "Editor Bob");

    // Create meeting in DB
    const [meeting] = await sql`
        INSERT INTO meetings (meeting_id, title, host_id, status)
        VALUES (${testRoomId}, 'Concurrency Test', ${hostId}, 'active')
        RETURNING id
    `;
    await sql`
        INSERT INTO meeting_members (meeting_id, user_id, role, invited_by)
        VALUES (${meeting.id}, ${hostId}, 'host', ${hostId}),
               (${meeting.id}, ${editorId}, 'editor', ${hostId})
    `;

    const client1 = createTestClient(hostId, "Host Alice");
    const client2 = createTestClient(editorId, "Editor Bob");

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    try {
        await Promise.all([
            new Promise((resolve) => client1.on("connect", resolve)),
            new Promise((resolve) => client2.on("connect", resolve)),
        ]);

        // Join room
        await Promise.all([
            new Promise((resolve) => client1.emit("join-room", { roomId: testRoomId }, resolve)),
            new Promise((resolve) => client2.emit("join-room", { roomId: testRoomId }, resolve)),
        ]);

        // Listen for updates on both clients
        client1.on("workspace:update", ({ update }) => {
            Y.applyUpdate(doc1, new Uint8Array(Buffer.from(update, "base64")));
        });
        client2.on("workspace:update", ({ update }) => {
            Y.applyUpdate(doc2, new Uint8Array(Buffer.from(update, "base64")));
        });

        // Both clients edit concurrently
        const ytext1 = doc1.getText("content");
        const ytext2 = doc2.getText("content");

        // Client 1 types "Hello "
        let update1;
        doc1.on("update", (u) => { update1 = u; });
        ytext1.insert(0, "Hello ");

        // Client 2 types "World "
        let update2;
        doc2.on("update", (u) => { update2 = u; });
        ytext2.insert(0, "World ");

        // Send updates concurrently to server
        await Promise.all([
            new Promise((resolve) => {
                client1.emit("workspace:update", {
                    roomId: testRoomId,
                    docType: "notes",
                    opId: `op_1_${Date.now()}`,
                    update: Buffer.from(update1).toString("base64")
                }, resolve);
            }),
            new Promise((resolve) => {
                client2.emit("workspace:update", {
                    roomId: testRoomId,
                    docType: "notes",
                    opId: `op_2_${Date.now()}`,
                    update: Buffer.from(update2).toString("base64")
                }, resolve);
            }),
        ]);

        // Wait for updates to settle
        await new Promise((r) => setTimeout(r, 400));

        // Both clients must reach IDENTICAL converged text
        const text1 = ytext1.toString();
        const text2 = ytext2.toString();

        console.log(`[Convergence Result] Client 1: "${text1}" | Client 2: "${text2}"`);
        assert.strictEqual(text1, text2, "Both client documents must deterministically converge to identical content");
        assert.ok(text1.includes("Hello") && text1.includes("World"), "Both concurrent insertions must be preserved without data loss");

    } finally {
        client1.disconnect();
        client2.disconnect();
    }
});

test("2. Viewer role cannot edit and receives permission denied error", async () => {
    const testRoomId = `viewer-room-${Date.now()}`;
    const hostId = `host_${Date.now()}`;
    const viewerId = `viewer_${Date.now()}`;

    await ensureTestUser(hostId, "Host Alice");
    await ensureTestUser(viewerId, "Viewer Charlie");

    const [meeting] = await sql`
        INSERT INTO meetings (meeting_id, title, host_id, status)
        VALUES (${testRoomId}, 'Viewer Test', ${hostId}, 'active')
        RETURNING id
    `;
    await sql`
        INSERT INTO meeting_members (meeting_id, user_id, role, invited_by)
        VALUES (${meeting.id}, ${hostId}, 'host', ${hostId}),
               (${meeting.id}, ${viewerId}, 'viewer', ${hostId})
    `;

    const viewerClient = createTestClient(viewerId, "Viewer Charlie");

    try {
        await new Promise((resolve) => viewerClient.on("connect", resolve));

        // Join room and assert role is viewer
        const joinAck = await new Promise((resolve) => {
            viewerClient.emit("join-room", { roomId: testRoomId });
            viewerClient.on("room-joined", resolve);
        });

        assert.strictEqual(joinAck.role, "viewer");
        assert.strictEqual(joinAck.canEdit, false);

        // Viewer attempts to emit a document update
        const fakeDoc = new Y.Doc();
        fakeDoc.getText("content").insert(0, "Hacked by viewer");
        const fakeUpdate = Y.encodeStateAsUpdate(fakeDoc);

        const errorPromise = new Promise((resolve) => {
            viewerClient.on("workspace:error", (err) => resolve(err));
        });

        viewerClient.emit("workspace:update", {
            roomId: testRoomId,
            docType: "notes",
            opId: `hack_${Date.now()}`,
            update: Buffer.from(fakeUpdate).toString("base64")
        });

        const error = await errorPromise;
        assert.strictEqual(error.code, "PERMISSION_DENIED");
        assert.ok(error.message.includes("Viewers have read-only access"));

    } finally {
        viewerClient.disconnect();
    }
});

test("3. Duplicate operations (idempotency) are safely rejected", async () => {
    const testRoomId = `dedup-room-${Date.now()}`;
    const hostId = `host_${Date.now()}`;

    await ensureTestUser(hostId, "Host Alice");

    const [meeting] = await sql`
        INSERT INTO meetings (meeting_id, title, host_id, status)
        VALUES (${testRoomId}, 'Dedup Test', ${hostId}, 'active')
        RETURNING id
    `;
    await sql`
        INSERT INTO meeting_members (meeting_id, user_id, role, invited_by)
        VALUES (${meeting.id}, ${hostId}, 'host', ${hostId})
    `;

    const client = createTestClient(hostId, "Host Alice");

    try {
        await new Promise((resolve) => client.on("connect", resolve));
        await new Promise((resolve) => client.emit("join-room", { roomId: testRoomId }, resolve));

        const doc = new Y.Doc();
        doc.getText("content").insert(0, "Idempotent Op");
        const updateBase64 = Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");
        const duplicateOpId = `op_unique_${Date.now()}`;

        // First emit
        const firstAck = await new Promise((resolve) => {
            client.emit("workspace:update", {
                roomId: testRoomId,
                docType: "notes",
                opId: duplicateOpId,
                update: updateBase64
            }, resolve);
        });
        assert.strictEqual(firstAck.status, "ok");

        // Second emit with SAME opId
        const secondAck = await new Promise((resolve) => {
            client.emit("workspace:update", {
                roomId: testRoomId,
                docType: "notes",
                opId: duplicateOpId,
                update: updateBase64
            }, resolve);
        });
        assert.strictEqual(secondAck.status, "duplicate", "Server must identify and mark duplicate opId");

    } finally {
        client.disconnect();
    }
});

test("4. Whiteboard concurrent drawing operations converge", async () => {
    const testRoomId = `board-room-${Date.now()}`;
    const userA = `userA_${Date.now()}`;
    const userB = `userB_${Date.now()}`;

    await ensureTestUser(userA, "Painter Alice");
    await ensureTestUser(userB, "Painter Bob");

    const [meeting] = await sql`
        INSERT INTO meetings (meeting_id, title, host_id, status)
        VALUES (${testRoomId}, 'Board Test', ${userA}, 'active')
        RETURNING id
    `;
    await sql`
        INSERT INTO meeting_members (meeting_id, user_id, role)
        VALUES (${meeting.id}, ${userA}, 'host'), (${meeting.id}, ${userB}, 'editor')
    `;

    const clientA = createTestClient(userA, "Painter Alice");
    const clientB = createTestClient(userB, "Painter Bob");

    const boardDocA = new Y.Doc();
    const boardDocB = new Y.Doc();

    try {
        await Promise.all([
            new Promise((r) => clientA.on("connect", r)),
            new Promise((r) => clientB.on("connect", r)),
        ]);

        await Promise.all([
            new Promise((r) => clientA.emit("join-room", { roomId: testRoomId }, r)),
            new Promise((r) => clientB.emit("join-room", { roomId: testRoomId }, r)),
        ]);

        clientA.on("workspace:update", ({ docType, update }) => {
            if (docType === "whiteboard") Y.applyUpdate(boardDocA, new Uint8Array(Buffer.from(update, "base64")));
        });
        clientB.on("workspace:update", ({ docType, update }) => {
            if (docType === "whiteboard") Y.applyUpdate(boardDocB, new Uint8Array(Buffer.from(update, "base64")));
        });

        // User A adds a rectangle
        let updateA;
        boardDocA.on("update", (u) => { updateA = u; });
        boardDocA.getArray("elements").push([{ type: "rect", x: 10, y: 10, width: 100, height: 50 }]);

        // User B adds a circle
        let updateB;
        boardDocB.on("update", (u) => { updateB = u; });
        boardDocB.getArray("elements").push([{ type: "circle", x: 200, y: 200, width: 30, height: 30 }]);

        await Promise.all([
            new Promise((r) => clientA.emit("workspace:update", { roomId: testRoomId, docType: "whiteboard", opId: `board_1_${Date.now()}`, update: Buffer.from(updateA).toString("base64") }, r)),
            new Promise((r) => clientB.emit("workspace:update", { roomId: testRoomId, docType: "whiteboard", opId: `board_2_${Date.now()}`, update: Buffer.from(updateB).toString("base64") }, r)),
        ]);

        await new Promise((r) => setTimeout(r, 400));

        const elementsA = boardDocA.getArray("elements").toArray();
        const elementsB = boardDocB.getArray("elements").toArray();

        assert.strictEqual(elementsA.length, 2, "Board A must contain both shapes");
        assert.strictEqual(elementsB.length, 2, "Board B must contain both shapes");
        assert.strictEqual(elementsA.length, elementsB.length);

    } finally {
        clientA.disconnect();
        clientB.disconnect();
    }
});

test("5. Private meeting rejects unauthorized room join", async () => {
    const testRoomId = `private-room-${Date.now()}`;
    const hostId = `host_${Date.now()}`;
    const strangerId = `stranger_${Date.now()}`;

    await ensureTestUser(hostId, "Host Alice");
    await ensureTestUser(strangerId, "Stranger Dan");

    // Create private meeting
    await sql`
        INSERT INTO meetings (meeting_id, title, host_id, status, is_private)
        VALUES (${testRoomId}, 'Confidential Room', ${hostId}, 'active', true)
    `;

    const strangerClient = createTestClient(strangerId, "Stranger Dan");

    try {
        await new Promise((resolve) => strangerClient.on("connect", resolve));

        const errorPromise = new Promise((resolve) => {
            strangerClient.on("meeting-error", resolve);
        });

        strangerClient.emit("join-room", { roomId: testRoomId });

        const err = await errorPromise;
        assert.ok(err.message.includes("Access denied") || err.message.includes("private"));

    } finally {
        strangerClient.disconnect();
    }
});
