import React, { useState, useEffect, useCallback } from "react";
import { UserPlusIcon, XIcon, ShieldIcon, Trash2Icon, CrownIcon, Loader2Icon, MailIcon, CheckIcon } from "lucide-react";
import api from "../../config/api";
import toast from "react-hot-toast";

const InviteMemberModal = ({ isOpen, onClose, roomId, token, isHost }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("editor"); // 'editor' | 'viewer'
    const [inviting, setInviting] = useState(false);

    const fetchMembers = useCallback(async () => {
        if (!isOpen || !roomId || !token) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/meetings/${roomId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(res.data.members || []);
        } catch (err) {
            console.error("Failed to load members:", err);
        } finally {
            setLoading(false);
        }
    }, [isOpen, roomId, token]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!email.trim() || !isHost) return;

        setInviting(true);
        try {
            const res = await api.post(`/api/meetings/${roomId}/invite`, {
                email: email.trim(),
                role,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.message || `User invited as ${role}`);
            setEmail("");
            fetchMembers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to invite user");
        } finally {
            setInviting(false);
        }
    };

    const handleRoleChange = async (targetUserId, newRole) => {
        if (!isHost) return;
        try {
            await api.patch(`/api/meetings/${roomId}/members/${targetUserId}`, {
                role: newRole,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Member role updated");
            fetchMembers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update role");
        }
    };

    const handleRemoveMember = async (targetUserId) => {
        if (!isHost) return;
        if (!window.confirm("Are you sure you want to remove this member from the meeting?")) return;

        try {
            await api.delete(`/api/meetings/${roomId}/members/${targetUserId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Member removed");
            fetchMembers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to remove member");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <UserPlusIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Manage Room Roles & Invitations</h3>
                            <p className="text-xs text-slate-500">Assign Host, Editor, or Viewer access</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Invite Form (Host Only) */}
                {isHost && (
                    <form onSubmit={handleInvite} className="p-5 border-b border-slate-100 bg-white space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <MailIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                <input
                                    type="email"
                                    placeholder="Enter collaborator email..."
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-primary rounded-xl text-xs text-slate-900 outline-none transition-all"
                                />
                            </div>

                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                            >
                                <option value="editor">Editor (Can edit)</option>
                                <option value="viewer">Viewer (Read only)</option>
                            </select>

                            <button
                                type="submit"
                                disabled={!email.trim() || inviting}
                                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                                {inviting ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <UserPlusIcon className="w-3.5 h-3.5" />}
                                <span>Invite</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* Current Members List */}
                <div className="flex-1 p-5 overflow-y-auto space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Room Members ({members.length})</h4>

                    {loading ? (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                            <Loader2Icon className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs">Loading members...</span>
                        </div>
                    ) : members.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs">No members found.</div>
                    ) : (
                        members.map((m) => (
                            <div
                                key={m.id}
                                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 shadow-xs"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center uppercase">
                                        {m.name?.charAt(0) || "U"}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-slate-900">{m.name}</span>
                                            {m.role === "host" && <CrownIcon className="w-3.5 h-3.5 text-amber-500" title="Host" />}
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-mono">{m.email}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {m.role === "host" ? (
                                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                                            Host
                                        </span>
                                    ) : isHost ? (
                                        <>
                                            <select
                                                value={m.role}
                                                onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer"
                                            >
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                            <button
                                                onClick={() => handleRemoveMember(m.user_id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Remove member"
                                            >
                                                <Trash2Icon className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                            m.role === "editor"
                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                : "bg-slate-100 text-slate-700 border-slate-200"
                                        }`}>
                                            {m.role}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;
