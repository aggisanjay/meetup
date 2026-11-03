import { SendIcon, XIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

const ChatPanel = ({ isOpen, onClose, messages, onSendMessage, currentUser }) => {
    const [text, setText] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSendMessage(text);
            setText("");
        }
    };

    if (!isOpen) return null;

    return (
        <aside className="w-full sm:w-88 h-full bg-white/95 backdrop-blur-2xl border-l border-line flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-line flex items-center justify-between">
                <h3 className="font-display font-semibold text-ink text-base flex items-center gap-2">
                    In-Meeting Chat
                </h3>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-muted hover:text-ink transition-colors cursor-pointer"
                    title="Close Chat"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-canvas/30">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted text-sm">
                        <p className="font-medium text-ink">No messages yet.</p>
                        <p className="text-xs mt-1 text-muted">Send a message to start chatting with participants!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderId === currentUser?.id;
                        return (
                            <div key={msg.id || index} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-xs font-semibold text-muted">{isMe ? "You" : msg.senderName}</span>
                                    <span className="text-[10px] text-muted/70">{msg.time}</span>
                                </div>
                                <div
                                    className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-xs ${
                                        isMe
                                            ? "rounded-tr-xs bg-primary text-white"
                                            : "rounded-tl-xs bg-white border border-line text-ink"
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-line bg-white flex items-center gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-canvas border border-line focus:border-primary focus:ring-1 focus:ring-primary rounded-full px-4 py-2.5 text-sm text-ink placeholder-slate-400 outline-none transition-all"
                />
                <button
                    type="submit"
                    disabled={!text.trim()}
                    className="p-2.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-40 text-white shadow-xs transition-all cursor-pointer"
                    title="Send"
                >
                    <SendIcon className="w-4 h-4" />
                </button>
            </form>
        </aside>
    );
};

export default ChatPanel;
