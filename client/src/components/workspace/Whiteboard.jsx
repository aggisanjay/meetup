import React, { useRef, useState, useEffect, useCallback } from "react";
import * as Y from "yjs";
import {
    PencilIcon,
    SquareIcon,
    CircleIcon,
    MinusIcon,
    ArrowRightIcon,
    TypeIcon,
    EraserIcon,
    Trash2Icon,
    DownloadIcon,
    Undo2Icon,
    Redo2Icon,
    LockIcon,
} from "lucide-react";
import LiveCursors from "./LiveCursors";

const COLORS = [
    "#0f172a", // slate 900
    "#dc2626", // red 600
    "#2563eb", // blue 600
    "#16a34a", // green 600
    "#d97706", // amber 600
    "#7c3aed", // violet 600
    "#db2777", // pink 600
    "#0891b2", // cyan 600
];

const STROKE_WIDTHS = [2, 4, 8];

const Whiteboard = ({ ydoc, canEdit = true, onPresenceUpdate, remotePresences }) => {
    const yelements = ydoc.getArray("elements");
    const canvasRef = useRef(null);

    const [tool, setTool] = useState("pen"); // 'pen' | 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'eraser'
    const [color, setColor] = useState("#0f172a");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [elements, setElements] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentElement, setCurrentElement] = useState(null);

    // Yjs UndoManager for whiteboard elements
    const undoManagerRef = useRef(null);
    useEffect(() => {
        undoManagerRef.current = new Y.UndoManager(yelements);
        return () => {
            undoManagerRef.current?.destroy();
        };
    }, [yelements]);

    // Synchronize local elements from Yjs Array
    useEffect(() => {
        setElements(yelements.toArray());

        const observer = () => {
            setElements(yelements.toArray());
        };

        yelements.observe(observer);
        return () => {
            yelements.unobserve(observer);
        };
    }, [yelements]);

    // Redraw canvas whenever elements change
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw saved elements
        const allElements = currentElement ? [...elements, currentElement] : elements;

        allElements.forEach((el) => {
            ctx.save();
            ctx.strokeStyle = el.color || "#0f172a";
            ctx.fillStyle = el.color || "#0f172a";
            ctx.lineWidth = el.strokeWidth || 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            if (el.type === "pen" && el.points?.length > 0) {
                ctx.beginPath();
                ctx.moveTo(el.points[0].x, el.points[0].y);
                for (let i = 1; i < el.points.length; i++) {
                    ctx.lineTo(el.points[i].x, el.points[i].y);
                }
                ctx.stroke();
            } else if (el.type === "rect") {
                ctx.strokeRect(el.x, el.y, el.width, el.height);
            } else if (el.type === "circle") {
                ctx.beginPath();
                const radius = Math.sqrt(el.width * el.width + el.height * el.height);
                ctx.arc(el.x, el.y, radius, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (el.type === "line") {
                ctx.beginPath();
                ctx.moveTo(el.x, el.y);
                ctx.lineTo(el.x + el.width, el.y + el.height);
                ctx.stroke();
            } else if (el.type === "arrow") {
                const toX = el.x + el.width;
                const toY = el.y + el.height;
                ctx.beginPath();
                ctx.moveTo(el.x, el.y);
                ctx.lineTo(toX, toY);
                ctx.stroke();

                // Arrow head
                const angle = Math.atan2(el.height, el.width);
                const headLen = 12;
                ctx.beginPath();
                ctx.moveTo(toX, toY);
                ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fill();
            } else if (el.type === "text") {
                ctx.font = `${(el.strokeWidth || 3) * 6 + 12}px sans-serif`;
                ctx.fillText(el.text || "", el.x, el.y);
            }

            ctx.restore();
        });
    }, [elements, currentElement]);

    // Auto-resize canvas to parent
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleResize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            renderCanvas();
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [renderCanvas]);

    useEffect(() => {
        renderCanvas();
    }, [renderCanvas]);

    // Canvas Pointer Events
    const handlePointerDown = (e) => {
        if (!canEdit) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);

        if (tool === "eraser") {
            // Find closest element and remove it
            const hitIndex = elements.findIndex((el) => {
                if (el.type === "pen") {
                    return el.points?.some((p) => Math.hypot(p.x - x, p.y - y) < 15);
                }
                return Math.hypot(el.x - x, el.y - y) < 25;
            });

            if (hitIndex > -1) {
                ydoc.transact(() => {
                    yelements.delete(hitIndex, 1);
                });
            }
            return;
        }

        if (tool === "text") {
            const text = window.prompt("Enter text note:");
            if (text && text.trim()) {
                const newEl = {
                    id: `txt_${Date.now()}`,
                    type: "text",
                    x,
                    y,
                    text: text.trim(),
                    color,
                    strokeWidth,
                };
                ydoc.transact(() => {
                    yelements.push([newEl]);
                });
            }
            setIsDrawing(false);
            return;
        }

        if (tool === "pen") {
            setCurrentElement({
                id: `pen_${Date.now()}`,
                type: "pen",
                points: [{ x, y }],
                color,
                strokeWidth,
            });
        } else {
            setCurrentElement({
                id: `${tool}_${Date.now()}`,
                type: tool,
                x,
                y,
                width: 0,
                height: 0,
                color,
                strokeWidth,
            });
        }
    };

    const handlePointerMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Presence broadcast
        if (onPresenceUpdate) {
            onPresenceUpdate({
                cursor: { x, y },
                isTyping: isDrawing,
            });
        }

        if (!isDrawing || !currentElement) return;

        if (currentElement.type === "pen") {
            setCurrentElement((prev) => ({
                ...prev,
                points: [...prev.points, { x, y }],
            }));
        } else {
            setCurrentElement((prev) => ({
                ...prev,
                width: x - prev.x,
                height: y - prev.y,
            }));
        }
    };

    const handlePointerUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentElement) {
            ydoc.transact(() => {
                yelements.push([currentElement]);
            });
            setCurrentElement(null);
        }
    };

    const clearCanvas = () => {
        if (!canEdit) return;
        if (window.confirm("Are you sure you want to clear the whiteboard for everyone?")) {
            ydoc.transact(() => {
                yelements.delete(0, yelements.length);
            });
        }
    };

    const downloadPNG = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = `meeting-whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const undo = () => undoManagerRef.current?.undo();
    const redo = () => undoManagerRef.current?.redo();

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs relative">
            {/* Whiteboard Toolbar */}
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2 z-10">
                {/* Tools */}
                <div className="flex items-center gap-1">
                    {canEdit ? (
                        <>
                            <button
                                onClick={() => setTool("pen")}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    tool === "pen" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"
                                }`}
                                title="Freehand Pen"
                            >
                                <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTool("line")}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    tool === "line" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"
                                }`}
                                title="Line"
                            >
                                <MinusIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTool("arrow")}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    tool === "arrow" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"
                                }`}
                                title="Arrow"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTool("rect")}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    tool === "rect" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"
                                }`}
                                title="Rectangle"
                            >
                                <SquareIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTool("circle")}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    tool === "circle" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"
                                }`}
                                title="Circle"
                            >
                                <CircleIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTool("text")}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    tool === "text" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"
                                }`}
                                title="Text"
                            >
                                <TypeIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTool("eraser")}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    tool === "eraser" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"
                                }`}
                                title="Eraser"
                            >
                                <EraserIcon className="w-4 h-4" />
                            </button>

                            <div className="w-px h-5 bg-slate-300 mx-1" />

                            {/* Color Palette */}
                            <div className="flex items-center gap-1">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={`size-5 rounded-full border transition-transform cursor-pointer ${
                                            color === c ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"
                                        }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>

                            <div className="w-px h-5 bg-slate-300 mx-1" />

                            {/* Stroke Widths */}
                            <div className="flex items-center gap-1">
                                {STROKE_WIDTHS.map((w) => (
                                    <button
                                        key={w}
                                        onClick={() => setStrokeWidth(w)}
                                        className={`size-6 rounded-md flex items-center justify-center cursor-pointer ${
                                            strokeWidth === w ? "bg-slate-200 ring-1 ring-slate-400" : "hover:bg-slate-100"
                                        }`}
                                    >
                                        <div
                                            className="rounded-full bg-slate-800"
                                            style={{ width: `${w * 2}px`, height: `${w * 2}px` }}
                                        />
                                    </button>
                                ))}
                            </div>

                            <div className="w-px h-5 bg-slate-300 mx-1" />

                            {/* Undo / Redo */}
                            <button
                                onClick={undo}
                                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Undo"
                            >
                                <Undo2Icon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={redo}
                                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Redo"
                            >
                                <Redo2Icon className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                            <LockIcon className="w-3.5 h-3.5 text-amber-500" />
                            <span>Read-only mode (Viewer role)</span>
                        </div>
                    )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <button
                            onClick={clearCanvas}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 border border-transparent hover:border-rose-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Clear Board"
                        >
                            <Trash2Icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Clear</span>
                        </button>
                    )}

                    <button
                        onClick={downloadPNG}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Download as PNG"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">PNG</span>
                    </button>
                </div>
            </div>

            {/* Canvas Body */}
            <div className="flex-1 relative overflow-hidden bg-slate-50/50">
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="w-full h-full touch-none cursor-crosshair"
                />

                {/* Live Cursors for remote participants */}
                <LiveCursors presences={remotePresences} currentDocType="whiteboard" />
            </div>
        </div>
    );
};

export default Whiteboard;
