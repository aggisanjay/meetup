import { CalendarIcon, MessageSquareIcon, UsersIcon } from 'lucide-react'
import React from 'react'

const SessionCard = ({ session, onOpenDetails, onRejoin }) => {
    const isEnded = session.status === "ended"

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 transition-all flex flex-col justify-between space-y-5 border border-line shadow-xs hover:border-primary-border/70 hover:shadow-md">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted font-medium bg-canvas border border-line px-2.5 py-1 rounded-md">
                        ID: {session.meetingId}
                    </span>

                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                        isEnded ? "bg-slate-100 text-muted" : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                    }`}>
                        <span className={`size-1.5 rounded-full ${isEnded ? "bg-slate-400" : "bg-emerald-500 animate-pulse"}`} />
                        {isEnded ? "Ended" : "Active"}
                    </span>
                </div>

                <h3 className="text-xl font-semibold text-ink font-display truncate">
                    {session.title || "Instant Meeting"}
                </h3>

                <p className="text-xs text-muted flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-muted" />
                    {new Date(session.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
                <div className="flex items-center gap-2 text-xs bg-canvas border border-line/60 p-2.5 rounded-xl text-muted">
                    <UsersIcon className="w-4 h-4 text-primary" />
                    <span>
                        <strong className="font-semibold text-ink">{session.participants?.length || 0}</strong> Participants
                    </span>
                </div>

                <div className="flex items-center gap-2 text-xs bg-canvas border border-line/60 p-2.5 rounded-xl text-muted">
                    <MessageSquareIcon className="w-4 h-4 text-primary" />
                    <span>
                        <strong className="font-semibold text-ink">{session.messages?.length || 0}</strong> Messages
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
                <button
                    onClick={() => onOpenDetails(session.meetingId)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-ink font-semibold py-2.5 px-4 rounded-full text-xs transition-all cursor-pointer text-center shadow-xs"
                >
                    View Details
                </button>
                {!isEnded && (
                    <button
                        onClick={() => onRejoin(session.meetingId)}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 px-4 rounded-full text-xs transition-all shadow-xs cursor-pointer text-center"
                    >
                        Re-join
                    </button>
                )}
            </div>
        </div>
    )
}

export default SessionCard
