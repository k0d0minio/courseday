'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface DemoFormLabels {
  name: string;
  email: string;
  club: string;
  role: string;
  rolePlaceholder: string;
  notes: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  backHome: string;
}

export function DemoForm({ labels }: { labels: DemoFormLabels }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    // TODO: wire backend (Resend / email) in follow-up. Stubbed for now.
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4 py-6 text-center">
        <h2 className="font-display text-2xl font-medium">{labels.successTitle}</h2>
        <p className="text-muted-foreground">{labels.successBody}</p>
        <Link href="/" className="mt-2">
          <Button variant="outline">{labels.backHome}</Button>
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-name">{labels.name}</Label>
          <Input id="demo-name" name="name" type="text" required autoComplete="name" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-email">{labels.email}</Label>
          <Input id="demo-email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-club">{labels.club}</Label>
          <Input id="demo-club" name="club" type="text" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-role">{labels.role}</Label>
          <Input
            id="demo-role"
            name="role"
            type="text"
            placeholder={labels.rolePlaceholder}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="demo-notes">{labels.notes}</Label>
        <Textarea id="demo-notes" name="notes" rows={4} />
      </div>
      <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full sm:w-auto">
        {submitting ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
