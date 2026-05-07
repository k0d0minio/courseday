import { ArrowLeftRight } from 'lucide-react'
import { protocol, rootDomain } from '@/lib/utils'

type SuperadminReturnPopupProps = {
  role: 'editor' | 'staff'
}

export function SuperadminReturnPopup({ role }: SuperadminReturnPopupProps) {
  return (
    <div className="fixed bottom-20 left-4 z-50 sm:bottom-4">
      <div className="bg-background/95 rounded-lg border px-3 py-2 shadow-lg backdrop-blur">
        <p className="text-muted-foreground text-xs">Viewing as {role}</p>
        <a
          href={`${protocol}://${rootDomain}/admin`}
          className="text-primary mt-1 inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Return to superadmin
        </a>
      </div>
    </div>
  )
}
