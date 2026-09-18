import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/react'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  Users,
  PhoneOff,
  ShieldCheck,
  Cpu,
  Zap,
  Database,
  Lock,
  Server,
  Layers,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Code2,
  Activity,
  Terminal,
  Send,
  Radio,
  Clock,
  Check,
  Workflow,
  KeyRound,
  ChevronDown
} from 'lucide-react'

const Landing = () => {
  const { isSignedIn, user } = useUser()
  const { openSignIn, openSignUp } = useClerk()

  // State for Interactive Meeting Simulator
  const [simulatorMic, setSimulatorMic] = useState(true)
  const [simulatorVideo, setSimulatorVideo] = useState(true)
  const [simulatorChatOpen, setSimulatorChatOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('signaling')
  const [simMessages, setSimMessages] = useState([
    { sender: 'Sarah Chen', role: 'Staff Frontend Lead', text: 'P2P mesh video stream quality is crystal clear at 60fps!', time: '10:01 AM' },
    { sender: 'Marcus Vance', role: 'DevOps Architect', text: 'ICE negotiation latency is under 38ms. Zero media server relay cost.', time: '10:02 AM' },
    { sender: 'Elena Rostova', role: 'Engineering Director', text: 'Hiring managers can test the real-time controls below directly!', time: '10:03 AM' }
  ])
  const [newSimMsg, setNewSimMsg] = useState('')
  const [activeSpeaker, setActiveSpeaker] = useState(0)

  // Speaker simulation loop
  useEffect(() => {
    const speakerInterval = setInterval(() => {
      setActiveSpeaker(prev => (prev + 1) % 4)
    }, 4000)
    return () => clearInterval(speakerInterval)
  }, [])

  const handleSendSimMessage = (e) => {
    e.preventDefault()
    if (!newSimMsg.trim()) return
    const msg = {
      sender: user?.fullName || 'Hiring Manager (You)',
      role: 'Interviewer',
      text: newSimMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setSimMessages(prev => [...prev, msg])
    setNewSimMsg('')
  }

  const participants = [
    {
      name: user?.fullName || 'Alex Rivera (You)',
      role: 'Full-Stack Candidate',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      isLocal: true,
      muted: !simulatorMic,
      videoOff: !simulatorVideo
    },
    {
      name: 'Sarah Chen',
      role: 'Staff Frontend Lead',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
      isLocal: false,
      muted: false,
      videoOff: false
    },
    {
      name: 'Marcus Vance',
      role: 'Backend Architect',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      isLocal: false,
      muted: true,
      videoOff: false
    },
    {
      name: 'Elena Rostova',
      role: 'Engineering Director',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      isLocal: false,
      muted: false,
      videoOff: false
    }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#5452EC]/15 selection:text-[#5452EC] font-sans relative overflow-x-hidden">
      {/* Background Pastel Gradients matching the image exactly */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft Cream / Warm Pastel Yellow on Top-Left */}
        <div className="absolute -top-32 -left-32 w-[620px] h-[620px] bg-[#FEF9C3]/75 rounded-full blur-[110px]" />
        {/* Soft Lavender / Pastel Violet on Top-Right */}
        <div className="absolute -top-20 -right-24 w-[680px] h-[680px] bg-[#EDE9FE]/85 rounded-full blur-[120px]" />
        {/* Gentle Sky / Pastel Glow along middle right */}
        <div className="absolute top-[850px] -right-32 w-[600px] h-[600px] bg-[#E0E7FF]/60 rounded-full blur-[130px]" />
        {/* Soft Mint / Pastel Glow along middle left */}
        <div className="absolute top-[1600px] -left-32 w-[550px] h-[550px] bg-[#F3F4F6]/80 rounded-full blur-[120px]" />
      </div>

      {/* Main Navigation Bar */}
      <header className="relative z-30 w-full bg-white/70 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo with our app icon */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.svg" alt="MeetUp Logo" className="size-8" />
            <span className="text-2xl font-bold tracking-tight text-slate-900 flex items-center">
              MeetUp<span className="text-[#5452EC]">.</span>
            </span>
          </Link>

          {/* Centered Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/" className="text-slate-900 hover:text-[#5452EC] transition-colors">Home</Link>
            <a href="#features" className="hover:text-[#5452EC] transition-colors flex items-center gap-1">
              Features
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </a>
            <a href="#interactive-demo" className="hover:text-[#5452EC] transition-colors">Live Sandbox</a>
            <a href="#architecture" className="hover:text-[#5452EC] transition-colors">Architecture</a>
            <a href="#pricing" className="hover:text-[#5452EC] transition-colors">Pricing</a>
            <a href="#engineering" className="hover:text-[#5452EC] transition-colors">Engineering</a>
          </nav>

          {/* Right Action Button matching 'Sign Up' button in screenshot */}
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-[#5452EC] hover:bg-[#4542DB] text-white font-medium text-sm px-6 py-2.5 rounded-full shadow-md shadow-[#5452EC]/20 transition-all cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => openSignUp()}
                className="inline-flex items-center justify-center bg-[#5452EC] hover:bg-[#4542DB] text-white font-medium text-sm px-6 py-2.5 rounded-full shadow-md shadow-[#5452EC]/20 transition-all cursor-pointer"
              >
                Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 sm:pt-20 pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        {/* Overlapping Avatars Pill Badge matching screenshot */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 text-xs sm:text-sm font-normal text-slate-700 mb-8 shadow-xs backdrop-blur-sm">
          <div className="flex -space-x-2 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"
              alt="Avatar 1"
              className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80"
              alt="Avatar 2"
              className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80"
              alt="Avatar 3"
              className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
            />
          </div>
          <span className="font-normal text-slate-700">Join community of 1m+ founders &amp; engineers</span>
        </div>

        {/* Hero Headline matching typography in screenshot */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-950 max-w-4xl mx-auto leading-[1.15] mb-6">
          Build, Launch &amp; Scale with{' '}
          <span className="text-[#5452EC]">MeetUp.</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
          A high-performance, real-time WebRTC video conferencing platform powered by Socket.IO and Neon PostgreSQL that helps you connect instantly and scale without limits.
        </p>

        {/* Primary Action Button matching 'get started for free ->' */}
        <div className="flex flex-col items-center justify-center gap-4 mb-14">
          {isSignedIn ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-[#5452EC] hover:bg-[#4542DB] text-white font-medium text-sm sm:text-base px-8 py-3.5 rounded-full shadow-lg shadow-[#5452EC]/25 hover:shadow-[#5452EC]/40 transition-all cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={() => openSignUp()}
              className="inline-flex items-center justify-center gap-2 bg-[#5452EC] hover:bg-[#4542DB] text-white font-medium text-sm sm:text-base px-8 py-3.5 rounded-full shadow-lg shadow-[#5452EC]/25 hover:shadow-[#5452EC]/40 transition-all cursor-pointer"
            >
              <span>get started for free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 'Trusting by leading brands, including —' section */}
        <div className="pt-4 border-t border-slate-200/60 max-w-3xl mx-auto">
          <p className="text-xs sm:text-sm text-slate-500 font-medium mb-6">
            Trusting by leading brands, including —
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all">
            <span className="font-bold text-lg tracking-tight text-slate-800">Instagram</span>
            <span className="font-bold text-lg tracking-tight text-slate-800">Microsoft</span>
            <span className="font-bold text-lg tracking-tight text-slate-800">Huawei</span>
            <span className="font-bold text-lg tracking-tight text-slate-800">Walmart</span>
            <span className="font-bold text-lg tracking-tight text-slate-800">WebRTC</span>
            <span className="font-bold text-lg tracking-tight text-slate-800">Socket.IO</span>
          </div>
        </div>
      </section>

      {/* Interactive Meeting Room Sandbox (Light Mode Theme) */}
      <section id="interactive-demo" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5452EC]/10 text-xs font-semibold text-[#5452EC] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Live Recruiter Simulator
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Experience The WebRTC Call Architecture
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Test the live audio/video toggle states, active speaker waveforms, and synchronized chat below.
          </p>
        </div>

        {/* Clean Light-Mode Simulator Card Frame */}
        <div className="rounded-3xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-200/50 overflow-hidden backdrop-blur-xl">
          {/* Header Bar */}
          <div className="bg-slate-50/80 px-4 sm:px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-slate-700 font-medium">Room Code: <span className="text-[#5452EC] font-semibold">eng-live-demo</span></span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[10px] border border-emerald-200 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                Mesh Connected
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-slate-500 font-mono text-[11px]">
              <span className="flex items-center gap-1 text-slate-700">
                <Activity className="w-3.5 h-3.5 text-[#5452EC]" />
                RTT: 38ms
              </span>
              <span>Codec: VP8 / Opus</span>
              <span>STUN: Connected</span>
            </div>
          </div>

          {/* Video Grid & Chat Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px] relative bg-slate-50/40">
            {/* Video Grid */}
            <div className={`${simulatorChatOpen ? 'lg:col-span-8' : 'lg:col-span-12'} p-4 sm:p-6 transition-all duration-300 flex flex-col justify-between`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {participants.map((p, idx) => {
                  const isSpeaking = activeSpeaker === idx && !p.muted
                  return (
                    <div
                      key={p.name}
                      className={`relative rounded-2xl overflow-hidden bg-white border transition-all aspect-video flex items-center justify-center shadow-xs ${
                        isSpeaking
                          ? 'border-[#5452EC] ring-2 ring-[#5452EC]/30 shadow-md shadow-[#5452EC]/10'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {p.videoOff ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-14 h-14 rounded-full border-2 border-slate-200 object-cover"
                          />
                          <span className="text-xs text-slate-500 font-mono">Camera Off</span>
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
                        </div>
                      )}

                      {/* Participant Label & Audio State */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs backdrop-blur-md bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-slate-900 truncate">{p.name}</span>
                          <span className="text-[10px] text-slate-500 hidden sm:inline">({p.role})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isSpeaking && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#5452EC]/10 text-[#5452EC] text-[10px] font-mono">
                              <span className="w-1 h-2 bg-[#5452EC] rounded-full animate-bounce"></span>
                              <span className="w-1 h-3 bg-[#5452EC] rounded-full animate-bounce [animation-delay:0.1s]"></span>
                              <span className="w-1 h-2 bg-[#5452EC] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                              <span className="ml-1">Speaking</span>
                            </span>
                          )}
                          <div className={`p-1 rounded-md ${p.muted ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
                            {p.muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* In-Call Controls */}
              <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-center gap-3">
                <button
                  onClick={() => setSimulatorMic(prev => !prev)}
                  className={`px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                    simulatorMic
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      : 'bg-rose-600 text-white shadow-sm'
                  }`}
                >
                  {simulatorMic ? <Mic className="w-4 h-4 text-emerald-600" /> : <MicOff className="w-4 h-4" />}
                  <span>{simulatorMic ? 'Mute' : 'Unmuted'}</span>
                </button>

                <button
                  onClick={() => setSimulatorVideo(prev => !prev)}
                  className={`px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                    simulatorVideo
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      : 'bg-rose-600 text-white shadow-sm'
                  }`}
                >
                  {simulatorVideo ? <Video className="w-4 h-4 text-[#5452EC]" /> : <VideoOff className="w-4 h-4" />}
                  <span>{simulatorVideo ? 'Stop Video' : 'Start Video'}</span>
                </button>

                <button
                  onClick={() => setSimulatorChatOpen(prev => !prev)}
                  className={`px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                    simulatorChatOpen
                      ? 'bg-[#5452EC] text-white shadow-md shadow-[#5452EC]/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#5452EC] text-white text-[10px]">
                    {simMessages.length}
                  </span>
                </button>

                {isSignedIn ? (
                  <Link
                    to="/dashboard"
                    className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Leave</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => openSignUp()}
                    className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Leave</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chat Drawer */}
            {simulatorChatOpen && (
              <div className="lg:col-span-4 border-l border-slate-200 bg-white flex flex-col justify-between p-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#5452EC]" />
                      <span className="text-sm font-semibold text-slate-900">In-Call Messages</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Sync Active
                    </span>
                  </div>

                  <div className="space-y-2.5 mt-4 max-h-[320px] overflow-y-auto pr-1">
                    {simMessages.map((m, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#5452EC]">{m.sender}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{m.time}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{m.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSendSimMessage} className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="text"
                    value={newSimMsg}
                    onChange={(e) => setNewSimMsg(e.target.value)}
                    placeholder="Send a test message..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5452EC]"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#5452EC] hover:bg-[#4542DB] text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recruiter & Hiring Manager Engineering Highlights */}
      <section id="engineering" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5452EC]/10 text-xs font-semibold text-[#5452EC] mb-3">
            <Cpu className="w-3.5 h-3.5" />
            Engineering Deep-Dive
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            How The Architecture Was Solved
          </h2>
          <p className="text-slate-600 text-base mt-3">
            Key engineering systems implemented to achieve sub-millisecond signaling, zero media relay cost, and data consistency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-[#5452EC]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5452EC]/10 text-[#5452EC] flex items-center justify-center mb-5 font-bold">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">1. WebRTC Full-Mesh Protocol</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Custom React hook (<code className="text-[#5452EC] bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">useWebRTC</code>) managing multi-peer <code className="text-[#5452EC] bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">RTCPeerConnection</code> instances. Handles trickle ICE candidacy and track transceivers without renegotiation interruptions.
            </p>
            <div className="space-y-1.5 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                STUN candidate exchange via Google STUN servers
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Direct P2P audio &amp; video track transceiver toggles
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-[#5452EC]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5452EC]/10 text-[#5452EC] flex items-center justify-center mb-5 font-bold">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">2. Low-Overhead Socket Signaling</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Engineered room topology handlers in Express 5 &amp; Socket.IO (<code className="text-[#5452EC] bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">socket.js</code>). Routes bidirectional SDP handshakes and targeted ICE queues with sub-millisecond turnaround.
            </p>
            <div className="space-y-1.5 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Targeted peer socket emissions (<code className="text-[#5452EC]">socket.to(id).emit</code>)
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Real-time in-call chat persistence into PostgreSQL
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-[#5452EC]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5452EC]/10 text-[#5452EC] flex items-center justify-center mb-5 font-bold">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">3. Self-Healing Auth &amp; Database Sync</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Neon serverless PostgreSQL models meetings, participants, and chat logs. Includes an <strong>Auto-Provisioning Fallback Middleware</strong> (<code className="text-[#5452EC] bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">auth.js</code>) that auto-creates missing user records if webhooks lag.
            </p>
            <div className="space-y-1.5 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Clerk SVIX webhook signature verification
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Zero-downtime auto-provisioning fallback mechanism
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-[#5452EC]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5452EC]/10 text-[#5452EC] flex items-center justify-center mb-5 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">4. SaaS Usage Metering &amp; RBAC</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Integrated Clerk authentication with server-enforced tier validation (Free 30 mtgs/mo vs. Premium Unlimited). Host RBAC ensures only room creators can terminate meetings for all participants.
            </p>
            <div className="space-y-1.5 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Host vs participant role delegation controls
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Monthly usage query dynamically enforced at controller level
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Architecture Blueprint */}
      <section id="architecture" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5452EC]/10 text-xs font-semibold text-[#5452EC] mb-3">
            <Workflow className="w-3.5 h-3.5" />
            System Design
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            System Design &amp; Schema Explorer
          </h2>
          <div className="flex items-center justify-center gap-2 mt-6 p-1 bg-slate-100 rounded-full max-w-xs mx-auto">
            <button
              onClick={() => setActiveTab('signaling')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'signaling'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Signaling Flow
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'database'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Database ERD
            </button>
          </div>
        </div>

        {activeTab === 'signaling' ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 font-mono text-xs shadow-xs max-w-4xl mx-auto">
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-[#5452EC]">1. Join Room</span>
                <span className="text-slate-600">Client emits <code className="text-[#5452EC]">join-room</code> &rarr; Server responds with peer roster (<code className="text-[#5452EC]">all-users</code>).</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-[#5452EC]">2. SDP Offer</span>
                <span className="text-slate-600">Initiator creates <code className="text-[#5452EC]">RTCPeerConnection</code> &rarr; relays local SDP offer to target socket ID.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-[#5452EC]">3. SDP Answer</span>
                <span className="text-slate-600">Peer sets remote description &rarr; generates and returns SDP answer via server relay.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-[#5452EC]">4. Direct P2P Media</span>
                <span className="text-slate-600">ICE candidates connected &rarr; media streams flow peer-to-peer with zero server bandwidth cost.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto font-mono text-xs">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="font-bold text-[#5452EC] border-b border-slate-100 pb-2 mb-2">users (PK: id)</div>
              <div className="text-slate-600 space-y-1 text-[11px]">
                <div>id (VARCHAR)</div>
                <div>name (VARCHAR)</div>
                <div>email (VARCHAR)</div>
                <div>plan (VARCHAR)</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="font-bold text-[#5452EC] border-b border-slate-100 pb-2 mb-2">meetings (FK: host)</div>
              <div className="text-slate-600 space-y-1 text-[11px]">
                <div>id (SERIAL PK)</div>
                <div>meeting_id (UQ)</div>
                <div>host_id (FK)</div>
                <div>status (VARCHAR)</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="font-bold text-[#5452EC] border-b border-slate-100 pb-2 mb-2">participants</div>
              <div className="text-slate-600 space-y-1 text-[11px]">
                <div>meeting_id (FK)</div>
                <div>user_id (FK)</div>
                <div>joined_at (TIME)</div>
                <div>left_at (TIME)</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="font-bold text-[#5452EC] border-b border-slate-100 pb-2 mb-2">messages</div>
              <div className="text-slate-600 space-y-1 text-[11px]">
                <div>meeting_id (FK)</div>
                <div>sender_name (TEXT)</div>
                <div>text (TEXT)</div>
                <div>timestamp (TIME)</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Feature Grid */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5452EC]/10 text-xs font-semibold text-[#5452EC] mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Capabilities
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Built For High Performance
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Every feature is engineered for responsiveness, low latency, and reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <Video className="w-6 h-6 text-[#5452EC] mb-3" />
            <h4 className="font-bold text-slate-900 mb-1">Instant 3-Part Room Codes</h4>
            <p className="text-slate-600 text-xs leading-relaxed">Generates standardized codes like <code className="text-[#5452EC]">abc-def-ghi</code> for easy sharing and secure access.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <MessageSquare className="w-6 h-6 text-[#5452EC] mb-3" />
            <h4 className="font-bold text-slate-900 mb-1">In-Meeting Persistent Chat</h4>
            <p className="text-slate-600 text-xs leading-relaxed">Real-time chat messages broadcast across peers and saved to PostgreSQL for post-session review.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <Clock className="w-6 h-6 text-[#5452EC] mb-3" />
            <h4 className="font-bold text-slate-900 mb-1">Session History &amp; Auditing</h4>
            <p className="text-slate-600 text-xs leading-relaxed">Detailed records of past calls, duration, participant lists, and saved transcripts.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section matching SaaS Model */}
      <section id="pricing" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5452EC]/10 text-xs font-semibold text-[#5452EC] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Plans
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Transparent Tier Pricing
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Integrated with Clerk Billing &amp; Stripe with server-side usage verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">Free Tier</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">Standard</span>
              </div>
              <p className="text-slate-500 text-xs mb-6">Ideal for quick meetings and small team check-ins.</p>
              <div className="text-3xl font-bold text-slate-900 mb-6">$0 <span className="text-xs font-normal text-slate-500">/ month</span></div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span><strong>30 meetings</strong> per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Up to <strong>10 participants</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>In-call persistent messaging</span>
                </li>
              </ul>
            </div>

            {isSignedIn ? (
              <Link
                to="/dashboard"
                className="mt-8 block text-center py-2.5 px-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium text-xs transition-all cursor-pointer"
              >
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={() => openSignUp()}
                className="mt-8 block w-full text-center py-2.5 px-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium text-xs transition-all cursor-pointer"
              >
                Get Started Free
              </button>
            )}
          </div>

          {/* Pro Tier */}
          <div className="p-8 rounded-3xl bg-white border-2 border-[#5452EC] shadow-lg shadow-[#5452EC]/10 flex flex-col justify-between relative">
            <div className="absolute -top-3 right-6 px-3 py-0.5 bg-[#5452EC] text-white text-[10px] font-bold uppercase rounded-full">
              Recommended
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">Enterprise Pro</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#5452EC]/10 text-[#5452EC] text-xs font-semibold">Unlimited</span>
              </div>
              <p className="text-slate-500 text-xs mb-6">Scale without restrictions for growing companies.</p>
              <div className="text-3xl font-bold text-slate-900 mb-6">$19 <span className="text-xs font-normal text-slate-500">/ month</span></div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5452EC]" />
                  <span><strong>Unlimited meetings</strong> (no caps)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5452EC]" />
                  <span>Up to <strong>100 participants</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5452EC]" />
                  <span>Full meeting session history</span>
                </li>
              </ul>
            </div>

            {isSignedIn ? (
              <Link
                to="/pricing"
                className="mt-8 block text-center py-2.5 px-6 rounded-full bg-[#5452EC] hover:bg-[#4542DB] text-white font-medium text-xs shadow-md shadow-[#5452EC]/20 transition-all cursor-pointer"
              >
                Upgrade to Pro
              </Link>
            ) : (
              <button
                onClick={() => openSignUp()}
                className="mt-8 block w-full text-center py-2.5 px-6 rounded-full bg-[#5452EC] hover:bg-[#4542DB] text-white font-medium text-xs shadow-md shadow-[#5452EC]/20 transition-all cursor-pointer"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="MeetUp Logo" className="size-6" />
            <span className="text-lg font-bold text-slate-900 flex items-center">
              MeetUp<span className="text-[#5452EC]">.</span>
            </span>
            <span className="text-xs text-slate-500 ml-2">Built with React 19, WebRTC, Socket.IO &amp; Neon DB</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-600 font-medium">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#architecture" className="hover:text-slate-900 transition-colors">Architecture</a>
            <a href="#engineering" className="hover:text-slate-900 transition-colors">Engineering</a>
            {isSignedIn ? (
              <Link to="/dashboard" className="hover:text-slate-900 transition-colors">Dashboard</Link>
            ) : (
              <button onClick={() => openSignIn()} className="hover:text-slate-900 transition-colors cursor-pointer">Sign In</button>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} MeetUp Video Conferencing. Engineered for Hiring Managers &amp; Recruiters.</p>
          <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
