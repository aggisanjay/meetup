import { ArrowRightIcon, VideoIcon } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

const EmptySessions = () => {
    return (
        <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl p-12 xl:py-24 text-center border border-line shadow-xs flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-1">
                <VideoIcon className="w-7 h-7" />
            </div>
            <h3 className="text-xl lg:text-2xl font-semibold font-display text-ink">No meeting history yet</h3>
            <p className="text-sm text-muted max-w-md">Once you create or join meeting calls, your meeting sessions, participants, and chat logs will appear here.</p>

            <Link to="/dashboard" className="bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-full text-sm transition-all inline-flex items-center gap-2 mt-2 shadow-sm">
                Start a Meeting
                <ArrowRightIcon className="w-4 h-4" />
            </Link>
        </div>
    )
}

export default EmptySessions
