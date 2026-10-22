import React from "react";
import { CheckCircle2Icon, CloudOffIcon, RefreshCwIcon } from "lucide-react";

const SyncStatusBadge = ({ syncStatus, lastSavedTime, queuedUpdatesCount, onRetry }) => {
    const formattedTime = lastSavedTime
        ? lastSavedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "Just now";

    if (syncStatus === "syncing") {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium shadow-xs">
                <RefreshCwIcon className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Syncing changes...</span>
            </div>
        );
    }

    if (syncStatus === "offline" || queuedUpdatesCount > 0) {
        return (
            <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium shadow-xs transition-colors cursor-pointer"
                title="Click to retry synchronization"
            >
                <CloudOffIcon className="w-3.5 h-3.5 text-rose-600" />
                <span>Offline ({queuedUpdatesCount} queued)</span>
            </button>
        );
    }

    if (syncStatus === "error") {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium shadow-xs">
                <CloudOffIcon className="w-3.5 h-3.5 text-rose-600" />
                <span>Save error</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium shadow-xs">
            <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Saved to cloud</span>
            <span className="text-[10px] text-emerald-600/80">({formattedTime})</span>
        </div>
    );
};

export default SyncStatusBadge;
