'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-neutral-950/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GM</span>
              </div>
              <span className="font-bold">GeoMarine</span>
            </div>
            <p className="text-sm text-neutral-400">Maritime Intelligence & Port Activity Monitoring</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><Link href="#features" className="hover:text-foreground transition">Features</Link></li>
              <li><Link href="#technology" className="hover:text-foreground transition">Technology</Link></li>
              <li><Link href="#ports" className="hover:text-foreground transition">Monitored Ports</Link></li>
              <li><Link href="#" className="hover:text-foreground transition">API Docs</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><Link href="#" className="hover:text-foreground transition">About</Link></li>
              <li><Link href="#" className="hover:text-foreground transition">Blog</Link></li>
              <li><Link href="#" className="hover:text-foreground transition">Careers</Link></li>
              <li><Link href="#" className="hover:text-foreground transition">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><Link href="#" className="hover:text-foreground transition">Privacy</Link></li>
              <li><Link href="#" className="hover:text-foreground transition">Terms</Link></li>
              <li><Link href="#" className="hover:text-foreground transition">Security</Link></li>
              <li><Link href="#" className="hover:text-foreground transition">Compliance</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-neutral-800 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-neutral-500">
          <p>&copy; 2024 GeoMarine AI. All rights reserved.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <Link href="#" className="hover:text-foreground transition">Twitter</Link>
            <Link href="#" className="hover:text-foreground transition">LinkedIn</Link>
            <Link href="#" className="hover:text-foreground transition">GitHub</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
