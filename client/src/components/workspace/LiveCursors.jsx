import React from "react";
import { MousePointer2Icon } from "lucide-react";

// Deterministic colors for participants based on user ID or name
const CURSOR_COLORS = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#8b5cf6", // purple
    "#f59e0b", // amber
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
];

function getColorForUser(str = "") {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CURSOR_COLORS.length;
    return CURSOR_COLORS[index];
}

const LiveCursors = ({ presences = new Map(), currentDocType = "notes" }) => {
    const presenceList = Array.from(presences.values()).filter(
        (p) => p.cursor && (!p.docType || p.docType === currentDocType)
    );

    if (presenceList.length === 0) return null;

    return (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
            {presenceList.map((p) => {
                const color = getColorForUser(p.userId || p.userName);
                const x = p.cursor.x || 0;
                const y = p.cursor.y || 0;

                return (
                    <div
                        key={p.socketId}
                        className="absolute transition-all duration-75 ease-out flex items-start gap-1"
                        style={{
                            transform: `translate3d(${x}px, ${y}px, 0)`,
                            willChange: "transform",
                        }}
                    >
                        <MousePointer2Icon
                            className="w-4 h-4 drop-shadow-sm -rotate-45"
                            style={{ color, fill: color }}
                        />
                        <span
                            className="text-[11px] font-medium px-1.5 py-0.5 rounded-md text-white shadow-sm whitespace-nowrap"
                            style={{ backgroundColor: color }}
                        >
                            {p.userName || "Participant"}
                            {p.isTyping && " (typing...)"}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default LiveCursors;
