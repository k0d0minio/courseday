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
  errorGeneric?: string;
}

export function DemoForm({ labels }: { labels: DemoFormLabels }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      club: String(formData.get('club') ?? '').trim(),
      role: String(formData.get('role') ?? '').trim(),
      notes: String(formData.get('notes') ?? '').trim(),
    };

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Request failed');
      }
      setSubmitted(true);
    } catch {
      setError(labels.errorGeneric ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full sm:w-auto">
        {submitting ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
