import { cn } from '@/lib/utils'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4'

const sizeMap: Record<HeadingLevel, string> = {
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold tracking-tight',
  h4: 'text-xl font-semibold tracking-tight',
}

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel
  size?: HeadingLevel
}

export function Heading({ as: Tag = 'h1', size, className, ...props }: HeadingProps) {
  return <Tag className={cn(sizeMap[size ?? Tag], className)} {...props} />
}
