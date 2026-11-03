import React, { useState } from "react";
import {
    FileTextIcon,
    PaletteIcon,
    Code2Icon,
    HistoryIcon,
    UserPlusIcon,
    ShieldIcon,
} from "lucide-react";
import NotesEditor from "./NotesEditor";
import Whiteboard from "./Whiteboard";
import CodeEditor from "./CodeEditor";
import SyncStatusBadge from "./SyncStatusBadge";
import VersionHistoryModal from "./VersionHistoryModal";
import InviteMemberModal from "./InviteMemberModal";

const WorkspaceContainer = ({
    roomId,
    userRole = "editor",
    isHost = false,
    canEdit = true,
    token,
    workspace,
}) => {
    const {
        activeTool,
        setActiveTool,
        syncStatus,
        lastSavedTime,
        queuedUpdatesCount,
        remotePresences,
        updatePresence,
        restoreVersion,
        retrySync,
        ydocs,
    } = workspace;

    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // Count remote users on each tool
    const presencesList = Array.from(remotePresences.values());
    const countOnNotes = presencesList.filter((p) => p.activeTool === "notes").length;
    const countOnWhiteboard = presencesList.filter((p) => p.activeTool === "whiteboard").length;
    const countOnCode = presencesList.filter((p) => p.activeTool === "code").length;

    return (
        <div className="h-full w-full flex flex-col bg-canvas/30 p-2 sm:p-3 overflow-hidden">
            {/* Workspace Header Bar */}
            <div className="mb-2 bg-white/90 backdrop-blur-xl rounded-2xl border border-line px-4 py-2 flex items-center justify-between flex-wrap gap-2 shadow-xs">
                {/* Tool Selector Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-line/60">
                    <button
                        onClick={() => setActiveTool("notes")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            activeTool === "notes"
                                ? "bg-white text-ink shadow-xs ring-1 ring-black/5"
                                : "text-muted hover:text-ink"
                        }`}
                    >
                        <FileTextIcon className="w-4 h-4 text-primary" />
                        <span>Shared Notes</span>
                        {countOnNotes > 0 && (
                            <span className="size-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                                {countOnNotes}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTool("whiteboard")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            activeTool === "whiteboard"
                                ? "bg-white text-ink shadow-xs ring-1 ring-black/5"
                                : "text-muted hover:text-ink"
                        }`}
                    >
                        <PaletteIcon className="w-4 h-4 text-indigo-500" />
                        <span>Whiteboard</span>
                        {countOnWhiteboard > 0 && (
                            <span className="size-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                                {countOnWhiteboard}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTool("code")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            activeTool === "code"
                                ? "bg-white text-ink shadow-xs ring-1 ring-black/5"
                                : "text-muted hover:text-ink"
                        }`}
                    >
                        <Code2Icon className="w-4 h-4 text-emerald-600" />
                        <span>Code Editor</span>
                        {countOnCode > 0 && (
                            <span className="size-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                                {countOnCode}
                            </span>
                        )}
                    </button>
                </div>

                {/* Right Metadata & Tools */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Role Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border bg-white border-line text-ink shadow-xs">
                        <ShieldIcon className="w-3.5 h-3.5 text-primary" />
                        <span>{userRole}</span>
                    </div>

                    {/* Sync Status */}
                    <SyncStatusBadge
                        syncStatus={syncStatus}
                        lastSavedTime={lastSavedTime}
                        queuedUpdatesCount={queuedUpdatesCount}
                        onRetry={retrySync}
                    />

                    {/* Version History Button */}
                    <button
                        onClick={() => setIsVersionModalOpen(true)}
                        className="p-1.5 px-3 rounded-xl bg-white hover:bg-canvas border border-line text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Version History & Restore"
                    >
                        <HistoryIcon className="w-3.5 h-3.5 text-muted" />
                        <span className="hidden md:inline">History</span>
                    </button>

                    {/* Roles & Invite Modal (Host only or all for viewing) */}
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="p-1.5 px-3 rounded-xl bg-white hover:bg-canvas border border-line text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Manage Room Roles & Invitations"
                    >
                        <UserPlusIcon className="w-3.5 h-3.5 text-muted" />
                        <span className="hidden md:inline">{isHost ? "Invite" : "Roles"}</span>
                    </button>
                </div>
            </div>

            {/* Main Active Tool Display */}
            <div className="flex-1 overflow-hidden relative">
                {activeTool === "notes" && (
                    <NotesEditor
                        ydoc={ydocs.notes}
                        canEdit={canEdit}
                        onPresenceUpdate={updatePresence}
                        remotePresences={remotePresences}
                    />
                )}
                {activeTool === "whiteboard" && (
                    <Whiteboard
                        ydoc={ydocs.whiteboard}
                        canEdit={canEdit}
                        onPresenceUpdate={updatePresence}
                        remotePresences={remotePresences}
                    />
                )}
                {activeTool === "code" && (
                    <CodeEditor
                        ydoc={ydocs.code}
                        canEdit={canEdit}
                        onPresenceUpdate={updatePresence}
                        remotePresences={remotePresences}
                    />
                )}
            </div>

            {/* Modals */}
            <VersionHistoryModal
                isOpen={isVersionModalOpen}
                onClose={() => setIsVersionModalOpen(false)}
                roomId={roomId}
                token={token}
                onRestoreVersion={restoreVersion}
                canEdit={canEdit}
            />

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                roomId={roomId}
                token={token}
                isHost={isHost}
            />
        </div>
    );
};

export default WorkspaceContainer;
