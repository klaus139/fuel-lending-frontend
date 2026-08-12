import { cn } from '../lib/utils'

const sizeClass = {
  sm: 'h-10',
  md: 'h-16',
  lg: 'h-24',
} as const

type BrandLogoProps = {
  className?: string
  size?: keyof typeof sizeClass
  /** full = transparent wordmark, blue = navy lockup, icon = BF circle */
  variant?: 'full' | 'blue' | 'icon'
}

const srcByVariant = {
  full: '/logo.png',
  blue: '/logo-blue.png',
  icon: '/icon.png',
} as const

export function BrandLogo({ className, size = 'md', variant = 'full' }: BrandLogoProps) {
  return (
    <img
      src={srcByVariant[variant]}
      alt="BorrowFuel"
      className={cn('w-auto object-contain', sizeClass[size], className)}
    />
  )
}
