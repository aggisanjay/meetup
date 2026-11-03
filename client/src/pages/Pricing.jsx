import React from 'react'
import { PricingTable } from '@clerk/react'
import { Words, Reveal, Eyebrow } from '../components/ui/motion'

const Pricing = () => (
  <div className="relative mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-4xl flex-col justify-center gap-5 p-8">
    <div className="mb-6 text-center">
      <Eyebrow>PLANS</Eyebrow>
      <h1 className="font-display text-6xl font-semibold leading-[1] tracking-[-0.04em] text-ink"><Words text="Upgrade your plan." inView={false} /></h1>
      <p className="mt-3 text-muted">Choose the plan that fits and unlock everything in MeetUp.</p>
    </div>
    <Reveal><PricingTable /></Reveal>
  </div>
)

export default Pricing
