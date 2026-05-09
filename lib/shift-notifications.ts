import { createSupabaseServiceClient } from '@/lib/supabase-server'

async function resolveDateIso(dayId: string): Promise<string> {
  const svc = createSupabaseServiceClient()
  const { data } = await svc.from('day').select('date_iso').eq('id', dayId).maybeSingle()
  return (data as { date_iso: string } | null)?.date_iso ?? dayId
}

function fmt(t: string | null | undefined): string {
  return t ?? '—'
}

export async function notifyShiftAssigned(params: {
  tenantId: string
  actorId: string
  assigneeId: string
  dayId: string
  startTime?: string | null
  endTime?: string | null
}): Promise<void> {
  if (params.actorId === params.assigneeId) return
  const dateIso = await resolveDateIso(params.dayId)
  const svc = createSupabaseServiceClient()
  await svc.from('notifications').insert({
    tenant_id: params.tenantId,
    user_id: params.assigneeId,
    title: `New shift on ${dateIso}`,
    body: `${fmt(params.startTime)} – ${fmt(params.endTime)}`,
    link: `/day/${dateIso}`,
  })
}

export async function notifyShiftUpdatedSameUser(params: {
  tenantId: string
  actorId: string
  assigneeId: string
  dayId: string
  startTime?: string | null
  endTime?: string | null
}): Promise<void> {
  if (params.actorId === params.assigneeId) return
  const dateIso = await resolveDateIso(params.dayId)
  const svc = createSupabaseServiceClient()
  await svc.from('notifications').insert({
    tenant_id: params.tenantId,
    user_id: params.assigneeId,
    title: `Shift updated on ${dateIso}`,
    body: `${fmt(params.startTime)} – ${fmt(params.endTime)}`,
    link: `/day/${dateIso}`,
  })
}

export async function notifyShiftReassigned(params: {
  tenantId: string
  actorId: string
  newAssigneeId: string
  oldAssigneeId: string
  dayId: string
  startTime?: string | null
  endTime?: string | null
}): Promise<void> {
  const dateIso = await resolveDateIso(params.dayId)
  const svc = createSupabaseServiceClient()
  const rows: {
    tenant_id: string
    user_id: string
    title: string
    body: string | null
    link: string | null
  }[] = []

  if (params.oldAssigneeId !== params.actorId) {
    rows.push({
      tenant_id: params.tenantId,
      user_id: params.oldAssigneeId,
      title: `Shift removed on ${dateIso}`,
      body: null,
      link: null,
    })
  }
  if (params.newAssigneeId !== params.actorId) {
    rows.push({
      tenant_id: params.tenantId,
      user_id: params.newAssigneeId,
      title: `New shift on ${dateIso}`,
      body: `${fmt(params.startTime)} – ${fmt(params.endTime)}`,
      link: `/day/${dateIso}`,
    })
  }
  if (rows.length > 0) await svc.from('notifications').insert(rows)
}

export async function notifyShiftCancelled(params: {
  tenantId: string
  actorId: string
  assigneeId: string
  dayId: string
}): Promise<void> {
  if (params.actorId === params.assigneeId) return
  const dateIso = await resolveDateIso(params.dayId)
  const svc = createSupabaseServiceClient()
  await svc.from('notifications').insert({
    tenant_id: params.tenantId,
    user_id: params.assigneeId,
    title: `Shift cancelled on ${dateIso}`,
    body: null,
    link: null,
  })
}
