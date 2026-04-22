import { NextResponse } from 'next/server';
import { runMorningBriefEmailCron } from '@/lib/morning-brief-cron';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Vercel Cron: every 15m. Picks tenants where local wall clock is 07:00.
 * Set CRON_SECRET in the project. Invoke with: Authorization: Bearer <CRON_SECRET>
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
