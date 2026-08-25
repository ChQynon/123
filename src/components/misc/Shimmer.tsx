'use client'

import React, {
  CSSProperties,
  ElementType,
  memo,
  useMemo,
} from 'react'

export interface ShimmerProps {
  children: string
  as?: ElementType
  className?: string
  /** длительность цикла, сек */
  duration?: number
  /** ширина блика, px на символ */
  spread?: number
}

function ShimmerComponent({
  children,
  as: Component = 'span',
  className = '',
  duration = 2,
  spread = 2,
}: ShimmerProps) {
  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread],
  )

  return (
    <Component
      className={`shimmer-text relative inline-block ${className}`.trim()}
      style={
        {
          '--spread': `${dynamicSpread}px`,
          '--shimmer-duration': `${duration}s`,
        } as CSSProperties
      }
    >
      {children}
    </Component>
  )
}

export const Shimmer = memo(ShimmerComponent)

export default Shimmer
