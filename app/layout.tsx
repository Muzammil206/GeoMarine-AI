import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GeoMarine AI - Maritime Intelligence Platform',
  description: 'AI-powered maritime intelligence platform monitoring vessel activity across Nigerian ports using Sentinel-1 satellite imagery.',
  openGraph: {
    title: 'GeoMarine AI',
    description: 'Maritime Intelligence & Port Activity Monitoring',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0e27',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className="bg-background">
      <body className={`${inter.className} bg-background text-foreground`}>
        {children}
      </body>
    </html>
  )
}
