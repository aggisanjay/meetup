import React, { useState } from 'react'
import { XIcon } from 'lucide-react'
import SessionChatTab from './SessionChatTab';
import SessionParticipantsTab from './SessionParticipantsTab';

const SessionDetailModal = ({ session, onClose }) => {
    const [activeTab, setActiveTab] = useState("chat");

    if (!session) return null;

    const isEnded = session.status === "ended";

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in duration-150">
                {/* Modal Header */}
                <div className="p-6 border-b border-line flex items-center justify-between bg-slate-50/70">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted font-medium bg-canvas border border-line px-2 py-0.5 rounded-md">
                                ID: {session.meetingId}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                isEnded ? "bg-slate-100 text-muted" : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                            }`}>
                                {isEnded ? "Ended" : "Active"}
                            </span>
                        </div>
                        <h2 className="text-2xl font-semibold font-display text-ink mt-1">
                            {session.title || "Meeting Details"}
                        </h2>
                        <p className="text-xs text-muted mt-1">
                            Host: <span className="font-semibold text-ink">{session.host?.name || "Host"}</span> • Created {new Date(session.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-200/60 text-muted hover:text-ink transition-colors cursor-pointer"
                        aria-label="Close session details"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs Title */}
                <div className="flex border-b border-line px-6 bg-slate-50/40">
                    <button
                        onClick={() => setActiveTab("chat")}
                        className={`py-3 px-4 font-semibold text-sm border-b-2 cursor-pointer transition-all ${
                            activeTab === "chat"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted hover:text-ink"
                        }`}
                    >
                        Chat Transcript ({session.messages?.length || 0})
                    </button>

                    <button
                        onClick={() => setActiveTab("participants")}
                        className={`py-3 px-4 font-semibold text-sm border-b-2 cursor-pointer transition-all ${
                            activeTab === "participants"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted hover:text-ink"
                        }`}
                    >
                        Participants Log ({session.participants?.length || 0})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-6 overflow-y-auto min-h-75 bg-canvas/30">
                    {activeTab === 'chat' ? (
                        <SessionChatTab messages={session.messages} />
                    ) : (
                        <SessionParticipantsTab participants={session.participants} host={session.host} />
                    )}
                </div>
            </div>
        </div>
    )
}

export default SessionDetailModal
