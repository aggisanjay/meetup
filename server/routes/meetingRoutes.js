import express from "express";
import { protect } from "../middleware/auth.js";
import {
    createMeeting,
    getMeeting,
    getMeetingStats,
    getSessionDetails,
    getUserSessions,
    inviteUser,
    getMeetingMembers,
    updateMemberRole,
    removeMember,
    getWorkspaceState,
    getVersions,
    createVersion,
    restoreVersion,
    getObservabilityMetrics
} from "../controllers/meetingController.js";

const meetingRouter = express.Router();

meetingRouter.post("/", protect, createMeeting);
meetingRouter.get("/stats", protect, getMeetingStats);
meetingRouter.get("/sessions", protect, getUserSessions);
meetingRouter.get("/sessions/:id", protect, getSessionDetails);
meetingRouter.get("/observability/metrics", getObservabilityMetrics);

meetingRouter.get("/:meetingId", protect, getMeeting);

// Member and Invitation routes
meetingRouter.post("/:meetingId/invite", protect, inviteUser);
meetingRouter.get("/:meetingId/members", protect, getMeetingMembers);
meetingRouter.patch("/:meetingId/members/:targetUserId", protect, updateMemberRole);
meetingRouter.delete("/:meetingId/members/:targetUserId", protect, removeMember);

// Workspace & Version History routes
meetingRouter.get("/:meetingId/workspace", protect, getWorkspaceState);
meetingRouter.get("/:meetingId/workspace/versions", protect, getVersions);
meetingRouter.post("/:meetingId/workspace/versions", protect, createVersion);
meetingRouter.post("/:meetingId/workspace/versions/:versionId/restore", protect, restoreVersion);

export default meetingRouter;