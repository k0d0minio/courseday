import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AiCallFeature = 'quick_add' | 'daily_brief'
type AiCallStatus = 'ok' | 'error'

type AiCallRow = {
  tenant_id: string | null
  feature: AiCallFeature
  duration_ms: number | null
  status: AiCallStatus
  created_at: string
}

type FeatureStats = {
  total: number
  errors: number
  errorRate: number
  p50: number | null
  p95: number | null
}

type TenantUsage = {
  tenantId: string | null
  total: number
  errors: number
  avgLatency: number | null
}

const FEATURES: AiCallFeature[] = ['quick_add', 'daily_brief']

const FEATURE_LABEL: Record<AiCallFeature, string> = {
  quick_add: 'Quick Add',
  daily_brief: 'Daily Brief',
}

function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1)
  return sortedAsc[Math.max(0, idx)] ?? null
}

function statsForRows(rows: AiCallRow[]): FeatureStats {
  const total = rows.length
  const errors = rows.reduce((n, r) => n + (r.status === 'error' ? 1 : 0), 0)
  const durations = rows
    .map((r) => r.duration_ms)
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b)
  return {
    total,
    errors,
    errorRate: total === 0 ? 0 : errors / total,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
  }
}

function topTenants(rows: AiCallRow[], limit: number): TenantUsage[] {
  const map = new Map<string, { total: number; errors: number; sum: number; durCount: number }>()
  for (const r of rows) {
    const key = r.tenant_id ?? '__unknown__'
    const cur = map.get(key) ?? { total: 0, errors: 0, sum: 0, durCount: 0 }
    cur.total += 1
    if (r.status === 'error') cur.errors += 1
    if (typeof r.duration_ms === 'number') {
      cur.sum += r.duration_ms
      cur.durCount += 1
    }
    map.set(key, cur)
  }
  return [...map.entries()]
    .map(([key, v]) => ({
      tenantId: key === '__unknown__' ? null : key,
      total: v.total,
      errors: v.errors,
      avgLatency: v.durCount === 0 ? null : Math.round(v.sum / v.durCount),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

function formatMs(value: number | null): string {
  if (value == null) return '—'
  if (value < 1000) return `${value} ms`
  return `${(value / 1000).toFixed(2)} s`
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

async function loadAiUsage(): Promise<{ rows7d: AiCallRow[]; rows24h: AiCallRow[] }> {
  const now = Date.now()
  const since7dIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since24hMs = now - 24 * 60 * 60 * 1000

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('ai_call_log')
    .select('tenant_id, feature, duration_ms, status, created_at')
    .gte('created_at', since7dIso)

  if (error) {
    console.error('[ai-usage] load failed:', error.message)
    return { rows7d: [], rows24h: [] }
  }
  const rows7d = (data ?? []) as AiCallRow[]
  const rows24h = rows7d.filter((r) => new Date(r.created_at).getTime() >= since24hMs)
  return { rows7d, rows24h }
}

export async function AdminAiUsage({
  tenantNamesById,
}: {
  tenantNamesById: Record<string, string>
}) {
  const { rows7d, rows24h } = await loadAiUsage()

  const total24h = rows24h.length
  const total7d = rows7d.length
  const errors24h = rows24h.reduce((n, r) => n + (r.status === 'error' ? 1 : 0), 0)
  const errors7d = rows7d.reduce((n, r) => n + (r.status === 'error' ? 1 : 0), 0)

  const perFeature24h: Record<AiCallFeature, FeatureStats> = {
    quick_add: statsForRows(rows24h.filter((r) => r.feature === 'quick_add')),
    daily_brief: statsForRows(rows24h.filter((r) => r.feature === 'daily_brief')),
  }
  const perFeature7d: Record<AiCallFeature, FeatureStats> = {
    quick_add: statsForRows(rows7d.filter((r) => r.feature === 'quick_add')),
    daily_brief: statsForRows(rows7d.filter((r) => r.feature === 'daily_brief')),
  }

  const topTenants7d = topTenants(rows7d, 10)

  return (
    <div id="ai-usage" className="space-y-6">
      <h2 className="text-2xl font-bold">AI Usage</h2>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Calls (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{total24h}</p>
            <p className="text-muted-foreground text-xs">
              {errors24h} error{errors24h === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Calls (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{total7d}</p>
            <p className="text-muted-foreground text-xs">
              {errors7d} error{errors7d === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Error rate (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {total24h === 0 ? '—' : formatPct(errors24h / total24h)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Error rate (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {total7d === 0 ? '—' : formatPct(errors7d / total7d)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per feature (last 7d)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Feature</th>
                  <th className="py-2 text-right font-medium">Calls</th>
                  <th className="py-2 text-right font-medium">Errors</th>
                  <th className="py-2 text-right font-medium">Error rate</th>
                  <th className="py-2 text-right font-medium">p50</th>
                  <th className="py-2 text-right font-medium">p95</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => {
                  const s = perFeature7d[feature]
                  return (
                    <tr key={feature} className="border-b last:border-0">
                      <td className="py-2">{FEATURE_LABEL[feature]}</td>
                      <td className="py-2 text-right tabular-nums">{s.total}</td>
                      <td className="py-2 text-right tabular-nums">{s.errors}</td>
                      <td className="py-2 text-right tabular-nums">
                        {s.total === 0 ? '—' : formatPct(s.errorRate)}
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatMs(s.p50)}</td>
                      <td className="py-2 text-right tabular-nums">{formatMs(s.p95)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per feature (last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Feature</th>
                  <th className="py-2 text-right font-medium">Calls</th>
                  <th className="py-2 text-right font-medium">Errors</th>
                  <th className="py-2 text-right font-medium">Error rate</th>
                  <th className="py-2 text-right font-medium">p50</th>
                  <th className="py-2 text-right font-medium">p95</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => {
                  const s = perFeature24h[feature]
                  return (
                    <tr key={feature} className="border-b last:border-0">
                      <td className="py-2">{FEATURE_LABEL[feature]}</td>
                      <td className="py-2 text-right tabular-nums">{s.total}</td>
                      <td className="py-2 text-right tabular-nums">{s.errors}</td>
                      <td className="py-2 text-right tabular-nums">
                        {s.total === 0 ? '—' : formatPct(s.errorRate)}
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatMs(s.p50)}</td>
                      <td className="py-2 text-right tabular-nums">{formatMs(s.p95)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top tenants by volume (7d)</CardTitle>
        </CardHeader>
        <CardContent>
          {topTenants7d.length === 0 ? (
            <p className="text-muted-foreground text-sm">No AI calls recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-xs uppercase">
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Tenant</th>
                    <th className="py-2 text-right font-medium">Calls</th>
                    <th className="py-2 text-right font-medium">Errors</th>
                    <th className="py-2 text-right font-medium">Avg latency</th>
                  </tr>
                </thead>
                <tbody>
                  {topTenants7d.map((t) => {
                    const name = t.tenantId
                      ? (tenantNamesById[t.tenantId] ?? t.tenantId.slice(0, 8))
                      : '— (deleted)'
                    return (
                      <tr key={t.tenantId ?? '__unknown__'} className="border-b last:border-0">
                        <td className="py-2">{name}</td>
                        <td className="py-2 text-right tabular-nums">{t.total}</td>
                        <td className="py-2 text-right tabular-nums">{t.errors}</td>
                        <td className="py-2 text-right tabular-nums">{formatMs(t.avgLatency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
