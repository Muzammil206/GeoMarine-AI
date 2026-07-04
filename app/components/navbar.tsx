'use client'

import Link from 'next/link'
import { useState } from 'react'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed w-full top-0 z-50 bg-background/80 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GM</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline">GeoMarine</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-neutral-400 hover:text-foreground transition">
              Features
            </Link>
            <Link href="#technology" className="text-neutral-400 hover:text-foreground transition">
              Technology
            </Link>
            <Link href="#ports" className="text-neutral-400 hover:text-foreground transition">
              Ports
            </Link>
            <Link href="#contact" className="text-neutral-400 hover:text-foreground transition">
              Contact
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <button className="hidden sm:inline px-4 py-2 text-foreground hover:text-primary transition text-sm">
              Sign in
            </button>
            <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-foreground rounded-lg transition text-sm font-medium">
              Get Started
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-neutral-400 hover:text-foreground"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-neutral-800 py-4 space-y-2">
            <Link href="#features" className="block px-4 py-2 text-neutral-400 hover:text-foreground">
              Features
            </Link>
            <Link href="#technology" className="block px-4 py-2 text-neutral-400 hover:text-foreground">
              Technology
            </Link>
            <Link href="#ports" className="block px-4 py-2 text-neutral-400 hover:text-foreground">
              Ports
            </Link>
            <Link href="#contact" className="block px-4 py-2 text-neutral-400 hover:text-foreground">
              Contact
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
