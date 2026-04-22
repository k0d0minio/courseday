import { NextResponse } from 'next/server';
import { runMorningBriefEmailCron } from '@/lib/morning-brief-cron';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Vercel Cron: `0 5 * * *` = 05:00 UTC. That is 07:00 in Europe/Brussels during
 * CEST (roughly late Mar–late Oct). In CET, same schedule is 06:00 Brussels; use
 * `0 6 * * *` in vercel.json if you prefer 07:00 in winter (then summer is 08:00).
 * Set CRON_SECRET. Invoke with: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET not set on server.' },
      { status: 500 }
    );
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const result = await runMorningBriefEmailCron();
  return NextResponse.json(result);
}
