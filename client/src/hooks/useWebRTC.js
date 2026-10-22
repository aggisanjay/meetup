import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../config/socket";
import toast from "react-hot-toast";

const getIceServers = () => {
    const customIceServers = import.meta.env.VITE_ICE_SERVERS;
    if (customIceServers) {
        try {
            return JSON.parse(customIceServers);
        } catch (e) {
            console.warn("Failed to parse VITE_ICE_SERVERS, falling back to public STUN", e);
        }
    }
    return [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ];
};

export const useWebRTC = (roomId, user, onMeetingEnded, enabled = true) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteUsers, setRemoteUsers] = useState([]); // { socketId, userId, userName, stream, audioEnabled, videoEnabled }
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [mediaError, setMediaError] = useState(null);

    const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
    const iceCandidatesQueueRef = useRef(new Map()); // socketId -> Array<candidate>
    const localStreamRef = useRef(null);

    // Initialize local media stream
    const initLocalStream = useCallback(async () => {
        try {
            setMediaError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.warn("Camera/Mic access error, trying audio-only fallback:", error.message);
            // Fallback: try audio only
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStreamRef.current = audioStream;
                setLocalStream(audioStream);
                setVideoEnabled(false);
                setMediaError("Camera unavailable. Audio only enabled.");
                toast("Camera unavailable. Joined with audio only.", { icon: "🎤" });
                return audioStream;
            } catch (err) {
                console.error("Audio-only fallback error:", err.message);
                setMediaError("Could not access camera or microphone. Joined in listen-only mode.");
                toast.error("Could not access camera/microphone");
                return null;
            }
        }
    }, []);

    // Drain queued ICE candidates once remote description is set
    const drainIceQueue = useCallback(async (targetSocketId, peer) => {
        const queue = iceCandidatesQueueRef.current.get(targetSocketId) || [];
        if (queue.length > 0) {
            for (const candidate of queue) {
                try {
                    await peer.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding queued ICE candidate:", e);
                }
            }
            iceCandidatesQueueRef.current.set(targetSocketId, []);
        }
    }, []);

    // Create RTCPeerConnection for a target socket
    const createPeerConnection = useCallback((targetSocketId, targetUser) => {
        if (peersRef.current.has(targetSocketId)) {
            return peersRef.current.get(targetSocketId);
        }

        const peer = new RTCPeerConnection({
            iceServers: getIceServers(),
        });

        // Initialize candidate queue for target
        iceCandidatesQueueRef.current.set(targetSocketId, []);

        // Add local tracks to peer connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                peer.addTrack(track, localStreamRef.current);
            });
        }

        // Handle ICE candidates
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", {
                    targetSocketId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle incoming remote stream tracks
        peer.ontrack = (event) => {
            const remoteStream = event.streams[0];
            setRemoteUsers((prev) => {
                const existingIndex = prev.findIndex((u) => u.socketId === targetSocketId);
                if (existingIndex > -1) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        stream: remoteStream,
                    };
                    return updated;
                } else {
                    return [
                        ...prev,
                        {
                            socketId: targetSocketId,
                            userId: targetUser?.userId,
                            userName: targetUser?.userName || "Participant",
                            stream: remoteStream,
                            audioEnabled: targetUser?.audioEnabled ?? true,
                            videoEnabled: targetUser?.videoEnabled ?? true,
                        },
                    ];
                }
            });
        };

        peersRef.current.set(targetSocketId, peer);
        return peer;
    }, []);

    // Main WebRTC signaling effect
    useEffect(() => {
        if (!roomId || !user || !enabled) return;

        let isMounted = true;

        const startSession = async () => {
            await initLocalStream();

            if (!isMounted) return;

            // Emit join room (auth is already attached to socket handshake)
            socket.emit("join-room", {
                roomId,
                audioEnabled: true,
                videoEnabled: true,
            });

            // 1. Receive all existing users in room
            const handleAllUsers = (existingUsers) => {
                existingUsers.forEach((existingUser) => {
                    if (existingUser.socketId === socket.id) return;
                    const peer = createPeerConnection(existingUser.socketId, existingUser);

                    peer.createOffer()
                        .then((offer) => peer.setLocalDescription(offer))
                        .then(() => {
                            socket.emit("offer", {
                                targetSocketId: existingUser.socketId,
                                sdp: peer.localDescription,
                            });
                        })
                        .catch((err) => console.error("Error creating offer:", err));
                });
            };

            // 2. Someone new joined
            const handleUserJoined = (newUser) => {
                toast(`${newUser.userName} joined the meeting`, { icon: "👋" });
                createPeerConnection(newUser.socketId, newUser);
            };

            // 3. Receive offer
            const handleOffer = async ({ callerSocketId, sdp, callerUser }) => {
                const peer = createPeerConnection(callerSocketId, callerUser);
                try {
                    await peer.setRemoteDescription(new RTCSessionDescription(sdp));
                    await drainIceQueue(callerSocketId, peer);

                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);

                    socket.emit("answer", {
                        targetSocketId: callerSocketId,
                        sdp: peer.localDescription,
                    });
                } catch (err) {
                    console.error("Error handling offer:", err);
                }
            };

            // 4. Receive answer
            const handleAnswer = async ({ responderSocketId, sdp }) => {
                const peer = peersRef.current.get(responderSocketId);
                if (peer) {
                    try {
                        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
                        await drainIceQueue(responderSocketId, peer);
                    } catch (err) {
                        console.error("Error setting remote description from answer:", err);
                    }
                }
            };

            // 5. Receive ICE candidate with queueing
            const handleIceCandidate = async ({ senderSocketId, candidate }) => {
                const peer = peersRef.current.get(senderSocketId);
                if (peer && candidate) {
                    if (peer.remoteDescription && peer.remoteDescription.type) {
                        try {
                            await peer.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (err) {
                            console.error("Error adding ICE candidate:", err);
                        }
                    } else {
                        // Queue candidate until remote description is set
                        const queue = iceCandidatesQueueRef.current.get(senderSocketId) || [];
                        queue.push(candidate);
                        iceCandidatesQueueRef.current.set(senderSocketId, queue);
                    }
                }
            };

            // 6. Handle peer audio toggle
            const handleUserToggledAudio = ({ socketId, audioEnabled: peerAudio }) => {
                setRemoteUsers((prev) => prev.map((u) => (u.socketId === socketId ? { ...u, audioEnabled: peerAudio } : u)));
            };

            // 7. Handle peer video toggle
            const handleUserToggledVideo = ({ socketId, videoEnabled: peerVideo }) => {
                setRemoteUsers((prev) => prev.map((u) => (u.socketId === socketId ? { ...u, videoEnabled: peerVideo } : u)));
            };

            // 8. Handle peer left
            const handleUserLeft = ({ socketId, user: leftUser }) => {
                if (leftUser) {
                    toast(`${leftUser.userName} left the meeting`);
                }
                const peer = peersRef.current.get(socketId);
                if (peer) {
                    peer.close();
                    peersRef.current.delete(socketId);
                }
                iceCandidatesQueueRef.current.delete(socketId);
                setRemoteUsers((prev) => prev.filter((u) => u.socketId !== socketId));
            };

            // 9. Handle meeting ended
            const handleMeetingEndedMsg = ({ message }) => {
                toast.error(message || "This meeting has ended");
                if (onMeetingEnded) {
                    onMeetingEnded(message);
                }
            };

            socket.on("all-users", handleAllUsers);
            socket.on("user-joined", handleUserJoined);
            socket.on("offer", handleOffer);
            socket.on("answer", handleAnswer);
            socket.on("ice-candidate", handleIceCandidate);
            socket.on("user-toggled-audio", handleUserToggledAudio);
            socket.on("user-toggled-video", handleUserToggledVideo);
            socket.on("user-left", handleUserLeft);
            socket.on("meeting-ended", handleMeetingEndedMsg);
        };

        startSession();

        // Cleanup on unmount
        return () => {
            isMounted = false;

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }

            peersRef.current.forEach((peer) => peer.close());
            peersRef.current.clear();
            iceCandidatesQueueRef.current.clear();

            socket.off("all-users");
            socket.off("user-joined");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("user-toggled-audio");
            socket.off("user-toggled-video");
            socket.off("user-left");
            socket.off("meeting-ended");
        };
    }, [roomId, user?.id, enabled, createPeerConnection, drainIceQueue, initLocalStream, onMeetingEnded]);

    // Toggle local mic
    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                const newState = !audioEnabled;
                audioTrack.enabled = newState;
                setAudioEnabled(newState);
                socket.emit("toggle-audio", { roomId, audioEnabled: newState });
            }
        }
    };

    // Toggle local camera
    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                const newState = !videoEnabled;
                videoTrack.enabled = newState;
                setVideoEnabled(newState);
                socket.emit("toggle-video", { roomId, videoEnabled: newState });
            }
        }
    };

    // End meeting for everyone (Host only)
    const endMeeting = useCallback(() => {
        if (roomId) {
            socket.emit("end-meeting", { roomId });
        }
    }, [roomId]);

    return {
        localStream,
        remoteUsers,
        audioEnabled,
        videoEnabled,
        mediaError,
        toggleAudio,
        toggleVideo,
        endMeeting,
    };
};
