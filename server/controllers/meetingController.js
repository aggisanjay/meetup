import { sql } from "../config/db.js";
import {
    createNamedVersion,
    restoreNamedVersion,
    logAuditEvent,
    metrics,
    calculatePercentiles
} from "../services/workspaceService.js";

const generateMeetingId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const segment = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `${segment(3)}-${segment(3)}-${segment(3)}`;
};

// create meeting
export const createMeeting = async (req, res) => {
    try {
        const { title, isPrivate = false, defaultRole = "editor" } = req.body;
        const userId = req.user.id;

        // Fetch user details & plan
        const users = await sql`SELECT name, plan FROM users WHERE id = ${userId}`;
        const userPlan = users[0]?.plan || "free";

        // check meetings limit per calendar month
        if (userPlan === "free") {
            const monthlyCountResult = await sql`
                SELECT COUNT(*) as count 
                FROM meetings 
                WHERE host_id = ${userId} 
                AND created_at >= date_trunc('month', NOW())`;

            const monthlyCount = parseInt(monthlyCountResult[0]?.count || '0', 10);

            if (monthlyCount >= 30) {
                return res.status(403).json({
                    error: "Monthly limit reached. Free plan includes 30 meetings per month. Please upgrade to Premium for unlimited meetings!",
                    limitReached: true,
                    monthlyCount,
                    limit: 30,
                });
            }
        }

        let meetingId = generateMeetingId();

        // Ensure unique ID
        let existing = await sql`SELECT id FROM meetings WHERE meeting_id = ${meetingId}`;
        while (existing.length > 0) {
            meetingId = generateMeetingId();
            existing = await sql`SELECT id FROM meetings WHERE meeting_id = ${meetingId}`;
        }

        const [meeting] = await sql`
            INSERT INTO meetings(meeting_id, title, host_id, status, is_private, default_role) 
            VALUES (${meetingId}, ${title || "Instant Meeting"}, ${userId}, 'active', ${Boolean(isPrivate)}, ${defaultRole}) 
            RETURNING id, meeting_id, title, host_id, status, created_at, is_private, default_role
        `;

        const hostName = users[0]?.name || req.user.name || "Host";

        // Insert host into participants
        await sql`
            INSERT INTO meeting_participants (meeting_id, user_id, name) 
            VALUES (${meeting.id}, ${userId}, ${hostName})
        `;

        // Insert host into meeting_members with 'host' role
        await sql`
            INSERT INTO meeting_members (meeting_id, user_id, role, invited_by)
            VALUES (${meeting.id}, ${userId}, 'host', ${userId})
            ON CONFLICT (meeting_id, user_id) DO UPDATE SET role = 'host'
        `;

        // Initialize workspace metadata
        await sql`
            INSERT INTO workspace_metadata (meeting_id, active_tool, last_saved_at)
            VALUES (${meeting.id}, 'notes', NOW())
            ON CONFLICT (meeting_id) DO NOTHING
        `;

        // Log audit event
        await logAuditEvent(meeting.id, userId, hostName, "room_created", {
            meetingId: meeting.meeting_id,
            title: meeting.title
        });

        res.status(201).json({
            meeting: {
                id: meeting.id,
                meetingId: meeting.meeting_id,
                title: meeting.title,
                host: meeting.host_id,
                status: meeting.status,
                createdAt: meeting.created_at,
                role: "host",
                isHost: true,
                canEdit: true
            }
        });

    } catch (error) {
        console.error("createMeeting failed:", error);
        res.status(500).json({ error: "Failed to create meeting" });
    }
};

// get meeting by id with role authorization
export const getMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user.id;

        const meetings = await sql`
            SELECT m.*, u.id as host_user_id, u.name as host_name, u.email as host_email 
            FROM meetings m 
            JOIN users u ON m.host_id = u.id 
            WHERE m.meeting_id = ${meetingId}
        `;

        if (meetings.length === 0) {
            return res.status(404).json({ error: "Meeting not found" });
        }

        const meeting = meetings[0];

        if (meeting.status === "ended") {
            return res.status(400).json({ error: "This meeting has ended" });
        }

        // Determine user's role
        let userRole = "editor";
        if (meeting.host_id === userId) {
            userRole = "host";
        } else {
            const memberRecord = await sql`
                SELECT role FROM meeting_members
                WHERE meeting_id = ${meeting.id} AND user_id = ${userId}
            `;

            if (memberRecord.length > 0) {
                userRole = memberRecord[0].role;
            } else {
                // If meeting is private and user is not in members table, reject!
                if (meeting.is_private) {
                    return res.status(403).json({ error: "This is a private meeting. You must be invited by the host to join." });
                }

                // Auto-enroll non-host into meeting_members with default role
                userRole = meeting.default_role || "editor";
                await sql`
                    INSERT INTO meeting_members (meeting_id, user_id, role, invited_by)
                    VALUES (${meeting.id}, ${userId}, ${userRole}, ${meeting.host_id})
                    ON CONFLICT (meeting_id, user_id) DO NOTHING
                `;
            }
        }

        res.json({
            meeting: {
                id: meeting.id,
                meetingId: meeting.meeting_id,
                title: meeting.title,
                status: meeting.status,
                createdAt: meeting.created_at,
                isPrivate: Boolean(meeting.is_private),
                role: userRole,
                isHost: userRole === "host",
                canEdit: userRole === "host" || userRole === "editor",
                host: {
                    id: meeting.host_user_id,
                    name: meeting.host_name,
                    email: meeting.host_email,
                }
            }
        });

    } catch (error) {
        console.error("Fetch Meeting failed:", error);
        res.status(500).json({ error: "Failed to fetch meeting" });
    }
};

// get all user's meetings sessions
export const getUserSessions = async (req, res)=>{
    try {
        const userId = req.user.id;

        // Fetch meetings where user is host OR listed in participants
        const meetings = await sql`
            SELECT DISTINCT m.id, m.meeting_id, m.title, m.status, m.created_at, m.ended_at,
                   m.host_id, u.name as host_name, u.email as host_email
            FROM meetings m
            JOIN users u ON m.host_id = u.id
            LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
            WHERE m.host_id = ${userId} OR mp.user_id = ${userId}
            ORDER BY m.created_at DESC
        `;

    const formattedMeetings = await Promise.all(
        meetings.map(async (m)=>{
            const participants = await sql`
                SELECT mp.*, u.email
                FROM meeting_participants mp
                LEFT JOIN users u ON mp.user_id = u.id
                WHERE mp.meeting_id = ${m.id}
            `;

            const messages = await sql`
                SELECT id, sender_id, sender_name, text, timestamp
                FROM meeting_messages
                WHERE meeting_id = ${m.id}
                ORDER BY timestamp ASC
            `;

            return {
                id: m.id,
                meetingId: m.meeting_id,
                title: m.title,
                status: m.status,
                createdAt: m.created_at,
                endedAt: m.ended_at,
                host: {
                    id: m.host_id,
                    name: m.host_name,
                    email: m.host_email,
                },
                participants: participants.map((p)=>({
                    user: p.user_id ? {id: p.user_id, email: p.email } : null,
                    name: p.name,
                    joinedAt: p.joined_at,
                    leftAt: p.left_at,
                })),
                messages: messages.map((msg)=>({
                    id: msg.id,
                    sender: msg.sender_id,
                    senderName: msg.sender_name,
                    text: msg.text,
                    timestamp: msg.timestamp,
                }))
            }
        })
    )

    res.json({meetings: formattedMeetings})
    } catch (error) {
        console.error("get User sessions failed:", error);
        res.status(500).json({ error: "Failed to get user sessions" });
    }
}

// get meeting session details by id
export const getSessionDetails = async (req, res)=>{
    try {
        const {id} = req.params;
        const userId = req.user.id;

        const meetings = await sql`
                                SELECT 
                                    m.*,
                                    u.id AS host_user_id,
                                    u.name AS host_name,
                                    u.email AS host_email
                                FROM meetings m
                                JOIN users u ON m.host_id = u.id
                                WHERE m.meeting_id = ${id}
                            `;
    
    if (meetings.length === 0){
        return res.status(404).json({ error: "Session details not found" });
    }

    const m = meetings[0];

    if (m.host_id !== userId) {
        const membership = await sql`
            SELECT 1 FROM meeting_participants
            WHERE meeting_id = ${m.id} AND user_id = ${userId} LIMIT 1`;
        if (membership.length === 0) {
            return res.status(404).json({ error: "Session details not found" });
        }
    }

    const participants = await sql`
            SELECT mp.*, u.email
            FROM meeting_participants mp
            LEFT JOIN users u ON mp.user_id = u.id
            WHERE mp.meeting_id = ${m.id}
    `;

    const messages = await sql`
             SELECT id, sender_id, sender_name, text, timestamp
            FROM meeting_messages
            WHERE meeting_id = ${m.id}
            ORDER BY timestamp ASC`;

        const formattedMeeting = {
            id: m.id,
            meetingId: m.meeting_id,
            title: m.title,
            status: m.status,
            createdAt: m.created_at,
            endedAt: m.ended_at,
            host: {
                id: m.host_user_id,
                name: m.host_name,
                email: m.host_email,
            },
            participants: participants.map((p)=>({
                    user: p.user_id ? {id: p.user_id, email: p.email } : null,
                    name: p.name,
                    joinedAt: p.joined_at,
                    leftAt: p.left_at,
                })),
                messages: messages.map((msg)=>({
                    id: msg.id,
                    sender: msg.sender_id,
                    senderName: msg.sender_name,
                    text: msg.text,
                    timestamp: msg.timestamp,
                }))

        }
        res.json({ meeting: formattedMeeting });
    } catch (error) {
        console.error("get session details failed:", error);
        res.status(500).json({ error: "Failed to get session details" });
    }
}


// get plan & meetings statistics for user dashboard
export const getMeetingStats = async (req, res)=>{
    try {
        const userId = req.user.id;
        const users = await sql`SELECT plan FROM users WHERE id = ${userId}`;
        const plan = users[0]?.plan || "free";
        const monthlyCountResult = await sql`
            SELECT COUNT(*) as count 
            FROM meetings 
            WHERE host_id = ${userId} 
              AND created_at >= date_trunc('month', NOW())`;

            const monthlyCount = parseInt(monthlyCountResult[0]?.count || '0', 10);
            const monthlyLimit = plan === "premium" ? null : 30;

            res.json({
                plan,
                monthlyCount,
                monthlyLimit,
                maxParticipants: plan === "premium" ? 100 : 10,
            });

    } catch (error) {
        console.error("get meeting stats failed:", error);
        res.status(500).json({ error: "Failed to get meeting stats" });
    }
};

// Invite user to meeting with role (Host only)
export const inviteUser = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { email, userId: targetUserId, role = "editor" } = req.body;
        const hostId = req.user.id;

        if (!["editor", "viewer"].includes(role)) {
            return res.status(400).json({ error: "Role must be 'editor' or 'viewer'" });
        }

        const meetings = await sql`SELECT id, host_id FROM meetings WHERE meeting_id = ${meetingId}`;
        if (meetings.length === 0) {
            return res.status(404).json({ error: "Meeting not found" });
        }
        const meeting = meetings[0];

        if (meeting.host_id !== hostId) {
            return res.status(403).json({ error: "Only the meeting host can invite users" });
        }

        // Find user by email or ID
        let targetUser = null;
        if (targetUserId) {
            const users = await sql`SELECT id, name, email FROM users WHERE id = ${targetUserId}`;
            if (users.length > 0) targetUser = users[0];
        } else if (email) {
            const users = await sql`SELECT id, name, email FROM users WHERE email = ${email.trim().toLowerCase()}`;
            if (users.length > 0) targetUser = users[0];
        }

        if (!targetUser) {
            // Auto-create or register target user placeholder
            const fallbackId = targetUserId || `user_${Date.now()}`;
            const fallbackName = email ? email.split("@")[0] : "Invited User";
            const [created] = await sql`
                INSERT INTO users (id, name, email, plan)
                VALUES (${fallbackId}, ${fallbackName}, ${email || `${fallbackId}@example.com`}, 'free')
                ON CONFLICT (email) DO UPDATE SET name = ${fallbackName}
                RETURNING id, name, email
            `;
            targetUser = created;
        }

        // Add or update role in meeting_members
        await sql`
            INSERT INTO meeting_members (meeting_id, user_id, role, invited_by)
            VALUES (${meeting.id}, ${targetUser.id}, ${role}, ${hostId})
            ON CONFLICT (meeting_id, user_id) DO UPDATE SET role = ${role}
        `;

        await logAuditEvent(meeting.id, hostId, req.user.name || "Host", "member_invited", {
            invitedUserId: targetUser.id,
            invitedEmail: targetUser.email,
            role
        });

        res.json({
            message: `User ${targetUser.name || targetUser.email} invited as ${role}`,
            member: {
                userId: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                role
            }
        });

    } catch (error) {
        console.error("Invite user failed:", error);
        res.status(500).json({ error: "Failed to invite user" });
    }
};

// Get meeting members & roles
export const getMeetingMembers = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user.id;

        const meetings = await sql`SELECT id, host_id FROM meetings WHERE meeting_id = ${meetingId}`;
        if (meetings.length === 0) {
            return res.status(404).json({ error: "Meeting not found" });
        }
        const meeting = meetings[0];

        // Ensure requester is a member or host
        const isHost = meeting.host_id === userId;
        const membership = await sql`SELECT role FROM meeting_members WHERE meeting_id = ${meeting.id} AND user_id = ${userId}`;
        if (!isHost && membership.length === 0) {
            return res.status(403).json({ error: "You are not authorized to view members for this meeting" });
        }

        const members = await sql`
            SELECT mm.id, mm.role, mm.joined_at, u.id as user_id, u.name, u.email, u.image
            FROM meeting_members mm
            JOIN users u ON mm.user_id = u.id
            WHERE mm.meeting_id = ${meeting.id}
            ORDER BY CASE WHEN mm.role = 'host' THEN 1 WHEN mm.role = 'editor' THEN 2 ELSE 3 END
        `;

        res.json({ members });
    } catch (error) {
        console.error("Get members failed:", error);
        res.status(500).json({ error: "Failed to fetch meeting members" });
    }
};

// Update member role (Host only)
export const updateMemberRole = async (req, res) => {
    try {
        const { meetingId, targetUserId } = req.params;
        const { role } = req.body;
        const hostId = req.user.id;

        if (!["editor", "viewer"].includes(role)) {
            return res.status(400).json({ error: "Role must be 'editor' or 'viewer'" });
        }

        const meetings = await sql`SELECT id, host_id FROM meetings WHERE meeting_id = ${meetingId}`;
        if (meetings.length === 0) return res.status(404).json({ error: "Meeting not found" });
        const meeting = meetings[0];

        if (meeting.host_id !== hostId) {
            return res.status(403).json({ error: "Only the host can modify member roles" });
        }
        if (targetUserId === hostId) {
            return res.status(400).json({ error: "Cannot change the host's role" });
        }

        await sql`
            UPDATE meeting_members
            SET role = ${role}
            WHERE meeting_id = ${meeting.id} AND user_id = ${targetUserId}
        `;

        await logAuditEvent(meeting.id, hostId, req.user.name || "Host", "role_changed", {
            targetUserId,
            newRole: role
        });

        res.json({ message: "Member role updated successfully", role });
    } catch (error) {
        console.error("Update member role failed:", error);
        res.status(500).json({ error: "Failed to update member role" });
    }
};

// Remove member (Host only)
export const removeMember = async (req, res) => {
    try {
        const { meetingId, targetUserId } = req.params;
        const hostId = req.user.id;

        const meetings = await sql`SELECT id, host_id FROM meetings WHERE meeting_id = ${meetingId}`;
        if (meetings.length === 0) return res.status(404).json({ error: "Meeting not found" });
        const meeting = meetings[0];

        if (meeting.host_id !== hostId) {
            return res.status(403).json({ error: "Only the host can remove members" });
        }
        if (targetUserId === hostId) {
            return res.status(400).json({ error: "Cannot remove the host" });
        }

        await sql`
            DELETE FROM meeting_members
            WHERE meeting_id = ${meeting.id} AND user_id = ${targetUserId}
        `;

        await logAuditEvent(meeting.id, hostId, req.user.name || "Host", "member_removed", {
            removedUserId: targetUserId
        });

        res.json({ message: "Member removed from room" });
    } catch (error) {
        console.error("Remove member failed:", error);
        res.status(500).json({ error: "Failed to remove member" });
    }
};

// Get workspace metadata and state
export const getWorkspaceState = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user.id;

        const meetings = await sql`SELECT id, host_id FROM meetings WHERE meeting_id = ${meetingId}`;
        if (meetings.length === 0) return res.status(404).json({ error: "Meeting not found" });
        const meeting = meetings[0];

        // Fetch or create metadata
        let metadata = await sql`SELECT * FROM workspace_metadata WHERE meeting_id = ${meeting.id}`;
        if (metadata.length === 0) {
            await sql`
                INSERT INTO workspace_metadata (meeting_id, active_tool, last_saved_at)
                VALUES (${meeting.id}, 'notes', NOW())
            `;
            metadata = await sql`SELECT * FROM workspace_metadata WHERE meeting_id = ${meeting.id}`;
        }

        // Fetch user role
        let role = "editor";
        if (meeting.host_id === userId) {
            role = "host";
        } else {
            const memberRecord = await sql`SELECT role FROM meeting_members WHERE meeting_id = ${meeting.id} AND user_id = ${userId}`;
            if (memberRecord.length > 0) role = memberRecord[0].role;
        }

        res.json({
            metadata: metadata[0],
            role,
            canEdit: role === "host" || role === "editor"
        });
    } catch (error) {
        console.error("Get workspace state failed:", error);
        res.status(500).json({ error: "Failed to get workspace state" });
    }
};

// Get version history
export const getVersions = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { docType = "notes" } = req.query;

        const meetings = await sql`SELECT id FROM meetings WHERE meeting_id = ${meetingId}`;
        if (meetings.length === 0) return res.status(404).json({ error: "Meeting not found" });

        const versions = await sql`
            SELECT id, doc_type, version_name, text_content, creator_name, created_at
            FROM workspace_versions
            WHERE meeting_id = ${meetings[0].id} AND doc_type = ${docType}
            ORDER BY created_at DESC
        `;

        res.json({ versions });
    } catch (error) {
        console.error("Get versions failed:", error);
        res.status(500).json({ error: "Failed to get versions" });
    }
};

// Create named version
export const createVersion = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { docType = "notes", versionName } = req.body;
        const userId = req.user.id;
        const userName = req.user.name || "User";

        if (!versionName || !versionName.trim()) {
            return res.status(400).json({ error: "Version name is required" });
        }

        const meetings = await sql`SELECT id, host_id FROM meetings WHERE meeting_id = ${meetingId}`;
        if (meetings.length === 0) return res.status(404).json({ error: "Meeting not found" });
        const meeting = meetings[0];

        // Check permission (Viewer cannot create version)
        if (meeting.host_id !== userId) {
            const membership = await sql`SELECT role FROM meeting_members WHERE meeting_id = ${meeting.id} AND user_id = ${userId}`;
            if (membership.length === 0 || membership[0].role === "viewer") {
                return res.status(403).json({ error: "Viewers cannot create document versions" });
            }
        }

        const ver = await createNamedVersion(meeting.id, docType, versionName.trim(), userId, userName);
        res.status(201).json({ version: ver });
    } catch (error) {
        console.error("Create version failed:", error);
        res.status(500).json({ error: "Failed to create version" });
    }
};

// Restore named version
export const restoreVersion = async (req, res) => {
    try {
        const { meetingId, versionId } = req.params;
        const { docType = "notes" } = req.body;
        const userId = req.user.id;
        const userName = req.user.name || "User";

        const meetings = await sql`SELECT id, host_id FROM meetings WHERE meeting_id = ${meetingId}`;
        if (meetings.length === 0) return res.status(404).json({ error: "Meeting not found" });
        const meeting = meetings[0];

        // Check permission
        if (meeting.host_id !== userId) {
            const membership = await sql`SELECT role FROM meeting_members WHERE meeting_id = ${meeting.id} AND user_id = ${userId}`;
            if (membership.length === 0 || membership[0].role === "viewer") {
                return res.status(403).json({ error: "Viewers cannot restore document versions" });
            }
        }

        const result = await restoreNamedVersion(meeting.id, docType, parseInt(versionId, 10), userId, userName);
        res.json({ message: "Version restored successfully", ...result });
    } catch (error) {
        console.error("Restore version failed:", error);
        res.status(500).json({ error: error.message || "Failed to restore version" });
    }
};

// Observability and latency metrics endpoint
export const getObservabilityMetrics = async (_req, res) => {
    try {
        const receiveToAck = calculatePercentiles(metrics.receiveToAckLatencies);
        const receiveToBroadcast = calculatePercentiles(metrics.receiveToBroadcastLatencies);
        const receiveToPersist = calculatePercentiles(metrics.receiveToPersistLatencies);
        const snapshotLoad = calculatePercentiles(metrics.snapshotLoadDurations);
        const snapshotRestore = calculatePercentiles(metrics.snapshotRestoreDurations);

        res.json({
            connections: {
                active: metrics.activeConnections,
                reconnections: metrics.reconnections
            },
            rooms: {
                active: metrics.activeRooms
            },
            operations: {
                totalMessages: metrics.totalMessagesReceived,
                totalUpdates: metrics.totalUpdatesReceived,
                persistedUpdates: metrics.totalUpdatesPersisted,
                duplicateRejected: metrics.duplicateUpdatesRejected,
                unauthorizedBlocked: metrics.unauthorizedActionsBlocked,
                persistenceFailures: metrics.persistenceFailures,
                webrtcConnections: metrics.webrtcConnectionsEstablished
            },
            latency: {
                receiveToAckMs: receiveToAck,
                receiveToBroadcastMs: receiveToBroadcast,
                receiveToPersistMs: receiveToPersist,
                snapshotLoadMs: snapshotLoad,
                snapshotRestoreMs: snapshotRestore
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Get metrics failed:", error);
        res.status(500).json({ error: "Failed to collect metrics" });
    }
};