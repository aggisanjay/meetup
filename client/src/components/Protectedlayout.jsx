import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

const Protectedlayout = () => (
  <div className="relative isolate flex h-screen flex-col overflow-y-scroll bg-canvas font-sans text-ink">
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_0%,rgba(165,180,252,0.45),transparent_50%),radial-gradient(ellipse_at_0%_100%,rgba(167,243,208,0.35),transparent_50%)]" />
    <Navbar />
    <Outlet />
    <Footer />
  </div>
)

export default Protectedlayout
