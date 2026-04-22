import { Resend } from 'resend';
import { toZonedTime } from 'date-fns-tz';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getTenantToday } from '@/lib/day-utils';
import { ensureDayForTenant } from '@/lib/ensure-day';
import { formatDailyBriefMarkdown } from '@/lib/daily-brief-format';
import { tenantDayUrl } from '@/lib/tenant-day-url';
import {
  getProgramItemsForDayWithClient,
  getReservationsForDayWithClient,
  getBreakfastConfigsForDayWithClient,
  getDayNotesForDayWithClient,
  getDailyBriefForDayWithClient,
} from '@/app/[tenant]/day/[date]/queries';
import { getWeatherForTenantId } from '@/app/actions/weather';
import {
  dayHasPlannedContent,
  generateAndPersistDailyBrief,
} from '@/lib/daily-brief-generate';
import type { DailyBriefRecord } from '@/types/daily-brief';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function briefToHtml(brief: DailyBriefRecord, tenantName: string, dayUrl: string, dateLabel: string) {
  const body = formatDailyBriefMarkdown(brief.content)
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) {
        return `<h1 style="font-size:20px;margin:0 0 12px;">${escapeHtml(line.slice(2))}</h1>`;
      }
      if (line.startsWith('## ')) {
        return `<h2 style="font-size:15px;margin:20px 0 8px;">${escapeHtml(line.slice(3))}</h2>`;
      }
      if (line.trim() === '') return '<br/>';
      if (line.startsWith('- ')) {
        return `<p style="margin:4px 0 4px 12px;">• ${escapeHtml(line.slice(2))}</p>`;
      }
      return `<p style="margin:8px 0;">${escapeHtml(line)}</p>`;
    })
    .join('');

  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 14px; color: #111; max-width: 560px;">
      <p style="color:#555; font-size:13px; margin:0 0 16px;">${escapeHtml(tenantName)} · ${escapeHtml(dateLabel)}</p>
      ${body}
      <p style="margin-top: 24px;"><a href="${escapeHtml(dayUrl)}" style="color: #2563eb;">Open day in Courseday</a></p>
    </div>
  `;
}

export type MorningBriefCronResult = {
  ok: true;
  tenantsInWindow: number;
  emailsSent: number;
  tenantsSkippedNoPlan: number;
  tenantsSkippedNoAi: number;
  errors: string[];
};

/**
 * 7:00 local time for each tenant: send daily brief email to all members
 * when day has at least one activity, reservation, or breakfast.
 */
export async function runMorningBriefEmailCron(): Promise<MorningBriefCronResult> {
  const supabase = createSupabaseServiceClient();
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'Courseday <onboarding@resend.dev>';
  const resend = resendKey ? new Resend(resendKey) : null;

  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, slug, timezone');

  if (tenantsError || !tenants) {
    return {
      ok: true,
      tenantsInWindow: 0,
      emailsSent: 0,
      tenantsSkippedNoPlan: 0,
      tenantsSkippedNoAi: 0,
      errors: [tenantsError?.message ?? 'No tenants.'],
    };
  }

  const now = new Date();
  const errors: string[] = [];
  let tenantsInWindow = 0;
  let emailsSent = 0;
  let tenantsSkippedNoPlan = 0;
  let tenantsSkippedNoAi = 0;

  for (const tenant of tenants) {
    const tz = tenant.timezone || 'UTC';
    const zoned = toZonedTime(now, tz);
    if (zoned.getHours() !== 7) continue;
    tenantsInWindow += 1;

    const dateIso = getTenantToday(tz);
    const dayRes = await ensureDayForTenant(tenant.id, dateIso);
    if (!dayRes.success) {
      errors.push(`${tenant.slug}: ${dayRes.error}`);
      continue;
    }
    const dayId = dayRes.data.id;

    const [activities, reservations, breakfasts, dayNotes] = await Promise.all([
      getProgramItemsForDayWithClient(supabase, tenant.id, dayId),
      getReservationsForDayWithClient(supabase, tenant.id, dayId),
      getBreakfastConfigsForDayWithClient(supabase, tenant.id, dayId),
      getDayNotesForDayWithClient(supabase, tenant.id, dayId),
    ]);

    if (!dayHasPlannedContent(activities, reservations, breakfasts)) {
      tenantsSkippedNoPlan += 1;
      continue;
    }

    let brief: DailyBriefRecord | null = await getDailyBriefForDayWithClient(
      supabase,
      tenant.id,
      dayId
    );

    if (!brief) {
      if (!process.env.AI_GATEWAY_API_KEY) {
        tenantsSkippedNoAi += 1;
        continue;
      }
      const weather = await getWeatherForTenantId(tenant.id, dateIso);
      const gen = await generateAndPersistDailyBrief(supabase, {
        tenantId: tenant.id,
        dayId,
        dateIso,
        generatedBy: null,
        activities,
        reservations,
        breakfasts,
        dayNotes,
        weather,
      });
      if (!gen.success) {
        errors.push(`${tenant.slug}: ${gen.error}`);
        continue;
      }
      brief = gen.data;
    }
    if (!brief) {
      errors.push(`${tenant.slug}: no brief after load/generate.`);
      continue;
    }

    const { data: members } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('tenant_id', tenant.id);

    if (!members?.length) continue;

    const { data: already } = await supabase
      .from('morning_brief_email_sent')
      .select('user_id')
      .eq('tenant_id', tenant.id)
      .eq('day_id', dayId);

    const alreadySent = new Set((already ?? []).map((r) => r.user_id));
    const dayUrl = tenantDayUrl(tenant.slug, dateIso);
    const dateLabel = dateIso;

    if (!resend) {
      if (!errors.some((e) => e.includes('RESEND_API_KEY'))) {
        errors.push('RESEND_API_KEY not set; no emails sent.');
      }
    } else {
      for (const m of members) {
        if (alreadySent.has(m.user_id)) continue;

        const { data: u, error: userErr } = await supabase.auth.admin.getUserById(
          m.user_id
        );
        if (userErr || !u.user?.email) {
          if (userErr) errors.push(`user ${m.user_id}: ${userErr.message}`);
          continue;
        }
        const to = u.user.email;
        const subject = `Daily brief — ${tenant.name} — ${dateLabel}`;
        const text = formatDailyBriefMarkdown(brief.content) + `\n\n${dayUrl}\n`;
        const html = briefToHtml(brief, tenant.name, dayUrl, dateLabel);

        const { error: sendErr } = await resend.emails.send({
          from,
          to,
          subject,
          text,
          html,
        });
        if (sendErr) {
          errors.push(`${to}: ${sendErr.message}`);
          continue;
        }

        const { error: insErr } = await supabase
          .from('morning_brief_email_sent')
          .insert({
            tenant_id: tenant.id,
            day_id: dayId,
            user_id: m.user_id,
          });
        if (insErr) {
          errors.push(`log ${m.user_id}: ${insErr.message}`);
          continue;
        }
        emailsSent += 1;
      }
    }
  }

  return {
    ok: true,
    tenantsInWindow,
    emailsSent,
    tenantsSkippedNoPlan,
    tenantsSkippedNoAi,
    errors,
  };
}
