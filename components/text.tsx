import { cn } from '@/lib/utils'

const sizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: keyof typeof sizeMap
  muted?: boolean
}

export function Text({ size = 'md', muted = false, className, ...props }: TextProps) {
  return <p className={cn(sizeMap[size], muted && 'text-muted-foreground', className)} {...props} />
}
