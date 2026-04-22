import { ArrowLeftRight } from 'lucide-react';
import { protocol, rootDomain } from '@/lib/utils';

type SuperadminReturnPopupProps = {
  role: 'editor' | 'viewer';
};

export function SuperadminReturnPopup({ role }: SuperadminReturnPopupProps) {
  return (
    <div className="fixed bottom-20 left-4 z-50 sm:bottom-4">
      <div className="rounded-lg border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
        <p className="text-xs text-muted-foreground">
          Viewing as {role}
        </p>
        <a
          href={`${protocol}://${rootDomain}/admin`}
          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Return to superadmin
        </a>
      </div>
    </div>
  );
}
