'use client'

interface Stat {
  value: string
  label: string
  suffix?: string
}

const stats: Stat[] = [
  { value: '6', label: 'Major Ports', suffix: 'Monitored' },
  { value: '24/7', label: 'Real-Time', suffix: 'Monitoring' },
  { value: '99.9%', label: 'Uptime', suffix: 'Guaranteed' },
  { value: '< 5min', label: 'Detection', suffix: 'Latency' },
]

export function Stats() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-y border-neutral-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-neutral-400">
                <div className="font-semibold text-foreground">{stat.label}</div>
                {stat.suffix && <div className="text-xs">{stat.suffix}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
