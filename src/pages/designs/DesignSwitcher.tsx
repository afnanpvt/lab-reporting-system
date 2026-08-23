import { Link } from 'react-router-dom'

const names = ['Clinical Minimal', 'Command Console', 'Soft Cards', 'Dark Pro', 'Compact Utility', 'Manual Entry']

export default function DesignSwitcher({ current, screen }: { current: number; screen?: string }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-9 flex items-center gap-1 px-3 bg-[#1a2023] text-white text-[12.5px] overflow-x-auto whitespace-nowrap">
      <Link to="/designs" className="px-2.5 py-1 rounded hover:bg-white/10 font-medium flex-shrink-0">
        ← All designs
      </Link>
      <span className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />
      {names.map((name, i) => {
        const num = i + 1
        return (
          <Link
            key={num}
            to={`/designs/${num}`}
            className={`px-2.5 py-1 rounded transition-colors flex-shrink-0 ${
              current === num ? 'bg-white/20 font-semibold' : 'hover:bg-white/10 text-white/70'
            }`}
          >
            {num}. {name}
          </Link>
        )
      })}
      {screen && (
        <>
          <span className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />
          <span className="px-2.5 py-1 text-white/50 flex-shrink-0">{screen}</span>
        </>
      )}
    </div>
  )
}
