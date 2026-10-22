import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import VideoGrid from '../components/meeting/VideoGrid';
import { useWebRTC } from '../hooks/useWebRTC';
import ChatPanel from '../components/meeting/ChatPanel';
import { useChat } from '../hooks/useChat';
import ParticipantList from '../components/meeting/ParticipantList';
import ControlBar from '../components/meeting/ControlBar';
import WorkspaceContainer from '../components/workspace/WorkspaceContainer';
import { useWorkspace } from '../hooks/useWorkspace';
import toast from 'react-hot-toast';
import { useAuth, useUser } from '@clerk/react';
import api from '../config/api';
import { connectSocketWithAuth } from '../config/socket';
import Loader from '../components/Loader';
import { CrownIcon, ShieldIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';

const MeetingRoom = () => {
    const { meetingId } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const { getToken } = useAuth();

    const [token, setToken] = useState(null);
    const [meeting, setMeeting] = useState(null);
    const [loadingMeeting, setLoadingMeeting] = useState(true);

    // Drawers and panels
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true); // Open workspace by default for collaboration
    const [isWorkspaceMaximized, setIsWorkspaceMaximized] = useState(false);

    // Verified Authenticated User Data
    const userdata = useMemo(() => {
        if (!user) return null;
        return {
            id: user.id,
            name: user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "User",
            email: user.primaryEmailAddress?.emailAddress || "",
            image: user.imageUrl || "",
        };
    }, [user]);

    // 1. Fetch meeting & acquire token
    useEffect(() => {
        let isMounted = true;

        const initRoom = async () => {
            try {
                const authToken = await getToken();
                if (!isMounted) return;
                setToken(authToken);

                // Connect socket with verified auth token
                connectSocketWithAuth(authToken);

                const res = await api.get(`/api/meetings/${meetingId}`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                });

                if (res.data.meeting.status === "ended") {
                    toast.error("This meeting has ended");
                    navigate("/dashboard");
                    return;
                }

                if (isMounted) {
                    setMeeting(res.data.meeting);
                }
            } catch (error) {
                const errorMsg = error.response?.data?.error || "Meeting not found or you are not authorized";
                toast.error(errorMsg);
                navigate("/dashboard");
            } finally {
                if (isMounted) {
                    setLoadingMeeting(false);
                }
            }
        };

        initRoom();

        return () => {
            isMounted = false;
        };
    }, [meetingId, navigate, getToken]);

    const handleMeetingEnded = useCallback(() => {
        navigate('/dashboard');
    }, [navigate]);

    // Verified Host and Permissions
    const hostId = meeting?.host?.id || meeting?.host;
    const isHost = Boolean(userdata?.id && hostId && hostId.toString() === userdata.id.toString());
    const userRole = meeting?.role || (isHost ? "host" : "editor");
    const canEdit = userRole === "host" || userRole === "editor";

    // 2. Initialize WebRTC
    const {
        localStream,
        remoteUsers,
        audioEnabled,
        videoEnabled,
        mediaError,
        toggleAudio,
        toggleVideo,
        endMeeting
    } = useWebRTC(meetingId, userdata, handleMeetingEnded, Boolean(meeting));

    // 3. Initialize In-Meeting Chat
    const {
        messages,
        sendMessage,
        unreadCount,
        isChatOpen,
        toggleChat
    } = useChat(meetingId, userdata, token);

    // 4. Initialize Real-Time Collaborative Workspace
    const workspace = useWorkspace(meetingId, userdata, canEdit, token);

    const handleLeave = () => {
        toast("You left the meeting");
        navigate("/dashboard");
    };

    const handleEndMeeting = () => {
        endMeeting();
        toast("Meeting ended for all participants");
        navigate("/dashboard");
    };

    if (loadingMeeting) {
        return <Loader text="Joining verified meeting workspace..." />;
    }

    return (
        <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative font-sans">
            {/* Top Bar with Verified Meeting Title & Real Host */}
            <header className="w-full bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-2.5 border-b border-slate-800 flex items-center justify-between z-30 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                            {meeting?.title || "Collaborative Meeting"}
                        </h2>
                    </div>

                    <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">({meetingId})</span>

                    {/* Host badge */}
                    <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
                        <CrownIcon className="w-3 h-3 text-amber-400" />
                        <span>Host: {meeting?.host?.name || "Host"}</span>
                    </div>

                    {/* Role badge */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold uppercase">
                        <ShieldIcon className="w-3 h-3" />
                        <span>{userRole}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {mediaError && (
                        <span className="text-xs text-amber-400 hidden lg:inline-block bg-amber-950/40 border border-amber-800 px-2.5 py-1 rounded-lg">
                            ⚠️ {mediaError}
                        </span>
                    )}

                    {isWorkspaceOpen && (
                        <button
                            onClick={() => setIsWorkspaceMaximized(!isWorkspaceMaximized)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium hidden sm:flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                            title={isWorkspaceMaximized ? "Restore split layout" : "Maximize workspace"}
                        >
                            {isWorkspaceMaximized ? <Minimize2Icon className="w-3.5 h-3.5" /> : <Maximize2Icon className="w-3.5 h-3.5" />}
                            <span>{isWorkspaceMaximized ? "Split View" : "Maximize"}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Center Layout: Video Grid + Collaborative Workspace + Side Drawers */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* When Workspace is Open: Side-by-Side Split View */}
                {isWorkspaceOpen ? (
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                        {/* Collaborative Workspace (Notes, Whiteboard, Code) */}
                        <div className={`flex-1 h-full overflow-hidden transition-all duration-300 ${isWorkspaceMaximized ? "w-full" : "lg:w-3/5 xl:w-2/3"}`}>
                            <WorkspaceContainer
                                roomId={meetingId}
                                user={userdata}
                                userRole={userRole}
                                isHost={isHost}
                                canEdit={canEdit}
                                token={token}
                                workspace={workspace}
                            />
                        </div>

                        {/* Video Grid Side Column when Workspace is Active */}
                        {!isWorkspaceMaximized && (
                            <div className="h-48 lg:h-full lg:w-2/5 xl:w-1/3 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-2 overflow-y-auto flex items-center justify-center">
                                <VideoGrid
                                    localStream={localStream}
                                    localUser={userdata}
                                    remoteUsers={remoteUsers}
                                    audioEnabled={audioEnabled}
                                    videoEnabled={videoEnabled}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    /* Full Screen Video Grid when Workspace is Closed */
                    <div className="flex-1 flex overflow-hidden relative">
                        <VideoGrid
                            localStream={localStream}
                            localUser={userdata}
                            remoteUsers={remoteUsers}
                            audioEnabled={audioEnabled}
                            videoEnabled={videoEnabled}
                        />
                    </div>
                )}

                {/* In-Meeting Chat Drawer */}
                <ChatPanel
                    isOpen={isChatOpen}
                    onClose={toggleChat}
                    messages={messages}
                    onSendMessage={sendMessage}
                    currentUser={userdata}
                />

                {/* Participants Drawer */}
                <ParticipantList
                    isOpen={isParticipantsOpen}
                    onClose={() => setIsParticipantsOpen(false)}
                    localUser={userdata}
                    localAudio={audioEnabled}
                    localVideo={videoEnabled}
                    remoteUsers={remoteUsers}
                    meetingHostId={hostId}
                />
            </div>

            {/* Bottom Control Bar */}
            <ControlBar
                roomId={meetingId}
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onToggleChat={toggleChat}
                onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
                onToggleWorkspace={() => setIsWorkspaceOpen((prev) => !prev)}
                isChatOpen={isChatOpen}
                isParticipantsOpen={isParticipantsOpen}
                isWorkspaceOpen={isWorkspaceOpen}
                unreadCount={unreadCount}
                participantCount={1 + remoteUsers.length}
                isHost={isHost}
                onLeave={handleLeave}
                onEndMeeting={handleEndMeeting}
            />
        </div>
    );
};

export default MeetingRoom;