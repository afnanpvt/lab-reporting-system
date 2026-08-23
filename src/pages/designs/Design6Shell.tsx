import type { ReactNode } from 'react'

export const INTER_STACK = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export default function Design6Shell({
  maxWidth = 640,
  headerRight,
  children
}: {
  maxWidth?: number
  headerRight: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex justify-center px-5 py-12" style={{ fontFamily: INTER_STACK }}>
      <div className="w-full" style={{ maxWidth }}>
        <div className="flex items-center justify-between mb-[22px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-[34px] h-[34px] rounded-lg bg-[#1a1a1a] text-white flex items-center justify-center font-bold text-[15px] flex-shrink-0">
              L
            </div>
            <span className="text-[15px] font-semibold text-[#1a1a1a] whitespace-nowrap">Lab Reporter</span>
          </div>
          {headerRight}
        </div>
        {children}
      </div>
    </div>
  )
}
