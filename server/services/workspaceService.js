import * as Y from "yjs";
import { sql } from "../config/db.js";

// In-memory document cache: roomId:docType -> Y.Doc
const docCache = new Map();

// In-memory set of recent opIds for deduplication (with TTL or max size)
const seenOpIds = new Set();
const MAX_SEEN_OPS = 10000;

// Observability metrics store
export const metrics = {
    activeConnections: 0,
    activeRooms: 0,
    reconnections: 0,
    totalMessagesReceived: 0,
    totalUpdatesReceived: 0,
    totalUpdatesPersisted: 0,
    duplicateUpdatesRejected: 0,
    unauthorizedActionsBlocked: 0,
    persistenceFailures: 0,
    webrtcConnectionsEstablished: 0,
    receiveToAckLatencies: [],
    receiveToBroadcastLatencies: [],
    receiveToPersistLatencies: [],
    snapshotLoadDurations: [],
    snapshotRestoreDurations: []
};

export function recordLatency(metricArray, latencyMs) {
    if (metricArray.length > 5000) {
        metricArray.shift();
    }
    metricArray.push(latencyMs);
}

export function calculatePercentiles(latencies) {
    if (!latencies || latencies.length === 0) {
        return { count: 0, p50: 0, p95: 0, p99: 0 };
    }
    const sorted = [...latencies].sort((a, b) => a - b);
    const count = sorted.length;
    const p50 = sorted[Math.floor(count * 0.5)] || 0;
    const p95 = sorted[Math.floor(count * 0.95)] || 0;
    const p99 = sorted[Math.floor(count * 0.99)] || 0;
    return { count, p50, p95, p99 };
}

/**
 * Get or load a Y.Doc for a room and docType from PostgreSQL
 */
export async function getOrLoadDoc(meetingId, docType) {
    const cacheKey = `${meetingId}:${docType}`;
    if (docCache.has(cacheKey)) {
        return docCache.get(cacheKey);
    }

    const startLoad = Date.now();
    const doc = new Y.Doc();

    try {
        // 1. Fetch latest snapshot
        const snapshots = await sql`
            SELECT id, snapshot_data, version_number
            FROM workspace_snapshots
            WHERE meeting_id = ${meetingId} AND doc_type = ${docType}
            ORDER BY version_number DESC
            LIMIT 1
        `;

        let snapshotId = 0;
        if (snapshots.length > 0 && snapshots[0].snapshot_data) {
            const snapshotBinary = new Uint8Array(Buffer.from(snapshots[0].snapshot_data, "base64"));
            Y.applyUpdate(doc, snapshotBinary);
            snapshotId = snapshots[0].id;
        }

        // 2. Fetch updates created after or during current snapshot
        const updates = await sql`
            SELECT id, update_data
            FROM workspace_updates
            WHERE meeting_id = ${meetingId} AND doc_type = ${docType}
            ORDER BY id ASC
        `;

        if (updates.length > 0) {
            const binaryUpdates = updates.map(u => new Uint8Array(Buffer.from(u.update_data, "base64")));
            const merged = Y.mergeUpdates(binaryUpdates);
            Y.applyUpdate(doc, merged);
        }

        recordLatency(metrics.snapshotLoadDurations, Date.now() - startLoad);
        docCache.set(cacheKey, doc);
        return doc;
    } catch (err) {
        console.error(`[Workspace] Error loading doc ${cacheKey}:`, err);
        throw err;
    }
}

/**
 * Handle incoming CRDT update from client
 */
export async function applyAndPersistUpdate({ meetingId, roomId, docType, updateBase64, opId, actorId, actorName }) {
    // 1. Deduplication check
    if (opId) {
        if (seenOpIds.has(opId)) {
            metrics.duplicateUpdatesRejected++;
            return { duplicate: true };
        }
        seenOpIds.add(opId);
        if (seenOpIds.size > MAX_SEEN_OPS) {
            const firstItem = seenOpIds.values().next().value;
            seenOpIds.delete(firstItem);
        }
    }

    metrics.totalUpdatesReceived++;
    const updateBinary = new Uint8Array(Buffer.from(updateBase64, "base64"));

    // 2. Apply to in-memory Y.Doc
    const doc = await getOrLoadDoc(meetingId, docType);
    Y.applyUpdate(doc, updateBinary);

    // 3. Persist to PostgreSQL
    const startPersist = Date.now();
    try {
        await sql`
            INSERT INTO workspace_updates (meeting_id, doc_type, update_data, op_id, actor_id, actor_name, created_at)
            VALUES (${meetingId}, ${docType}, ${updateBase64}, ${opId || null}, ${actorId || null}, ${actorName || "Anonymous"}, NOW())
        `;
        metrics.totalUpdatesPersisted++;
        recordLatency(metrics.receiveToPersistLatencies, Date.now() - startPersist);

        // Update workspace metadata last_saved_at
        await sql`
            INSERT INTO workspace_metadata (meeting_id, active_tool, last_saved_at, updated_at)
            VALUES (${meetingId}, ${docType}, NOW(), NOW())
            ON CONFLICT (meeting_id) DO UPDATE
            SET last_saved_at = NOW(), updated_at = NOW()
        `;

        // Check if we should trigger compaction / snapshot
        checkAndTriggerSnapshot(meetingId, docType, doc).catch(e => {
            console.error("[Workspace] Snapshot trigger error:", e);
        });

        return { success: true };
    } catch (err) {
        metrics.persistenceFailures++;
        console.error("[Workspace] Persistence error:", err);
        throw err;
    }
}

/**
 * Compact updates into a snapshot if updates threshold reached (e.g. 50 updates)
 */
async function checkAndTriggerSnapshot(meetingId, docType, doc) {
    const countResult = await sql`
        SELECT COUNT(*) as count FROM workspace_updates
        WHERE meeting_id = ${meetingId} AND doc_type = ${docType}
    `;
    const count = parseInt(countResult[0]?.count || "0", 10);
    if (count >= 50) {
        await createSnapshot(meetingId, docType, doc);
    }
}

/**
 * Create a new snapshot of current document state and compact old updates
 */
export async function createSnapshot(meetingId, docType, doc, createdBy = null) {
    const currentDoc = doc || await getOrLoadDoc(meetingId, docType);
    const stateBinary = Y.encodeStateAsUpdate(currentDoc);
    const snapshotBase64 = Buffer.from(stateBinary).toString("base64");

    // Extract text content for preview if applicable
    let textContent = "";
    if (docType === "notes" || docType === "code") {
        textContent = currentDoc.getText("monaco")?.toString() || currentDoc.getText("content")?.toString() || "";
    }

    const latestVer = await sql`
        SELECT MAX(version_number) as max_ver FROM workspace_snapshots
        WHERE meeting_id = ${meetingId} AND doc_type = ${docType}
    `;
    const nextVer = (parseInt(latestVer[0]?.max_ver || "0", 10)) + 1;

    // Get max update id currently in DB before inserting snapshot
    const maxUpdateResult = await sql`
        SELECT MAX(id) as max_id FROM workspace_updates
        WHERE meeting_id = ${meetingId} AND doc_type = ${docType}
    `;
    const maxUpdateId = maxUpdateResult[0]?.max_id;

    await sql`
        INSERT INTO workspace_snapshots (meeting_id, doc_type, snapshot_data, text_content, version_number, created_by, created_at)
        VALUES (${meetingId}, ${docType}, ${snapshotBase64}, ${textContent}, ${nextVer}, ${createdBy}, NOW())
    `;

    // Safely delete older updates up to maxUpdateId
    if (maxUpdateId) {
        await sql`
            DELETE FROM workspace_updates
            WHERE meeting_id = ${meetingId} AND doc_type = ${docType} AND id <= ${maxUpdateId}
        `;
    }

    return { versionNumber: nextVer };
}

/**
 * Create a named version in workspace_versions
 */
export async function createNamedVersion(meetingId, docType, versionName, userId, userName) {
    const doc = await getOrLoadDoc(meetingId, docType);
    const stateBinary = Y.encodeStateAsUpdate(doc);
    const snapshotBase64 = Buffer.from(stateBinary).toString("base64");

    let textContent = "";
    if (docType === "notes" || docType === "code") {
        textContent = doc.getText("monaco")?.toString() || doc.getText("content")?.toString() || "";
    }

    const [ver] = await sql`
        INSERT INTO workspace_versions (meeting_id, doc_type, version_name, snapshot_data, text_content, created_by, creator_name, created_at)
        VALUES (${meetingId}, ${docType}, ${versionName}, ${snapshotBase64}, ${textContent}, ${userId}, ${userName}, NOW())
        RETURNING id, version_name, created_at
    `;

    // Record audit event
    await logAuditEvent(meetingId, userId, userName, "version_created", {
        versionId: ver.id,
        versionName,
        docType
    });

    return ver;
}

/**
 * Restore a named version
 */
export async function restoreNamedVersion(meetingId, docType, versionId, userId, userName) {
    const startRestore = Date.now();
    const versions = await sql`
        SELECT * FROM workspace_versions
        WHERE id = ${versionId} AND meeting_id = ${meetingId}
    `;

    if (versions.length === 0) {
        throw new Error("Version not found");
    }

    const targetVersion = versions[0];
    const restoreBinary = new Uint8Array(Buffer.from(targetVersion.snapshot_data, "base64"));

    // Apply restore onto current document so all connected clients receive it as an update
    const currentDoc = await getOrLoadDoc(meetingId, docType);
    Y.applyUpdate(currentDoc, restoreBinary);

    // Save as new snapshot
    const snapshotRes = await createSnapshot(meetingId, docType, currentDoc, userId);

    // Log audit event
    await logAuditEvent(meetingId, userId, userName, "version_restored", {
        versionId,
        versionName: targetVersion.version_name,
        newVersionNumber: snapshotRes.versionNumber,
        docType
    });

    recordLatency(metrics.snapshotRestoreDurations, Date.now() - startRestore);
    return {
        success: true,
        updateBase64: Buffer.from(restoreBinary).toString("base64")
    };
}

/**
 * Log audit events to audit_events table
 */
export async function logAuditEvent(meetingId, actorId, actorName, eventType, details = {}) {
    try {
        await sql`
            INSERT INTO audit_events (meeting_id, actor_id, actor_name, event_type, details, created_at)
            VALUES (${meetingId}, ${actorId}, ${actorName}, ${eventType}, ${JSON.stringify(details)}, NOW())
        `;
    } catch (err) {
        console.error("[Workspace] Failed to log audit event:", err);
    }
}

/**
 * Clear cached doc on room close
 */
export function removeRoomFromCache(meetingId) {
    for (const key of docCache.keys()) {
        if (key.startsWith(`${meetingId}:`)) {
            docCache.delete(key);
        }
    }
}
