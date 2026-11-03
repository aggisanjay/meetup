import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    BoldIcon,
    ItalicIcon,
    Heading1Icon,
    Heading2Icon,
    ListIcon,
    ListOrderedIcon,
    CodeIcon,
    CheckSquareIcon,
    QuoteIcon,
    EyeIcon,
    Edit3Icon,
    DownloadIcon,
    LockIcon,
} from "lucide-react";

const NotesEditor = ({ ydoc, canEdit = true, onPresenceUpdate, remotePresences }) => {
    const ytext = ydoc.getText("content");
    const [content, setContent] = useState("");
    const [previewMode, setPreviewMode] = useState(false);
    const textareaRef = useRef(null);
    const isApplyingRemote = useRef(false);

    // Initial load & observe Yjs text changes
    useEffect(() => {
        setContent(ytext.toString());

        const observer = () => {
            isApplyingRemote.current = true;
            const newText = ytext.toString();
            setContent(newText);
            isApplyingRemote.current = false;
        };

        ytext.observe(observer);
        return () => {
            ytext.unobserve(observer);
        };
    }, [ytext]);

    // Handle local textarea edit and propagate to Y.Text with minimal diff
    const handleChange = (e) => {
        if (!canEdit) return;
        const newText = e.target.value;
        const oldText = content;

        if (newText === oldText) return;

        // Perform transactional update on Y.Text
        ydoc.transact(() => {
            // Find common prefix
            let start = 0;
            while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) {
                start++;
            }

            // Find common suffix
            let oldEnd = oldText.length;
            let newEnd = newText.length;
            while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
                oldEnd--;
                newEnd--;
            }

            // Delete replaced slice
            const deleteLength = oldEnd - start;
            if (deleteLength > 0) {
                ytext.delete(start, deleteLength);
            }

            // Insert new slice
            const insertText = newText.slice(start, newEnd);
            if (insertText.length > 0) {
                ytext.insert(start, insertText);
            }
        });

        setContent(newText);

        // Update cursor presence
        if (onPresenceUpdate && textareaRef.current) {
            const pos = textareaRef.current.selectionStart;
            onPresenceUpdate({ cursorPosition: pos, isTyping: true });
        }
    };

    // Helper: apply markdown format tag around selection
    const applyFormatting = (prefix, suffix = "") => {
        if (!canEdit || !textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = content.slice(start, end);
        const replacement = `${prefix}${selected}${suffix}`;

        const newContent = content.slice(0, start) + replacement + content.slice(end);

        ydoc.transact(() => {
            ytext.delete(start, end - start);
            ytext.insert(start, replacement);
        });

        setContent(newContent);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    const exportNotes = () => {
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meeting-notes-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-line overflow-hidden shadow-xs relative">
            {/* Top Toolbar */}
            <div className="px-4 py-2 border-b border-line bg-slate-50/90 flex items-center justify-between flex-wrap gap-2 z-10">
                <div className="flex items-center gap-1 flex-wrap">
                    {canEdit ? (
                        <>
                            <button
                                onClick={() => applyFormatting("**", "**")}
                                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                                title="Bold"
                            >
                                <BoldIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => applyFormatting("*", "*")}
                                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                                title="Italic"
                            >
                                <ItalicIcon className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1" />
                            <button
                                onClick={() => applyFormatting("# ")}
                                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                                title="Heading 1"
                            >
                                <Heading1Icon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => applyFormatting("## ")}
                                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                                title="Heading 2"
                            >
                                <Heading2Icon className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1" />
                            <button
                                onClick={() => applyFormatting("- ")}
                                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                                title="Bullet List"
                            >
                                <ListIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => applyFormatting("1. ")}
                                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                                title="Numbered List"
                            >
                                <ListOrderedIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => applyFormatting("[ ] ")}
                                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                                title="Task Item"
                            >
                                <CheckSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => applyFormatting("> ")}
                                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                                title="Quote"
                            >
                                <QuoteIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => applyFormatting("```\n", "\n```")}
                                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                                title="Code Block"
                            >
                                <CodeIcon className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted bg-slate-100 px-2.5 py-1 rounded-md">
                            <LockIcon className="w-3.5 h-3.5 text-amber-500" />
                            <span>Read-only mode (Viewer role)</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                            previewMode
                                ? "bg-primary text-white border-primary"
                                : "bg-white hover:bg-slate-100 text-slate-700 border-line"
                        }`}
                        title="Toggle Preview"
                    >
                        {previewMode ? <Edit3Icon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                        <span>{previewMode ? "Edit" : "Preview"}</span>
                    </button>

                    <button
                        onClick={exportNotes}
                        className="p-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-line text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Download Markdown"
                    >
                        <DownloadIcon className="w-3.5 h-3.5 text-muted" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative overflow-auto p-4 bg-white">
                {previewMode ? (
                    <div className="prose prose-slate max-w-none text-ink whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {content || (
                            <span className="text-muted italic">No notes written yet. Start typing!</span>
                        )}
                    </div>
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleChange}
                        disabled={!canEdit}
                        placeholder={
                            canEdit
                                ? "Type your shared meeting notes here in Markdown... (synchronizes with all attendees)"
                                : "View-only mode. Content updates in real-time."
                        }
                        className="w-full h-full resize-none outline-none border-none text-sm text-ink leading-relaxed font-mono bg-transparent placeholder-slate-400"
                        onMouseMove={(e) => {
                            if (onPresenceUpdate) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                onPresenceUpdate({
                                    cursor: { x: e.clientX - rect.left, y: e.clientY - rect.top },
                                });
                            }
                        }}
                    />
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="px-4 py-2 border-t border-line bg-slate-50/90 text-[11px] text-muted flex items-center justify-between">
                <div className="flex items-center gap-3 font-medium">
                    <span>{wordCount} words</span>
                    <span>{charCount} characters</span>
                </div>
                <span className="font-medium">Markdown supported</span>
            </div>
        </div>
    );
};

export default NotesEditor;
