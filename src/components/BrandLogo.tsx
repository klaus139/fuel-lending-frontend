import { cn } from '../lib/utils'

const sizeClass = {
  sm: 'h-10',
  md: 'h-16',
  lg: 'h-24',
} as const

type BrandLogoProps = {
  className?: string
  size?: keyof typeof sizeClass
}

export function BrandLogo({ className, size = 'md' }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="BurrowFuel"
      className={cn('w-auto object-contain', sizeClass[size], className)}
    />
  )
}
