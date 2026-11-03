import { MicOffIcon, UserIcon, VideoOffIcon } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

const VideoTile = ({ stream, name, isLocal = false, audioEnabled = true, videoEnabled = true }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative w-full h-full min-h-50 bg-gradient-to-br from-[#121629] to-[#0b0e1b] rounded-3xl overflow-hidden border border-line/70 shadow-lg shadow-indigo-950/10 flex items-center justify-center group">
            {/* Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                    videoEnabled ? "opacity-100" : "opacity-0 pointer-events-none absolute"
                } ${isLocal ? "-scale-x-100" : ""}`}
            />

            {/* Camera Off Placeholder */}
            {!videoEnabled && (
                <div className="flex flex-col items-center justify-center space-y-3 z-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-indigo-500 border-2 border-white/20 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-lg ring-4 ring-white/10">
                        {name ? name.charAt(0) : <UserIcon className="w-8 h-8" />}
                    </div>
                    <span className="text-xs font-semibold px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white/90 border border-white/20 flex items-center gap-1.5 shadow-sm">
                        <VideoOffIcon className="w-3.5 h-3.5 text-rose-400" />
                        Camera Off
                    </span>
                </div>
            )}

            {/* Bottom Info Bar Overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
                <div className="flex items-center gap-2 bg-slate-950/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-medium text-white shadow-md">
                    <span>
                        {name} {isLocal ? "(You)" : ""}
                    </span>
                    {!audioEnabled && (
                        <span className="p-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/40">
                            <MicOffIcon className="w-3 h-3" />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoTile;
