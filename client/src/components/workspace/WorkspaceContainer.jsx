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
        <div className="h-full w-full flex flex-col bg-slate-100 p-2 sm:p-3 overflow-hidden">
            {/* Workspace Header Bar */}
            <div className="mb-2 bg-white rounded-2xl border border-slate-200 px-4 py-2 flex items-center justify-between flex-wrap gap-2 shadow-xs">
                {/* Tool Selector Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                        onClick={() => setActiveTool("notes")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            activeTool === "notes"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <FileTextIcon className="w-4 h-4 text-primary" />
                        <span>Shared Notes</span>
                        {countOnNotes > 0 && (
                            <span className="size-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                                {countOnNotes}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTool("whiteboard")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            activeTool === "whiteboard"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <PaletteIcon className="w-4 h-4 text-indigo-500" />
                        <span>Whiteboard</span>
                        {countOnWhiteboard > 0 && (
                            <span className="size-4 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center">
                                {countOnWhiteboard}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTool("code")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            activeTool === "code"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Code2Icon className="w-4 h-4 text-emerald-500" />
                        <span>Code Editor</span>
                        {countOnCode > 0 && (
                            <span className="size-4 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center justify-center">
                                {countOnCode}
                            </span>
                        )}
                    </button>
                </div>

                {/* Right Metadata & Tools */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Role Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-slate-50 text-slate-700 border-slate-200">
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
                        className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Version History & Restore"
                    >
                        <HistoryIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden md:inline">History</span>
                    </button>

                    {/* Roles & Invite Modal (Host only or all for viewing) */}
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Manage Room Roles & Invitations"
                    >
                        <UserPlusIcon className="w-3.5 h-3.5 text-slate-500" />
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
                docType={activeTool}
                token={token}
                canEdit={canEdit}
                onRestoreVersion={restoreVersion}
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
