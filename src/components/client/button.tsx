'use client'

import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-tan text-brand-espresso hover:bg-brand-brown hover:text-brand-cream border border-brand-tan hover:border-brand-brown',
  secondary:
    'bg-brand-espresso text-brand-cream hover:bg-brand-darker border border-brand-espresso hover:border-brand-darker',
  ghost:
    'bg-transparent text-brand-brown border border-brand-brown hover:bg-[var(--brand-tan-alpha)] dark:text-brand-tan dark:border-brand-tan',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-lg',
  md: 'text-base px-4 py-2 rounded-xl',
  lg: 'text-lg px-6 py-3 rounded-2xl',
}

const baseClasses =
  'inline-flex items-center justify-center font-sans font-semibold cursor-pointer ' +
  'transition-colors duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
