'use client'

interface TechCategory {
  title: string
  items: string[]
}

const technologies: TechCategory[] = [
  {
    title: 'Data Source',
    items: ['Sentinel-1 SAR', 'CDSE STAC API', 'Real-time Updates'],
  },
  {
    title: 'Processing',
    items: ['YOLOv8 ONNX', 'SAR Preprocessing', 'GeoJSON Output'],
  },
  {
    title: 'Infrastructure',
    items: ['PostgreSQL', 'PostGIS', 'Docker'],
  },
  {
    title: 'API & Dashboard',
    items: ['Fastify', 'Next.js 16', 'MapLibre GL'],
  },
]

export function Technology() {
  return (
    <section id="technology" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-balance mb-4">
            Built on Cutting-Edge Technology
          </h2>
          <p className="text-lg text-neutral-400 text-balance max-w-2xl mx-auto">
            Modern stack combining satellite intelligence with advanced AI and cloud infrastructure
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {technologies.map((category, idx) => (
            <div key={idx} className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800">
              <h3 className="text-lg font-semibold mb-4 text-primary">{category.title}</h3>
              <ul className="space-y-3">
                {category.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                    <span className="text-neutral-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-neutral-900/50 to-neutral-800/50 border border-neutral-800 rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Processing Pipeline</h4>
              <p className="text-neutral-400 text-sm">Sentinel-1 → Lee Filter → YOLOv8 → PostGIS</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Data Flow</h4>
              <p className="text-neutral-400 text-sm">CDSE STAC API → Pipeline → Backend API → Dashboard</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Availability</h4>
              <p className="text-neutral-400 text-sm">6 Monitored Ports, Cloud-Ready, Scalable</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
