import { SignIn, SignUp, useUser } from '@clerk/react'
import React, { Suspense, lazy } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Words } from '../components/ui/motion'

const Stage3D = lazy(() => import('../components/three/Stage3D'))

const Login = ({ mode = 'login' }) => {
  const isRegister = mode === 'register'
  const { isLoaded, isSignedIn } = useUser()
  if (isLoaded && isSignedIn) return <Navigate to="/dashboard" replace />

  return (
    <div className="grid min-h-screen w-full bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <aside className="grain relative isolate hidden overflow-hidden bg-gradient-to-br from-[#e4e2ff] via-[#f1efff] to-[#d9f7ec] lg:block">
        <div aria-hidden className="absolute -left-24 top-20 -z-10 h-96 w-96 rounded-full bg-primary/25 blur-[100px]" />
        <Link to="/" className="absolute left-10 top-9 z-10 flex items-center gap-2 font-display text-2xl font-semibold text-ink"><img src="/logo.svg" alt="" width={26} height={26} />MeetUp<span className="text-primary">.</span></Link>
        <div className="absolute inset-x-0 top-[14%] h-[52%]"><Suspense fallback={null}><Stage3D scene="robot" className="absolute inset-0" /></Suspense></div>
        <div className="absolute inset-x-10 bottom-14">
          <h2 className="max-w-md font-display text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-ink"><Words text="Welcome back to the room." inView={false} /></h2>
          <p className="mt-4 max-w-sm text-muted">Video, notes, whiteboard and code in one real-time meeting.</p>
        </div>
      </aside>
      <main className="relative flex items-center justify-center p-6">
        <div className="relative flex w-full justify-center py-2">
          {isRegister ? <SignUp routing="path" path="/register" signInUrl="/login" fallbackRedirectUrl="/dashboard" /> : <SignIn routing="path" path="/login" signUpUrl="/register" fallbackRedirectUrl="/dashboard" />}
        </div>
      </main>
    </div>
  )
}

export default Login
