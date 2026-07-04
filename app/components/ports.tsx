'use client'

interface Port {
  name: string
  state: string
  coordinates: string
  activity: string
}

const ports: Port[] = [
  { name: 'Apapa Port', state: 'Lagos', coordinates: '6.45°N, 3.39°E', activity: 'High' },
  { name: 'Tin Can Island Port', state: 'Lagos', coordinates: '6.43°N, 3.34°E', activity: 'High' },
  { name: 'Onne Port', state: 'Rivers', coordinates: '4.68°N, 7.16°E', activity: 'Medium' },
  { name: 'Calabar Port', state: 'Cross River', coordinates: '4.98°N, 8.32°E', activity: 'Medium' },
  { name: 'Warri Port', state: 'Delta', coordinates: '5.52°N, 5.75°E', activity: 'Low' },
  { name: 'Port Harcourt Port', state: 'Rivers', coordinates: '4.78°N, 7.01°E', activity: 'High' },
]

export function Ports() {
  return (
    <section id="ports" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-balance mb-4">
            Monitored Ports
          </h2>
          <p className="text-lg text-neutral-400 text-balance max-w-2xl mx-auto">
            Real-time monitoring across Nigeria&apos;s major maritime ports
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ports.map((port, idx) => (
            <div
              key={idx}
              className="group p-6 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-primary/50 transition hover:bg-neutral-900/80"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{port.name}</h3>
                  <p className="text-sm text-neutral-400">{port.state}</p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    port.activity === 'High'
                      ? 'bg-red-500/20 text-red-400'
                      : port.activity === 'Medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {port.activity}
                </div>
              </div>
              <p className="text-sm text-neutral-400 font-mono">{port.coordinates}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
