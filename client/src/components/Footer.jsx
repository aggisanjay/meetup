import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
    return (
        <footer className="w-full max-w-5xl mx-auto px-6 py-6 mt-auto text-center border-t border-line/60">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
                <div className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-ink">
                    <img src="/logo.svg" alt="" width={18} height={18} />
                    MeetUp<span className="text-primary">.</span>
                </div>
                <p>© {new Date().getFullYear()} MeetUp Inc. Real-time collaboration reimagined.</p>
                <div className="flex items-center gap-4">
                    <Link to="/" className="hover:text-ink transition-colors">Home</Link>
                    <Link to="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
                    <Link to="/dashboard" className="hover:text-ink transition-colors">Dashboard</Link>
                </div>
            </div>
        </footer>
    )
}

export default Footer
