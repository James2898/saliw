import type { ReactNode } from 'react'

type PaddingVariant = 'none' | 'sm' | 'md' | 'lg'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: PaddingVariant
}

const paddingMap: Record<PaddingVariant, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-10',
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`main-card rounded-3xl border ${paddingMap[padding]} ${className}`}>
      {children}
    </div>
  )
}
