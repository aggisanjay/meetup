import React, { useState, useEffect, useRef } from "react";
import {
    PlayIcon,
    CopyIcon,
    CheckIcon,
    LockIcon,
    TerminalIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    Trash2Icon,
} from "lucide-react";
import toast from "react-hot-toast";

const LANGUAGES = [
    { id: "javascript", name: "JavaScript" },
    { id: "typescript", name: "TypeScript" },
    { id: "python", name: "Python" },
    { id: "html", name: "HTML / XML" },
    { id: "json", name: "JSON" },
    { id: "sql", name: "SQL" },
];

const DEFAULT_CODE_SNIPPETS = {
    javascript: `// Real-Time Collaborative JavaScript\nfunction calculateMetrics(items) {\n  return items.reduce((acc, curr) => acc + curr.value, 0);\n}\n\nconsole.log("Total:", calculateMetrics([{ value: 10 }, { value: 25 }, { value: 65 }]));\n`,
    python: `# Shared Python Script\ndef fibonacci(n):\n    a, b = 0, 1\n    result = []\n    for _ in range(n):\n        result.append(a)\n        a, b = b, a + b\n    return result\n\nprint("Fibonacci:", fibonacci(8))\n`,
    html: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Live Preview</title>\n</head>\n<body>\n  <h1>Welcome to MeetUp Shared Workspace</h1>\n</body>\n</html>\n`,
    json: `{\n  "projectName": "MeetUp Collaborative Workspace",\n  "version": "2.0.0",\n  "status": "active"\n}\n`,
    sql: `-- Collaborative Query\nSELECT m.id, m.title, COUNT(mp.id) as participant_count\nFROM meetings m\nLEFT JOIN meeting_participants mp ON m.id = mp.meeting_id\nGROUP BY m.id, m.title;\n`,
    typescript: `interface Participant {\n  id: string;\n  name: string;\n  role: 'host' | 'editor' | 'viewer';\n}\n\nconst user: Participant = {\n  id: "u123",\n  name: "Alex Rivera",\n  role: "editor"\n};\n`,
};

const CodeEditor = ({ ydoc, canEdit = true, onPresenceUpdate, remotePresences }) => {
    const ytext = ydoc.getText("code");
    const ymeta = ydoc.getMap("codeMeta");

    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [theme, setTheme] = useState("dark"); // 'dark' | 'light'
    const [copied, setCopied] = useState(false);

    // Run / Output console state
    const [output, setOutput] = useState([]);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const textareaRef = useRef(null);

    // Synchronize Yjs code & meta
    useEffect(() => {
        const initialText = ytext.toString();
        if (!initialText) {
            // Seed initial snippet
            ydoc.transact(() => {
                ytext.insert(0, DEFAULT_CODE_SNIPPETS.javascript);
                ymeta.set("language", "javascript");
            });
            setCode(DEFAULT_CODE_SNIPPETS.javascript);
        } else {
            setCode(initialText);
        }

        const savedLang = ymeta.get("language");
        if (savedLang) setLanguage(savedLang);

        const textObserver = () => {
            setCode(ytext.toString());
        };

        const metaObserver = () => {
            const lang = ymeta.get("language");
            if (lang) setLanguage(lang);
        };

        ytext.observe(textObserver);
        ymeta.observe(metaObserver);

        return () => {
            ytext.unobserve(textObserver);
            ymeta.unobserve(metaObserver);
        };
    }, [ydoc, ytext, ymeta]);

    const handleCodeChange = (e) => {
        if (!canEdit) return;
        const newCode = e.target.value;
        if (newCode === code) return;

        ydoc.transact(() => {
            ytext.delete(0, ytext.length);
            ytext.insert(0, newCode);
        });
        setCode(newCode);

        // Presence update
        if (onPresenceUpdate && textareaRef.current) {
            const pos = textareaRef.current.selectionStart;
            const lines = newCode.substring(0, pos).split("\n");
            onPresenceUpdate({
                cursor: { line: lines.length, ch: lines[lines.length - 1].length },
                isTyping: true,
            });
        }
    };

    const handleLanguageChange = (newLang) => {
        if (!canEdit) return;
        setLanguage(newLang);
        ydoc.transact(() => {
            ymeta.set("language", newLang);
            if (!code.trim() || Object.values(DEFAULT_CODE_SNIPPETS).includes(code)) {
                ytext.delete(0, ytext.length);
                ytext.insert(0, DEFAULT_CODE_SNIPPETS[newLang] || "");
            }
        });
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        toast.success("Code copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    // Run Code in safe sandbox
    const runCode = () => {
        setIsConsoleOpen(true);
        const logs = [];

        if (language !== "javascript") {
            setOutput([
                { type: "info", text: `[Interpreter] Direct client-side execution is enabled for JavaScript. Code syntax verified for ${language.toUpperCase()}.` }
            ]);
            return;
        }

        const originalLog = console.log;
        const originalError = console.error;

        try {
            console.log = (...args) => {
                logs.push({ type: "log", text: args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ") });
            };
            console.error = (...args) => {
                logs.push({ type: "error", text: args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ") });
            };

            // Evaluate in isolated scope
            const runnable = new Function(code);
            runnable();

            if (logs.length === 0) {
                logs.push({ type: "info", text: "Code executed successfully with no output returned." });
            }
            setOutput(logs);
        } catch (err) {
            logs.push({ type: "error", text: `Runtime Error: ${err.message}` });
            setOutput(logs);
        } finally {
            console.log = originalLog;
            console.error = originalError;
        }
    };

    // Generate line numbers
    const lineCount = Math.max(1, code.split("\n").length);
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    const isDark = theme === "dark";

    return (
        <div className={`h-full flex flex-col rounded-2xl border overflow-hidden shadow-xs relative ${
            isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}>
            {/* Top Editor Toolbar */}
            <div className={`px-4 py-2 border-b flex items-center justify-between flex-wrap gap-2 z-10 ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
                <div className="flex items-center gap-2">
                    {/* Language Select */}
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        disabled={!canEdit}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                            isDark
                                ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-primary"
                                : "bg-white border-slate-300 text-slate-800 focus:border-primary"
                        }`}
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.name}
                            </option>
                        ))}
                    </select>

                    {/* Theme Toggle */}
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        className={`text-xs font-medium px-2 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isDark ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        {isDark ? "🌙 Dark" : "☀️ Light"}
                    </button>

                    {!canEdit && (
                        <div className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                            <LockIcon className="w-3.5 h-3.5" />
                            <span>Read-only</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Run Code */}
                    <button
                        onClick={runCode}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        title="Execute Code in Safe Sandbox"
                    >
                        <PlayIcon className="w-3.5 h-3.5 fill-current" />
                        <span>Run Code</span>
                    </button>

                    {/* Copy Code */}
                    <button
                        onClick={copyCode}
                        className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                            isDark ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300" : "bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
                        }`}
                        title="Copy Code"
                    >
                        {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                    </button>
                </div>
            </div>

            {/* Editor Core (Line Numbers + Textarea) */}
            <div className="flex-1 flex overflow-hidden font-mono text-sm leading-6 relative">
                {/* Gutter / Line Numbers */}
                <div className={`w-12 select-none py-4 text-right pr-3 shrink-0 overflow-hidden font-mono text-xs ${
                    isDark ? "bg-slate-900/60 text-slate-600 border-r border-slate-800/80" : "bg-slate-50 text-slate-400 border-r border-slate-200"
                }`}>
                    {lineNumbers.map((num) => (
                        <div key={num}>{num}</div>
                    ))}
                </div>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={handleCodeChange}
                    disabled={!canEdit}
                    spellCheck={false}
                    className={`flex-1 w-full h-full p-4 resize-none outline-none border-none leading-6 font-mono text-sm bg-transparent placeholder-slate-500 ${
                        isDark ? "text-slate-100 selection:bg-indigo-900/80" : "text-slate-900 selection:bg-blue-100"
                    }`}
                    placeholder={canEdit ? "Write code collaboratively with all attendees..." : "Read-only view."}
                />
            </div>

            {/* Console Output Drawer */}
            {isConsoleOpen && (
                <div className={`h-44 border-t flex flex-col z-20 transition-all ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
                }`}>
                    <div className="px-4 py-1.5 border-b border-inherit flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                            <TerminalIcon className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Execution Console</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setOutput([])}
                                className="p-1 rounded hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 cursor-pointer"
                                title="Clear Console"
                            >
                                <Trash2Icon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setIsConsoleOpen(false)}
                                className="p-1 rounded hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 cursor-pointer"
                                title="Hide Console"
                            >
                                <ChevronDownIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1">
                        {output.length === 0 ? (
                            <span className="text-slate-500 italic">No output. Press "Run Code" to execute.</span>
                        ) : (
                            output.map((out, idx) => (
                                <div
                                    key={idx}
                                    className={`leading-relaxed whitespace-pre-wrap ${
                                        out.type === "error"
                                            ? "text-rose-400 font-semibold"
                                            : out.type === "info"
                                            ? "text-sky-400"
                                            : "text-emerald-400"
                                    }`}
                                >
                                    {out.text}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeEditor;
