import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TenantNotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground/30 text-6xl font-bold">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-sm">
        This page doesn&apos;t exist within your course.
      </p>
      <Button asChild>
        <Link href="/">Back to calendar</Link>
      </Button>
    </div>
  )
}
