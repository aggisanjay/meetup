import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AsteriskIcon, HistoryIcon, LayoutDashboardIcon, Sparkles } from 'lucide-react'
import { UserButton, useUser, useClerk } from '@clerk/react'

const Navbar = () => {
    const { isSignedIn, user } = useUser()
    const { openSignIn, openSignUp } = useClerk()
    const location = useLocation()
    const userName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "User"

    const navLinks = [
        { to: "/", label: "Overview", icon: Sparkles },
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
        { to: "/sessions", label: "Sessions", icon: HistoryIcon },
        { to: "/pricing", label: "Pricing", icon: AsteriskIcon },
    ]

    return (
        <header className="sticky top-4 z-40 w-full px-4 flex justify-center">
            <nav
                aria-label="Primary"
                className="w-full max-w-5xl rounded-full border border-line bg-white/85 shadow-[0_14px_40px_-18px_rgba(79,70,229,0.30)] backdrop-blur-xl py-2 pl-5 pr-3 flex items-center justify-between transition-all duration-300"
            >
                {/* Brand Logo & Navigation Links */}
                <div className="flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-ink">
                        <img src="/logo.svg" alt="MeetUp Logo" width={26} height={26} className="size-6.5" />
                        MeetUp<span className="text-primary">.</span>
                    </Link>

                    {isSignedIn && (
                        <div className="hidden md:flex items-center gap-1 ml-2 text-[14px] font-medium text-muted">
                            {navLinks.map(({ to, label, icon: Icon }) => {
                                const isActive = location.pathname === to
                                return (
                                    <Link
                                        key={to}
                                        to={to}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                            isActive
                                                ? "bg-primary/10 text-primary ring-1 ring-primary/25 shadow-xs"
                                                : "text-muted hover:text-ink hover:bg-slate-100/70"
                                        }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted"}`} />
                                        {label}
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Right Profile / Actions */}
                <div className="flex items-center gap-3">
                    {isSignedIn ? (
                        <>
                            {/* Mobile Quick Links */}
                            <Link
                                to="/sessions"
                                className="md:hidden p-2 rounded-full text-muted hover:text-ink hover:bg-slate-100 transition-colors"
                                title="Sessions"
                            >
                                <HistoryIcon className="w-4 h-4" />
                            </Link>

                            <span className="font-medium hidden sm:inline tracking-wide text-xs text-muted">
                                Welcome, <strong className="text-ink font-semibold">{userName}</strong>
                            </span>

                            <div className="flex items-center">
                                <UserButton afterSignOutUrl="/login" />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openSignIn()}
                                className="hidden cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink sm:block"
                            >
                                Sign in
                            </button>
                            <button
                                onClick={() => openSignUp()}
                                className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-sm transition-all"
                            >
                                Get started
                            </button>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    )
}

export default Navbar
