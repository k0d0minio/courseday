'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ClipboardCopy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { generateDailyBrief } from '@/app/actions/daily-brief';
import type { DailyBriefRecord } from '@/types/daily-brief';
import { formatDailyBriefMarkdown } from '@/lib/daily-brief-format';

const REGENERATE_DEBOUNCE_MS = 2000;

type Props = {
  dateIso: string;
  dayId: string;
  initialBrief: DailyBriefRecord | null;
  isEditor: boolean;
};

export function DailyBriefCard({ dateIso, dayId, initialBrief, isEditor }: Props) {
  const t = useTranslations('Tenant.dailyBrief');
  const router = useRouter();
  const [brief, setBrief] = useState<DailyBriefRecord | null>(initialBrief);
  const [loading, setLoading] = useState(false);
  const lastRegenerateAt = useRef(0);

  useEffect(() => {
    setBrief(initialBrief);
  }, [initialBrief, dayId]);

  const runGenerate = useCallback(async () => {
    const now = Date.now();
    if (now - lastRegenerateAt.current < REGENERATE_DEBOUNCE_MS) {
      toast.message(t('debounced'));
      return;
    }
    lastRegenerateAt.current = now;

    setLoading(true);
    try {
      const result = await generateDailyBrief(dateIso);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setBrief(result.data);
      toast.success(t('generated'));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }, [dateIso, router, t]);

  const copyMarkdown = useCallback(() => {
    if (!brief) return;
    const md = formatDailyBriefMarkdown(brief.content);
    void navigator.clipboard.writeText(md).then(
      () => toast.success(t('copied')),
      () => toast.error(t('copyFailed'))
    );
  }, [brief, t]);

  const hasBrief = brief !== null;

  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 border-b bg-muted/30">
        <div className="space-y-1 min-w-0">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            {t('title')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasBrief && (
            <Button type="button" variant="outline" size="sm" onClick={copyMarkdown}>
              <ClipboardCopy className="h-4 w-4 mr-1" />
              {t('copy')}
            </Button>
          )}
          {isEditor && (
            <Button
              type="button"
              size="sm"
              onClick={() => void runGenerate()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {hasBrief ? t('regenerate') : t('generate')}
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isEditor && (
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 rounded-md px-2.5 py-2">
            {t('costWarning')}
          </p>
        )}

        {!hasBrief && !loading && (
          <p className="text-sm text-muted-foreground">
            {isEditor ? t('emptyEditor') : t('emptyViewer')}
          </p>
        )}

        {loading && !hasBrief && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('generating')}
          </p>
        )}

        {brief && (
          <div className="space-y-3">
            <div>
              <p className="text-base font-semibold leading-snug">{brief.content.headline}</p>
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                {brief.content.summary}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md bg-muted/50 py-2">
                <div className="text-muted-foreground text-xs">{t('coversBreakfast')}</div>
                <div className="font-semibold tabular-nums">{brief.content.covers.breakfast}</div>
              </div>
              <div className="rounded-md bg-muted/50 py-2">
                <div className="text-muted-foreground text-xs">{t('coversActivities')}</div>
                <div className="font-semibold tabular-nums">{brief.content.covers.activities}</div>
              </div>
              <div className="rounded-md bg-muted/50 py-2">
                <div className="text-muted-foreground text-xs">{t('coversReservations')}</div>
                <div className="font-semibold tabular-nums">{brief.content.covers.reservations}</div>
              </div>
            </div>

            <details className="group text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground py-1 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">{t('more')}</span>
                <span className="hidden group-open:inline">{t('less')}</span>
              </summary>
              <div className="space-y-3 pt-2">
                <ListBlock title={t('vip')} items={brief.content.vipNotes} />
                <AllergenBlock rollup={brief.content.allergenRollup} t={t} />
                <ListBlock title={t('risks')} items={brief.content.risks} />
                <ListBlock title={t('actions')} items={brief.content.suggestedActions} />
                <p className="text-xs text-muted-foreground pt-1">
                  {t('meta', {
                    time: new Date(brief.generated_at).toLocaleString(),
                    model: brief.model,
                  })}
                </p>
              </div>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="font-medium text-foreground mb-1">{title}</div>
      <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function AllergenBlock({
  rollup,
  t,
}: {
  rollup: DailyBriefRecord['content']['allergenRollup'];
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (rollup.length === 0) return null;
  return (
    <div>
      <div className="font-medium text-foreground mb-1">{t('allergens')}</div>
      <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
        {rollup.map((a) => (
          <li key={a.code}>
            <span className="font-mono text-xs">{a.code}</span>
            {a.inActivities ? ` · ${t('srcActivity', { n: a.inActivities })}` : ''}
            {a.inReservations ? ` · ${t('srcReservation', { n: a.inReservations })}` : ''}
            {a.inBreakfast ? ` · ${t('srcBreakfast', { n: a.inBreakfast })}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
