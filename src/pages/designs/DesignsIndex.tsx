import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const designs = [
  {
    n: 1,
    name: 'Clinical Minimal',
    desc: 'A refined version of the current look — spacious, quiet, single accent colour. Top header, simple list.',
    tags: ['Light', 'Top nav', 'List']
  },
  {
    n: 2,
    name: 'Command Console',
    desc: 'Sidebar navigation, stat strip, dense data table with status badges. Feels like real LIS/EMR software.',
    tags: ['Light', 'Sidebar', 'Table']
  },
  {
    n: 3,
    name: 'Soft Cards',
    desc: 'Patients as cards in a grid, soft shadows and rounded corners, colour-coded by status. Friendlier and warmer.',
    tags: ['Light', 'Sidebar', 'Cards']
  },
  {
    n: 4,
    name: 'Dark Pro',
    desc: 'Dark theme sidebar app, high-contrast table, cyan accent — the modern SaaS-dashboard aesthetic.',
    tags: ['Dark', 'Sidebar', 'Table']
  },
  {
    n: 5,
    name: 'Compact Utility',
    desc: 'Very dense, keyboard-first, minimal chrome. Built for speed over decoration — small type, tight rows.',
    tags: ['Light', 'Top nav', 'Dense table']
  },
  {
    n: 6,
    name: 'Manual Entry',
    desc: 'From the client-supplied handoff — warm cream/brick palette, big touch-friendly cards, a dedicated Choose Tests step. Built for older, less tech-fluent lab staff.',
    tags: ['Light', 'Centered card', 'Handoff spec']
  }
]

export default function DesignsIndex() {
  return (
    <div className="h-screen overflow-y-auto bg-[#f4f5f6] px-8 py-14">
      <div className="max-w-4xl mx-auto">
        <p className="text-[13px] font-semibold uppercase tracking-widest text-[#8a9094] mb-2">Design Review</p>
        <h1 className="text-[32px] font-semibold text-[#1a2023] mb-3">Pick a direction</h1>
        <p className="text-[16px] text-[#5c6569] mb-10 max-w-2xl">
          Six takes on the app, each fully self-contained with its own navigation, colour system and layout.
          Click through, then say which one (or which parts of which one) you want applied across the real app.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {designs.map((d) => (
            <Link
              key={d.n}
              to={`/designs/${d.n}`}
              className="group block bg-white rounded-2xl border border-[#e2e5e6] p-6 hover:border-[#2c7a73] hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#e6f2f0] text-[#1f5a55] flex items-center justify-center font-semibold text-[15px] flex-shrink-0">
                  {d.n}
                </div>
                <ArrowRight size={17} className="text-[#8a9094] group-hover:text-[#2c7a73] group-hover:translate-x-0.5 transition-all mt-1.5" />
              </div>
              <div className="text-[18px] font-semibold text-[#1a2023] mb-1.5">{d.name}</div>
              <p className="text-[14.5px] text-[#5c6569] leading-relaxed mb-4">{d.desc}</p>
              <div className="flex gap-1.5 flex-wrap">
                {d.tags.map((t) => (
                  <span key={t} className="text-[11.5px] font-medium px-2 py-1 rounded-md bg-[#f4f5f6] text-[#5c6569]">
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
