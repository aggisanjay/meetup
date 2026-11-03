import React, { useEffect, useRef } from 'react'
import { motion, animate, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'

export const EASE = [0.22, 1, 0.36, 1]

/** Words rise out of a mask, one by one. */
export function Words({ text, className = '', delay = 0, inView = true }) {
  const reduce = useReducedMotion()
  const to = { y: '0%' }
  const trig = inView ? { whileInView: to, viewport: { once: true, margin: '-60px' } } : { animate: to }
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span className="inline-block" initial={reduce ? false : { y: '110%' }} {...trig} transition={{ duration: 0.95, ease: EASE, delay: delay + i * 0.08 }}>{w}&nbsp;</motion.span>
        </span>
      ))}
    </span>
  )
}

export function Reveal({ children, delay = 0, className = '', y = 40 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} initial={reduce ? { opacity: 0 } : { opacity: 0, y, rotateX: -14, transformPerspective: 1000 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.9, ease: EASE, delay }}>
      {children}
    </motion.div>
  )
}

export function Tilt3D({ children, max = 6, className = '' }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const px = useMotionValue(0.5), py = useMotionValue(0.5)
  const sx = useSpring(px, { stiffness: 200, damping: 20 }), sy = useSpring(py, { stiffness: 200, damping: 20 })
  const rotateY = useTransform(sx, [0, 1], [-max, max]), rotateX = useTransform(sy, [0, 1], [max, -max])
  const sheen = useTransform([sx, sy], ([x, y]) => `radial-gradient(380px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.55), transparent 55%)`)
  return (
    <div style={{ perspective: 900 }} className={className}>
      <motion.div ref={ref} className="relative h-full rounded-[inherit]" style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onPointerMove={(e) => { if (reduce || !ref.current) return; const b = ref.current.getBoundingClientRect(); px.set((e.clientX - b.left) / b.width); py.set((e.clientY - b.top) / b.height) }}
        onPointerLeave={() => { px.set(0.5); py.set(0.5) }} whileHover={reduce ? undefined : { translateZ: 12 }}>
        {children}
        <motion.div aria-hidden style={{ background: sheen }} className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light" />
      </motion.div>
    </div>
  )
}

/** Counts up when scrolled into view. */
export function CountUp({ to, suffix = '', className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView || !ref.current) return
    const c = animate(0, to, { duration: 1.6, ease: 'easeOut', onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v) + suffix } })
    return () => c.stop()
  }, [inView, to, suffix])
  return <span ref={ref} className={className}>0{suffix}</span>
}

export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`mb-3 inline-block font-mono text-xs font-bold tracking-[0.18em] text-primary ${className}`}>
      {children}
    </p>
  )
}
