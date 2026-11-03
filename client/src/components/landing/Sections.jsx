import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/react'
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent, useVelocity, useSpring, useReducedMotion } from 'framer-motion'
import { Check, X, ArrowRight, ShieldCheck, History, Wifi, Lock, CloudUpload, Server, ChevronLeft, ChevronRight, Video, FileText, PenTool, Code2 } from 'lucide-react'
import { Words, Reveal, Tilt3D, CountUp, Eyebrow, EASE } from '../ui/motion'
import { Btn } from './Hero'

const Stage3D = lazy(() => import('../three/Stage3D'))
const wrap = 'mx-auto max-w-7xl px-5'

function Head({ kicker, title, body, center }) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <Reveal y={16}><Eyebrow>{kicker}</Eyebrow></Reveal>
      <h2 className="text-[clamp(34px,4.6vw,62px)] font-semibold leading-[1.02] tracking-[-0.04em] text-ink"><Words text={title} /></h2>
      {body && <Reveal delay={0.2} y={16}><p className="mt-5 text-[17.5px] leading-relaxed text-muted">{body}</p></Reveal>}
    </div>
  )
}

/* ───── Marquee that skews with scroll speed ───── */
const WORDS = ['Peer-to-peer video', 'Shared notes', 'Live whiteboard', 'Code editor', 'Role-based access', 'Version history', 'Offline recovery']
export function Marquee() {
  const { scrollY } = useScroll()
  const v = useSpring(useVelocity(scrollY), { stiffness: 120, damping: 30 })
  const skewX = useTransform(v, [-3000, 3000], [-6, 6])
  const row = WORDS.concat(WORDS)
  return (
    <motion.div style={{ skewX }} className="overflow-hidden bg-ink py-5" aria-hidden>
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap font-display text-3xl font-light text-white/90 sm:text-5xl">
        {row.concat(row).map((w, i) => <span key={i} className="flex items-center gap-10">{w}<i className="h-2 w-2 rounded-full bg-[#8b8bff]" /></span>)}
      </div>
    </motion.div>
  )
}

/* ───── Key metrics ───── */
export function Metrics() {
  const items = [[0, '', 'Servers in the media path', 'Video flows browser to browser'], [100, '', 'Participants per room', 'On the Pro plan'], [30, '', 'Free meetings a month', 'No credit card needed'], [3, '', 'Roles with real permissions', 'Host, editor and viewer']]
  return (
    <section className="py-28 sm:py-36">
      <div className={`${wrap} grid gap-5 sm:grid-cols-2 lg:grid-cols-4`} style={{ perspective: 1200 }}>
        {items.map(([n, s, t, d], i) => (
          <Reveal key={t} delay={i * 0.08}><Tilt3D><div className="soft-card h-full p-7">
            <div className="font-display text-7xl font-light tracking-[-0.05em] text-primary"><CountUp to={n} suffix={s} /></div>
            <p className="mt-4 text-[17px] font-semibold text-ink">{t}</p><p className="mt-1 text-[14.5px] text-muted">{d}</p>
          </div></Tilt3D></Reveal>
        ))}
      </div>
    </section>
  )
}

/* ───── How it works: Scroll-pinned horizontal card slider ───── */
const STEPS = [
  {
    num: '01',
    tag: 'STEP 1 · INSTANT SETUP',
    title: 'Create a room',
    desc: 'One click gives you an encrypted room with a unique code. Keep it public for open team sessions, or private with role-based permissions.',
    img: 'meeting',
    bullets: ['Instant 1-click room creation', 'Public or private access control', 'No downloads or software required'],
  },
  {
    num: '02',
    tag: 'STEP 2 · ONE-CLICK JOIN',
    title: 'Share the code',
    desc: 'Send the 6-character room code or invite link. Team members join directly from Chrome, Safari, Edge, or mobile browsers with automatic peer discovery.',
    img: 'notes',
    bullets: ['6-character join code or direct URL', 'Seamless peer-to-peer WebRTC connection', 'Works on desktop, tablet, and mobile'],
  },
  {
    num: '03',
    tag: 'STEP 3 · REAL-TIME WORKSPACE',
    title: 'Meet and build together',
    desc: 'Talk face-to-face with crystal-clear audio and video while collaborating on live markdown notes, an infinite whiteboard, and synchronized code.',
    img: 'board',
    bullets: ['Synced notes with version history', 'Interactive multi-user whiteboard', 'Live code editor with colored remote cursors'],
  },
]

export function HowItWorks() {
  const ref = useRef(null)
  const track = useRef(null)
  const reduce = useReducedMotion()
  const [dist, setDist] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  // Measure the exact distance the track needs to slide to bring the last card into full view
  useEffect(() => {
    const calc = () => {
      if (!track.current) return
      const maxScroll = track.current.scrollWidth - window.innerWidth + 80
      setDist(Math.max(0, maxScroll))
    }
    calc()
    window.addEventListener('resize', calc)
    const t = setTimeout(calc, 300)
    return () => {
      window.removeEventListener('resize', calc)
      clearTimeout(t)
    }
  }, [])

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  // Smooth translation: finishes at 0.88 so the 3rd card rests cleanly before unpinning
  const x = useTransform(scrollYProgress, [0, 0.88], [0, -dist])

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const step = Math.min(2, Math.max(0, Math.round(v * 2.3)))
    setCurrentStep(step)
  })

  return (
    <section
      id="how"
      ref={ref}
      className="relative mt-2 sm:mt-4"
      style={{ height: reduce ? 'auto' : '230vh' }}
    >
      <div
        className={`${
          reduce ? '' : 'sticky top-0 h-screen'
        } flex flex-col justify-center overflow-hidden pt-10 sm:pt-12 pb-16 sm:pb-20`}
      >
        <div className={`${wrap} mb-6 sm:mb-8 w-full shrink-0`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Head kicker="HOW IT WORKS" title="From idea to meeting in three steps." />
            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-4 py-1.5 font-mono text-xs font-semibold text-muted shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                SCROLL TO EXPLORE · 0{currentStep + 1} / 03
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal Card Track */}
        <motion.div
          ref={track}
          style={reduce ? undefined : { x }}
          className="flex w-max gap-8 px-[6vw]"
        >
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="soft-card grid w-[88vw] shrink-0 items-center gap-6 overflow-hidden p-6 sm:p-8 md:w-[68vw] md:grid-cols-[0.95fr_1.05fr] md:gap-8 lg:w-[60vw] max-w-[860px]"
            >
              <div>
                <span className="font-display text-5xl sm:text-6xl lg:text-7xl font-extralight leading-none tracking-[-0.05em] text-primary/25">
                  {s.num}
                </span>
                <p className="mt-1 font-mono text-xs font-semibold tracking-wider text-primary">
                  {s.tag}
                </p>
                <h3 className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
                  {s.title}
                </h3>
                <p className="mt-2.5 max-w-md text-[14.5px] sm:text-[15.5px] leading-relaxed text-muted">
                  {s.desc}
                </p>
                <ul className="mt-4 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-[13.5px] sm:text-[14px] font-medium text-ink/80">
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <Check size={12} strokeWidth={2.5} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ perspective: 1100 }} className="relative flex items-center justify-center">
                <div aria-hidden className="absolute -inset-4 rounded-3xl bg-primary/10 blur-2xl" />
                <img
                  src={`/screens/${s.img}.webp`}
                  alt={s.title}
                  loading="lazy"
                  className="relative max-h-[280px] sm:max-h-[320px] w-full rounded-2xl border border-line bg-white object-contain shadow-[0_30px_60px_-25px_rgba(79,70,229,0.5)] [transform:rotateY(-12deg)_rotateX(5deg)]"
                />
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ───── Tour: Scroll-driven 3D laptop workspace tour ───── */
const TOUR = [
  {
    id: 'meeting',
    title: 'Video room',
    tag: 'PEER-TO-PEER WEBRTC',
    desc: 'Crystal-clear video mesh streaming directly between participants with zero media servers in the middle and automatic audio-only fallback.',
    badge: 'HD Mesh Video',
    Icon: Video,
  },
  {
    id: 'notes',
    title: 'Shared notes',
    tag: 'LIVE COLLABORATION',
    desc: 'Rich-text markdown workspace where everyone can type simultaneously, create checklists, format code snippets, and save named snapshots.',
    badge: 'Auto-saved to Cloud',
    Icon: FileText,
  },
  {
    id: 'board',
    title: 'Whiteboard',
    tag: 'INFINITE CANVAS',
    desc: 'Draw fluidly with pens, highlight ideas with shapes and arrows, and drop sticky notes. Every stroke synchronizes across all screens in milliseconds.',
    badge: 'Real-time Vector Sync',
    Icon: PenTool,
  },
  {
    id: 'code',
    title: 'Code editor',
    tag: 'MULTI-LANGUAGE',
    desc: 'Pair program with live remote cursors, syntax highlighting across languages, and server-enforced role permissions.',
    badge: 'Live Colored Cursors',
    Icon: Code2,
  },
]

export function Tour() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const [idx, setIdx] = useState(0)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  // Advance tool one by one as the user scrolls down through the section
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const nextIdx = Math.min(3, Math.max(0, Math.floor(v * 3.99)))
    setIdx(nextIdx)
  })

  const current = TOUR[idx]

  return (
    <section
      id="tour"
      ref={ref}
      className="relative bg-white"
      style={{ height: reduce ? 'auto' : '260vh' }}
    >
      <div className={`${reduce ? '' : 'sticky top-0 h-screen'} flex flex-col justify-center overflow-hidden pt-16 sm:pt-20 pb-8 sm:pb-10`}>
        <div className={`${wrap} grid w-full items-center gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12`}>
          <div className="relative z-10 flex flex-col justify-center">
            <Eyebrow>PRODUCT TOUR · 0{idx + 1} / 04</Eyebrow>
            <h2 className="text-[clamp(32px,4vw,52px)] font-semibold leading-[1.04] tracking-[-0.04em] text-ink">
              One room.<br />Four ways to work.
            </h2>
            <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-muted">
              Scroll down to explore each tool, or click directly to jump.
            </p>

            {/* Interactive Feature List (syncs with scroll) */}
            <ul className="mt-6 space-y-2">
              {TOUR.map((item, i) => {
                const isActive = i === idx
                const ItemIcon = item.Icon
                return (
                  <li
                    key={item.id}
                    onClick={() => setIdx(i)}
                    className={`shrink-0 cursor-pointer rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 ${isActive
                        ? 'border-primary-border bg-primary-light shadow-[0_16px_35px_-20px_rgba(79,70,229,0.5)]'
                        : 'border-transparent bg-white/60 opacity-60 hover:opacity-100 hover:border-line'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${isActive
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-primary-light text-primary'
                            }`}
                        >
                          <ItemIcon size={16} />
                        </span>
                        <p className="font-display text-base font-semibold text-ink sm:text-lg">
                          {item.title}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${isActive
                            ? 'bg-primary/15 text-primary'
                            : 'bg-canvas text-muted'
                          }`}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="overflow-hidden pt-2 text-[14px] leading-relaxed text-muted"
                        >
                          {item.desc}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </li>
                )
              })}
            </ul>

            {/* Step indicator bar */}
            <div className="mt-5 flex items-center gap-2">
              {TOUR.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${i === idx ? 'w-8 bg-primary' : 'w-2 bg-line'
                    }`}
                />
              ))}
              <span className="ml-3 font-mono text-xs text-muted">
                Step 0{idx + 1} of 04 · Scroll to cycle
              </span>
            </div>
          </div>

          {/* 3D Laptop Preview */}
          <div className="relative flex flex-col items-center">
            <div className="relative h-[340px] w-full sm:h-[420px] lg:h-[480px]">
              <div
                aria-hidden
                className="absolute inset-x-8 top-1/4 h-2/3 rounded-full bg-primary/15 blur-[90px]"
              />
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center">
                    <img
                      src={`/screens/${current.id}.webp`}
                      alt={current.title}
                      className="max-h-[80%] rounded-xl shadow-lg"
                    />
                  </div>
                }
              >
                <Stage3D scene="tour" index={idx} className="absolute inset-0" />
              </Suspense>
            </div>
            <p className="pointer-events-none font-mono text-[11px] text-muted/70">
              Interactive 3D model · Screen & angle update on scroll
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───── Bento ───── */
const BENTO = [
  ['Roles that are enforced', 'Every socket event is checked on the server. A viewer’s edit is rejected, not just hidden.', ShieldCheck, 'lg:col-span-2'],
  ['Works offline', 'Edits queue locally and sync when you reconnect.', Wifi, ''],
  ['Version history', 'Name snapshots and restore any of them in one click.', History, ''],
  ['Private rooms', 'Only invited people can enter a private meeting.', Lock, ''],
  ['Saved to the cloud', 'Notes, boards and code are stored in PostgreSQL, so nothing is lost when the call ends.', CloudUpload, 'lg:col-span-2'],
  ['Network friendly', 'Configure STUN and TURN servers for strict corporate networks.', Server, ''],
]
export function Bento() {
  return (
    <section className="mt-20 sm:mt-28 py-28 sm:py-36">
      <div className={wrap}>
        <Head kicker="BUILT FOR REAL WORK" title="The details teams actually need." />
        <div className="mt-14 grid gap-5 lg:grid-cols-4" style={{ perspective: 1300 }}>
          {BENTO.map(([t, d, Icon, span], i) => (
            <Reveal key={t} delay={(i % 4) * 0.08} className={span}><Tilt3D className="h-full"><div className="soft-card flex h-full min-h-[210px] flex-col justify-between p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary"><Icon size={22} /></span>
              <div><h3 className="mt-8 text-2xl font-semibold tracking-tight text-ink">{t}</h3><p className="mt-2 text-[15px] leading-relaxed text-muted">{d}</p></div>
            </div></Tilt3D></Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───── Pricing ───── */
const PLANS = [
  { name: 'Free', price: 0, tag: 'Standard', desc: 'For quick meetings and small team check-ins.', feat: ['30 meetings per month', 'Up to 10 participants', 'In-call persistent messaging', 'Notes, whiteboard and code'] },
  { name: 'Enterprise Pro', price: 19, tag: 'Unlimited', hot: true, desc: 'Scale without limits for growing companies.', feat: ['Unlimited meetings', 'Up to 100 participants', 'Full meeting session history', 'Notes, whiteboard and code'] },
]
export function Pricing() {
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  return (
    <section id="pricing" className="mt-20 sm:mt-28 bg-white py-28 sm:py-36">
      <div className="mx-auto max-w-4xl px-5">
        <Head center kicker="PRICING" title="Simple pricing that grows with you." />
        <div className="mt-14 grid items-stretch gap-6 md:grid-cols-2" style={{ perspective: 1300 }}>
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1} className="h-full"><Tilt3D className="h-full"><div className={`relative flex h-full flex-col rounded-3xl p-9 ${p.hot ? 'bg-ink text-white shadow-[0_40px_80px_-30px_rgba(30,27,75,0.8)]' : 'soft-card'}`}>
              <div className="flex items-center justify-between"><span className="font-display text-xl font-semibold">{p.name}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.hot ? 'bg-[#8b8bff] text-ink' : 'bg-primary-light text-primary'}`}>{p.tag}</span></div>
              <p className={`mt-2 text-sm ${p.hot ? 'text-white/60' : 'text-muted'}`}>{p.desc}</p>
              <div className="mt-6 font-display text-7xl font-light tracking-[-0.05em]">${p.price}<span className={`ml-1 text-base ${p.hot ? 'text-white/50' : 'text-muted'}`}>/ month</span></div>
              <ul className="mt-8 flex-1 space-y-3.5 text-[15.5px]">{p.feat.map((f) => <li key={f} className="flex items-center gap-3"><Check size={17} className={p.hot ? 'text-[#8b8bff]' : 'text-accent'} />{f}</li>)}</ul>
              <div className="mt-9">{isSignedIn ? <Btn to={p.hot ? '/pricing' : '/dashboard'} variant={p.hot ? 'solid' : 'ghost'} className="w-full">{p.hot ? 'Upgrade to Pro' : 'Open dashboard'}</Btn> : <Btn onClick={() => openSignUp()} variant={p.hot ? 'solid' : 'ghost'} className="w-full">{p.hot ? 'Start with Pro' : 'Start free'}</Btn>}</div>
            </div></Tilt3D></Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───── FAQ ───── */
const FAQS = [
  ['Do I need to install anything?', 'No. MeetUp runs in the browser using WebRTC, so a modern browser and a camera or microphone are all you need. If a camera is blocked, it falls back to audio only.'],
  ['Can I keep a meeting private?', 'Yes. Mark a room private so only invited users can enter, or keep it open with a default role for newcomers.'],
  ['Who can edit the notes and whiteboard?', 'Hosts and editors can edit. Viewers get live read-only access, and the server rejects any edit they attempt.'],
  ['What if my connection drops?', 'Edits you make offline are queued and synced when you reconnect. A status badge shows Saved, Syncing or Offline.'],
  ['Can I restore an earlier version?', 'Yes. Create named snapshots of the notes and restore any of them with one click.'],
  ['Does it work on strict networks?', 'You can configure STUN and TURN servers for your environment, so calls can relay when direct connections are blocked.'],
]
export function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="mt-20 sm:mt-28 py-28 sm:py-36">
      <div className="mx-auto max-w-3xl px-5">
        <Head center kicker="FAQ" title="Questions, answered." />
        <div className="mt-12 space-y-3">
          {FAQS.map(([q, a], i) => (
            <Reveal key={q} delay={i * 0.04} y={20}><div className="soft-card overflow-hidden !rounded-2xl">
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full cursor-pointer items-center justify-between gap-6 px-6 py-5 text-left">
                <span className="font-display text-lg font-medium text-ink">{q}</span>
                <motion.span animate={{ rotate: open === i ? 45 : 0 }} className="text-2xl font-light text-primary">+</motion.span>
              </button>
              <AnimatePresence initial={false}>{open === i && <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden"><p className="px-6 pb-6 text-[15.5px] leading-relaxed text-muted">{a}</p></motion.div>}</AnimatePresence>
            </div></Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───── Closing CTA with the robot host ───── */
export function CTA() {
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  return (
    <section className="mt-20 sm:mt-28 px-4 pb-28 sm:pb-36">
      <div className="relative mx-auto grid max-w-7xl items-center overflow-hidden rounded-[2.5rem] bg-ink px-8 py-16 md:grid-cols-2 md:px-16">
        <div aria-hidden className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/40 blur-[100px]" />
        <div className="relative z-10">
          <h2 className="text-[clamp(38px,5vw,70px)] font-semibold leading-[1] tracking-[-0.04em] text-white"><Words text="Say hello to your next meeting." /></h2>
          <Reveal delay={0.2} y={16}><p className="mt-5 max-w-md text-[17px] text-white/65">Create a room in seconds and invite your team. The free plan is waiting.</p></Reveal>
          <div className="mt-9 flex flex-wrap gap-3">{isSignedIn ? <Btn to="/dashboard">Open dashboard <ArrowRight size={17} /></Btn> : <Btn onClick={() => openSignUp()}>Start free <ArrowRight size={17} /></Btn>}</div>
        </div>
        <div className="relative z-10 h-[360px] md:h-[440px]"><Suspense fallback={null}><Stage3D scene="robot" className="absolute inset-0" /></Suspense></div>
      </div>
    </section>
  )
}

export function SiteFooter() {
  const { isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  return (
    <footer className="border-t border-line bg-white px-5 py-14">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 md:flex-row">
        <div><p className="flex items-center gap-2 font-display text-2xl font-semibold text-ink"><img src="/logo.svg" alt="" width={26} height={26} />MeetUp<span className="text-primary">.</span></p><p className="mt-3 max-w-xs text-sm text-muted">Real-time video meetings with a shared workspace built in.</p></div>
        <div className="grid grid-cols-2 gap-14 text-sm">
          <div><p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-muted">PRODUCT</p><ul className="space-y-2 text-ink/80"><li><a href="#how" className="hover:text-primary">How it works</a></li><li><a href="#tour" className="hover:text-primary">Tour</a></li><li><a href="#pricing" className="hover:text-primary">Pricing</a></li></ul></div>
          <div><p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-muted">ACCOUNT</p><ul className="space-y-2 text-ink/80">{isSignedIn ? <li><Link to="/dashboard" className="hover:text-primary">Dashboard</Link></li> : <li><button onClick={() => openSignIn()} className="cursor-pointer hover:text-primary">Sign in</button></li>}</ul></div>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-7xl font-mono text-[11px] text-muted/70">© {new Date().getFullYear()} MeetUp · 3D robot model by Tomás Laulhé (CC0)</p>
    </footer>
  )
}
