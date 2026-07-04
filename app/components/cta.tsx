'use client'

import Link from 'next/link'

export function CTA() {
  return (
    <section id="contact" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Gradient background */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900/80 to-neutral-900/50 p-8 md:p-16 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-balance mb-4">
            Ready to Secure Your Ports?
          </h2>
          <p className="text-lg text-neutral-400 text-balance mb-8 max-w-2xl mx-auto">
            Join maritime authorities and port operators using GeoMarine AI for real-time vessel monitoring and port security.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button className="px-8 py-3 bg-primary hover:bg-primary-dark text-foreground rounded-lg font-semibold transition transform hover:scale-105">
              Schedule Demo
            </button>
            <Link
              href="mailto:contact@geomarine.ai"
              className="px-8 py-3 border border-neutral-700 hover:border-neutral-600 text-foreground rounded-lg font-semibold transition"
            >
              Get in Touch
            </Link>
          </div>

          <p className="text-sm text-neutral-500">
            Available 24/7. Deployment within 48 hours.
          </p>
        </div>
      </div>
    </section>
  )
}
