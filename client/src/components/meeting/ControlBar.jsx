import {
    CheckIcon,
    CopyIcon,
    MessageSquareIcon,
    MicIcon,
    MicOffIcon,
    PhoneOffIcon,
    UsersIcon,
    VideoIcon,
    VideoOffIcon,
    LayersIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

const ControlBar = ({
    roomId,
    audioEnabled,
    videoEnabled,
    onToggleAudio,
    onToggleVideo,
    onToggleChat,
    onToggleParticipants,
    onToggleWorkspace,
    isChatOpen,
    isParticipantsOpen,
    isWorkspaceOpen,
    unreadCount,
    participantCount,
    isHost,
    onLeave,
    onEndMeeting,
}) => {
    const [copied, setCopied] = useState(false);

    const copyMeetingId = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success("Meeting link copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <footer className="w-full bg-white/85 backdrop-blur-xl border-t border-line px-4 sm:px-6 py-3 flex items-center justify-between z-40 shadow-[0_-8px_30px_-15px_rgba(79,70,229,0.18)]">
            {/* Left Info / Copy Link */}
            <div className="hidden sm:flex items-center gap-3">
                <span className="text-xs font-medium text-muted font-mono tracking-wider bg-canvas border border-line px-2.5 py-1 rounded-full">
                    ID: {roomId}
                </span>
                <button
                    onClick={copyMeetingId}
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-canvas border border-line text-ink text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                    {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CopyIcon className="w-3.5 h-3.5 text-muted" />}
                    <span>{copied ? "Copied" : "Copy Link"}</span>
                </button>
            </div>

            {/* Center Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5 mx-auto sm:mx-0">
                {/* Audio Toggle */}
                <button
                    onClick={onToggleAudio}
                    className={`p-3 rounded-full transition-all cursor-pointer border shadow-xs ${
                        audioEnabled
                            ? "bg-slate-100 hover:bg-slate-200 text-ink border-line"
                            : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 ring-2 ring-rose-200/50"
                    }`}
                    title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
                >
                    {audioEnabled ? <MicIcon className="w-4.5 h-4.5" /> : <MicOffIcon className="w-4.5 h-4.5" />}
                </button>

                {/* Video Toggle */}
                <button
                    onClick={onToggleVideo}
                    className={`p-3 rounded-full transition-all cursor-pointer border shadow-xs ${
                        videoEnabled
                            ? "bg-slate-100 hover:bg-slate-200 text-ink border-line"
                            : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 ring-2 ring-rose-200/50"
                    }`}
                    title={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
                >
                    {videoEnabled ? <VideoIcon className="w-4.5 h-4.5" /> : <VideoOffIcon className="w-4.5 h-4.5" />}
                </button>

                {/* Workspace Collaboration Area Toggle */}
                <button
                    onClick={onToggleWorkspace}
                    className={`px-4 py-2.5 rounded-full transition-all cursor-pointer border flex items-center gap-2 ${
                        isWorkspaceOpen
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/25 ring-2 ring-primary/30"
                            : "bg-slate-100 hover:bg-slate-200 text-ink border-line shadow-xs"
                    }`}
                    title="Toggle Collaboration Workspace (Notes, Whiteboard, Code)"
                >
                    <LayersIcon className="w-4.5 h-4.5" />
                    <span className="hidden md:inline-block text-xs font-semibold">Workspace</span>
                </button>

                {/* Chat Toggle */}
                <button
                    onClick={onToggleChat}
                    className={`relative p-3 rounded-full transition-all cursor-pointer border shadow-xs ${
                        isChatOpen
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                            : "bg-slate-100 hover:bg-slate-200 text-ink border-line"
                    }`}
                    title="Toggle In-Meeting Chat"
                >
                    <MessageSquareIcon className="w-4.5 h-4.5" />
                    {unreadCount > 0 && !isChatOpen && (
                        <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                            {unreadCount}
                        </span>
                    )}
                </button>

                {/* Participants Toggle */}
                <button
                    onClick={onToggleParticipants}
                    className={`relative p-3 rounded-full transition-all cursor-pointer border shadow-xs ${
                        isParticipantsOpen
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                            : "bg-slate-100 hover:bg-slate-200 text-ink border-line"
                    }`}
                    title="Toggle Participants List"
                >
                    <UsersIcon className="w-4.5 h-4.5" />
                    <span className="absolute -top-1 -right-1 bg-white text-ink text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-line shadow-xs">
                        {participantCount}
                    </span>
                </button>

                {/* Leave / End Meeting Button */}
                {isHost ? (
                    <button
                        onClick={onEndMeeting}
                        className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 transition-all cursor-pointer border border-rose-500 ml-1 sm:ml-2 font-semibold text-xs flex items-center gap-1.5"
                        title="End Meeting for All"
                    >
                        <PhoneOffIcon className="w-4.5 h-4.5" />
                        <span className="hidden md:inline">End Meeting</span>
                    </button>
                ) : (
                    <button
                        onClick={onLeave}
                        className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 transition-all cursor-pointer border border-rose-500 ml-1 sm:ml-2 font-semibold text-xs flex items-center gap-1.5"
                        title="Leave Meeting"
                    >
                        <PhoneOffIcon className="w-4.5 h-4.5" />
                        <span className="hidden md:inline">Leave</span>
                    </button>
                )}
            </div>

            {/* Right branding */}
            <div className="hidden sm:block text-right">
                <span className="text-xs font-semibold text-muted font-display">
                    MeetUp<span className="text-primary">.</span> Workspace
                </span>
            </div>
        </footer>
    );
};

export default ControlBar;
