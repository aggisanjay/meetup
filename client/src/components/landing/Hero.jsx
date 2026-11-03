import React, { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/react'
import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { Words, EASE } from '../ui/motion'

const Stage3D = lazy(() => import('../three/Stage3D'))

export function Btn({ children, onClick, to, variant = 'solid', className = '' }) {
  const base = `group inline-flex h-13 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${className}`
  const cls = variant === 'solid'
    ? `${base} bg-primary text-white shadow-[0_12px_30px_-10px_rgba(79,70,229,0.7)] hover:bg-primary-hover hover:shadow-[0_18px_40px_-10px_rgba(79,70,229,0.8)]`
    : `${base} border border-line bg-white text-ink hover:border-primary-border hover:bg-primary-light`
  if (to && to.startsWith('#')) return <a href={to} className={cls}>{children}</a>
  return to ? <Link to={to} className={cls}>{children}</Link> : <button onClick={onClick} className={cls}>{children}</button>
}

export default function Hero() {
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  return (
    <section className="grain relative isolate overflow-hidden pb-16 pt-36 lg:pt-44">
      <div aria-hidden className="absolute -left-40 top-10 -z-10 h-[520px] w-[520px] rounded-full bg-[#c7c9fb]/50 blur-[110px]" />
      <div aria-hidden className="absolute -right-32 top-40 -z-10 h-[460px] w-[460px] rounded-full bg-[#a7f3d0]/40 blur-[120px]" />
      <div className="mx-auto grid max-w-7xl items-center gap-4 px-5 lg:grid-cols-[0.82fr_1.28fr]">
        <div className="relative z-10 max-w-2xl">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 py-1.5 pl-1.5 pr-4 text-[13px] text-muted shadow-sm backdrop-blur">
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">LIVE</span>
            Video, notes, whiteboard and code in one room
          </motion.p>
          <h1 className="text-[clamp(42px,5.4vw,82px)] font-semibold leading-[0.98] tracking-[-0.045em] text-ink">
            <Words text="Meet like you're in the" inView={false} delay={0.1} />
            <span className="bg-gradient-to-r from-primary via-[#8b5cf6] to-[#0ea5e9] bg-clip-text text-transparent"><Words text="same room." inView={false} delay={0.55} /></span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.9 }} className="mt-7 max-w-md text-[18px] leading-relaxed text-muted">
            Crystal-clear peer-to-peer video with a shared workspace built in. Write notes, sketch on a whiteboard and code together, all inside the call.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 1.05 }} className="mt-9 flex flex-wrap items-center gap-3">
            {isSignedIn ? <Btn to="/dashboard">Open dashboard <ArrowRight size={17} /></Btn> : <Btn onClick={() => openSignUp()}>Start free <ArrowRight size={17} /></Btn>}
            <Btn to="#tour" variant="ghost"><Play size={15} className="fill-current" /> Take the tour</Btn>
          </motion.div>
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 1 }} className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-muted">
            {['Works in your browser', 'No downloads', 'Free plan included'].map((t) => <li key={t} className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-accent" />{t}</li>)}
          </motion.ul>
        </div>
        <div className="relative h-[460px] sm:h-[560px] lg:-ml-10 lg:h-[700px]">
          <Suspense fallback={null}><Stage3D scene="hero" className="absolute inset-0" /></Suspense>
          <p className="pointer-events-none absolute bottom-2 right-3 hidden font-mono text-[11px] text-muted/70 sm:block">Click the robot to say hi</p>
        </div>
      </div>
    </section>
  )
}
