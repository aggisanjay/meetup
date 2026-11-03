import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/react'
import Lenis from 'lenis'
import Hero from '../components/landing/Hero'
import { Marquee, Metrics, HowItWorks, Tour, Bento, Pricing, FAQ, CTA, SiteFooter } from '../components/landing/Sections'

function Nav() {
  const { isSignedIn } = useUser()
  const { openSignIn, openSignUp } = useClerk()
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav aria-label="Primary" className={`flex w-full max-w-5xl items-center justify-between rounded-full border py-2 pl-5 pr-2 transition-all duration-500 ${solid ? 'border-line bg-white/80 shadow-[0_14px_40px_-18px_rgba(79,70,229,0.45)] backdrop-blur-xl' : 'border-transparent'}`}>
        <Link to="/" className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-ink"><img src="/logo.svg" alt="" width={26} height={26} />MeetUp<span className="text-primary">.</span></Link>
        <div className="hidden items-center gap-8 text-[14.5px] font-medium text-muted md:flex">
          <a href="#how" className="hover:text-ink">How it works</a><a href="#tour" className="hover:text-ink">Tour</a><a href="#pricing" className="hover:text-ink">Pricing</a><a href="#faq" className="hover:text-ink">FAQ</a>
        </div>
        <div className="flex items-center gap-2">
          {isSignedIn ? <Link to="/dashboard" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">Dashboard</Link> : (<>
            <button onClick={() => openSignIn()} className="hidden cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink sm:block">Sign in</button>
            <button onClick={() => openSignUp()} className="cursor-pointer rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">Get started</button></>)}
        </div>
      </nav>
    </header>
  )
}

export default function Landing() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.1 })
    let raf = requestAnimationFrame(function loop(t) { lenis.raf(t); raf = requestAnimationFrame(loop) })
    return () => { cancelAnimationFrame(raf); lenis.destroy() }
  }, [])
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Metrics />
        <HowItWorks />
        <Tour />
        <Bento />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  )
}
