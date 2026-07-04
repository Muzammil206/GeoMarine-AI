import { Navbar } from './components/navbar'
import { Hero } from './components/hero'
import { Features } from './components/features'
import { Stats } from './components/stats'
import { Technology } from './components/technology'
import { Ports } from './components/ports'
import { CTA } from './components/cta'
import { Footer } from './components/footer'

export default function Home() {
  return (
    <main className="bg-background">
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <Technology />
      <Ports />
      <CTA />
      <Footer />
    </main>
  )
}
