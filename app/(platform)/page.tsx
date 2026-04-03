import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Golf course operations, simplified
      </h1>
      <p className="text-lg text-muted-foreground max-w-md">
        Manage your tee sheet, reservations, and daily programme — all in one place.
      </p>
      <Link href="/new">
        <Button size="lg">Create your course</Button>
      </Link>
    </div>
  );
}
