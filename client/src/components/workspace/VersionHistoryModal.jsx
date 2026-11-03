import React, { useState, useEffect, useCallback } from "react";
import { HistoryIcon, XIcon, PlusIcon, RotateCcwIcon, CalendarIcon, UserIcon, Loader2Icon } from "lucide-react";
import api from "../../config/api";
import toast from "react-hot-toast";

const VersionHistoryModal = ({ isOpen, onClose, roomId, docType = "notes", token, canEdit = true, onRestoreVersion }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newVersionName, setNewVersionName] = useState("");
    const [creating, setCreating] = useState(false);
    const [restoringId, setRestoringId] = useState(null);

    const fetchVersions = useCallback(async () => {
        if (!isOpen || !roomId || !token) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/meetings/${roomId}/workspace/versions?docType=${docType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVersions(res.data.versions || []);
        } catch (err) {
            console.error("Failed to load versions:", err);
            toast.error("Could not fetch version history");
        } finally {
            setLoading(false);
        }
    }, [isOpen, roomId, docType, token]);

    useEffect(() => {
        fetchVersions();
    }, [fetchVersions]);

    const handleCreateVersion = async (e) => {
        e.preventDefault();
        if (!newVersionName.trim() || !canEdit) return;

        setCreating(true);
        try {
            await api.post(`/api/meetings/${roomId}/workspace/versions`, {
                docType,
                versionName: newVersionName.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Saved version "${newVersionName.trim()}"`);
            setNewVersionName("");
            fetchVersions();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save version");
        } finally {
            setCreating(false);
        }
    };

    const handleRestore = async (versionId, versionName) => {
        if (!canEdit) return;
        if (!window.confirm(`Are you sure you want to restore to version "${versionName}"? Current document will update for everyone.`)) {
            return;
        }

        setRestoringId(versionId);
        try {
            await onRestoreVersion(versionId, docType);
            onClose();
        } catch (err) {
            console.error("Restore failed:", err);
        } finally {
            setRestoringId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-line shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-5 border-b border-line flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <HistoryIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold font-display text-ink">Version History</h3>
                            <p className="text-xs text-muted capitalize">{docType} snapshots & audit trail</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Create Version Form */}
                {canEdit && (
                    <form onSubmit={handleCreateVersion} className="p-4 border-b border-line bg-white flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Save current state (e.g., 'Initial Draft', 'Final Review')..."
                            value={newVersionName}
                            onChange={(e) => setNewVersionName(e.target.value)}
                            className="flex-1 bg-canvas border border-line focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2 text-xs text-ink outline-none transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!newVersionName.trim() || creating}
                            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                            {creating ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <PlusIcon className="w-3.5 h-3.5" />}
                            <span>Snapshot</span>
                        </button>
                    </form>
                )}

                {/* Versions List */}
                <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-canvas/30">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
                            <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
                            <span className="text-xs font-medium">Loading versions...</span>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-muted text-xs">
                            <HistoryIcon className="w-8 h-8 stroke-1 text-slate-300 mb-2" />
                            <p className="font-semibold text-ink">No named versions yet</p>
                            <p className="text-muted mt-0.5">Use the snapshot button above to save named milestone versions.</p>
                        </div>
                    ) : (
                        versions.map((ver) => (
                            <div
                                key={ver.id}
                                className="p-4 rounded-2xl bg-white border border-line flex items-center justify-between gap-4 hover:border-primary-border/70 transition-all shadow-xs"
                            >
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-ink">{ver.version_name}</h4>
                                    <div className="flex items-center gap-3 text-[11px] text-muted">
                                        <span className="flex items-center gap-1">
                                            <UserIcon className="w-3 h-3 text-muted" />
                                            {ver.creator_name || "Author"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3 text-muted" />
                                            {new Date(ver.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    {ver.text_content && (
                                        <p className="text-[11px] text-muted line-clamp-1 italic font-mono mt-1 bg-canvas px-2 py-0.5 rounded border border-line">
                                            "{ver.text_content.slice(0, 80)}"
                                        </p>
                                    )}
                                </div>

                                {canEdit && (
                                    <button
                                        onClick={() => handleRestore(ver.id, ver.version_name)}
                                        disabled={restoringId === ver.id}
                                        className="px-3.5 py-1.5 rounded-xl border border-line hover:border-primary-border bg-white hover:bg-canvas text-ink text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                        title="Restore this version"
                                    >
                                        {restoringId === ver.id ? (
                                            <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <RotateCcwIcon className="w-3.5 h-3.5" />
                                        )}
                                        <span>Restore</span>
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default VersionHistoryModal;
