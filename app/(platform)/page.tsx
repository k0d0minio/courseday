import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function LandingPage() {
  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl leading-tight">
          Your venue's day, visible to everyone who needs it
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          Courseday keeps your operations team and food &amp; beverage service on the
          same page — daily programme, covers, reservations, and hotel guests, all in
          one shared view.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Link href="/new">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/auth/sign-in">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>
      </section>

      <Separator />

      {/* Features */}
      <section className="max-w-5xl mx-auto w-full px-6 py-20 grid sm:grid-cols-3 gap-12">

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Daily programme</p>
          <h2 className="text-lg font-semibold">One view for the whole day</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Golf rounds, events, and group activities are published each day with times,
            guest counts, and venue details. Everyone on the team sees the same picture —
            no calls, no printouts.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">F&amp;B coordination</p>
          <h2 className="text-lg font-semibold">Covers and timing, always current</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Restaurant reservations, hotel breakfast configurations, and table breakdowns
            sit alongside the programme. Your kitchen and front-of-house have the right
            numbers without chasing them down.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Your venue</p>
          <h2 className="text-lg font-semibold">Private workspace, simple setup</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each venue gets its own subdomain and team. Editors manage the schedule;
            the rest of the team can follow along on any device. No app to install,
            no complicated onboarding.
          </p>
        </div>

      </section>

      <Separator />

      {/* Footer CTA */}
      <section className="flex flex-col items-center text-center px-6 py-20 gap-5">
        <h2 className="text-2xl font-semibold tracking-tight">Ready to get your team aligned?</h2>
        <p className="text-muted-foreground max-w-sm">
          Set up your venue in a few minutes. No credit card required.
        </p>
        <Link href="/new">
          <Button size="lg">Create your venue</Button>
        </Link>
      </section>

    </div>
  );
}
