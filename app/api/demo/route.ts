import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(200),
  club: z.string().trim().min(1).max(200),
  role: z.string().trim().max(120).optional().default(''),
  notes: z.string().trim().max(4000).optional().default(''),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SYSTEM_OWNER_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL ?? 'Courseday <onboarding@resend.dev>';

  if (!apiKey || !to) {
    return NextResponse.json(
      { error: 'Email service not configured.' },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const { name, email, club, role, notes } = parsed.data;

  const subject = `Demo request — ${club}`;
  const rows: Array<[string, string]> = [
    ['Name', name],
    ['Email', email],
    ['Club', club],
    ['Role', role || '—'],
    ['Notes', notes || '—'],
  ];

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 14px; color: #111;">
      <h2 style="margin: 0 0 16px;">New demo request</h2>
      <table style="border-collapse: collapse;">
        ${rows
          .map(
            ([k, v]) => `
              <tr>
                <td style="padding: 6px 12px 6px 0; color: #555; vertical-align: top;">${escapeHtml(k)}</td>
                <td style="padding: 6px 0; white-space: pre-wrap;">${escapeHtml(v)}</td>
              </tr>`,
          )
          .join('')}
      </table>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject,
      text,
      html,
    });

    if (result.error) {
      return NextResponse.json({ error: 'Failed to send email.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 502 });
  }
}
