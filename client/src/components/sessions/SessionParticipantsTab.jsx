import { CrownIcon, UsersIcon } from 'lucide-react'
import React from 'react'

const SessionParticipantsTab = ({ participants = [], host }) => {
    if (participants.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted text-sm py-12">
                <UsersIcon className="w-8 h-8 mb-2 text-slate-300" />
                <p>No participant logs recorded.</p>
            </div>
        )
    }

    const hostId = host?.id;

    return (
        <div className="space-y-2.5">
            {participants.map((p, idx) => {
                const participantUserId = p.user?.id || p.user;
                const isHost = Boolean(hostId && participantUserId && participantUserId.toString() === hostId.toString());

                return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-line shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm shadow-xs">
                                {p.name ? p.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div>
                                <span className="text-sm font-semibold text-ink flex items-center gap-1.5">
                                    {p.name}
                                    {isHost && <CrownIcon className="w-3.5 h-3.5 text-amber-500" title="Host" />}
                                </span>
                                {p.user?.email && <span className="text-xs text-muted">{p.user.email}</span>}
                            </div>
                        </div>
                        <span className="text-xs text-muted font-mono">
                            Joined: {new Date(p.joinedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default SessionParticipantsTab;
