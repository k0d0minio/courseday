import { NextResponse } from 'next/server'
import { runShiftRemindersCron } from '@/lib/shift-reminders-cron'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not set on server.' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const result = await runShiftRemindersCron()
  return NextResponse.json(result)
}
