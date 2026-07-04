'use client'

import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Gradient orb background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/50 border border-neutral-800">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm text-neutral-400">Real-time maritime intelligence powered by AI</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-balance mb-6 leading-tight">
          Monitor Vessels.
          <br />
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Secure Ports.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-neutral-400 text-balance mb-8 max-w-2xl mx-auto leading-relaxed">
          AI-powered maritime intelligence platform using satellite imagery to monitor vessel activity across Nigerian ports in real-time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link
            href="#contact"
            className="px-8 py-3 bg-primary hover:bg-primary-dark text-foreground rounded-lg font-semibold transition transform hover:scale-105"
          >
            Start Monitoring
          </Link>
          <Link
            href="#features"
            className="px-8 py-3 border border-neutral-700 hover:border-neutral-600 text-foreground rounded-lg font-semibold transition"
          >
            Explore Features
          </Link>
        </div>

        {/* Trusted by section */}
        <div className="pt-12 border-t border-neutral-800/50">
          <p className="text-sm text-neutral-500 mb-6">Trusted by maritime authorities and port operators</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-sm font-semibold text-neutral-400">Nigeria Ports Authority</div>
            <div className="text-sm font-semibold text-neutral-400">NIMASA</div>
            <div className="text-sm font-semibold text-neutral-400">Port Management</div>
            <div className="text-sm font-semibold text-neutral-400">Logistics Partners</div>
          </div>
        </div>
      </div>
    </section>
  )
}
