'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  getMembers,
  getPendingInvitations,
  inviteMember,
  updateMemberRole,
  removeMember,
  cancelInvitation,
} from '@/app/actions/memberships'
import type { Member, PendingInvitation, MemberRole } from '@/app/actions/memberships'
import { useFeatureFlag } from '@/lib/feature-flags-context'
import { MemberEditDialog } from '@/components/member-edit-dialog'
import { MemberScheduleEditor } from '@/components/member-schedule-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function RoleBadge({ role, label }: { role: MemberRole; label: string }) {
  return (
    <Badge variant={role === 'editor' ? 'default' : 'secondary'} className="font-normal">
      {label}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Single-role invite dialog
// ---------------------------------------------------------------------------

function InviteDialog({
  role,
  open,
  onOpenChange,
  onInvited,
}: {
  role: MemberRole
  open: boolean
  onOpenChange: (v: boolean) => void
  onInvited: () => void
}) {
  const t = useTranslations('Tenant.members')
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await inviteMember(email, role)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(result.data.emailed ? t('invited') : t('invitedExisting'))
      setEmail('')
      onOpenChange(false)
      onInvited()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {role === 'editor' ? t('inviteEditorTitle') : t('inviteStaffTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Input
            type="email"
            placeholder={t('emailPlaceholder')}
            aria-label={t('emailLabel')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t('cancelAction')}
            </Button>
            <Button type="submit" disabled={isPending}>
              <UserPlus className="size-4 shrink-0" aria-hidden />
              {isPending ? t('inviting') : t('invite')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Invite section — two buttons
// ---------------------------------------------------------------------------

function InviteSection({ onInvited }: { onInvited: () => void }) {
  const t = useTranslations('Tenant.members')
  const [inviteRole, setInviteRole] = useState<MemberRole | null>(null)

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="bg-muted/40 border-b px-5 py-4 sm:px-6">
          <CardTitle className="text-base">{t('inviteTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:px-6">
          <Button
            variant="outline"
            onClick={() => setInviteRole('editor')}
            className="flex-1 sm:flex-none"
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            {t('inviteEditor')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setInviteRole('staff')}
            className="flex-1 sm:flex-none"
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            {t('inviteStaff')}
          </Button>
        </CardContent>
      </Card>

      <InviteDialog
        role={inviteRole ?? 'staff'}
        open={inviteRole !== null}
        onOpenChange={(v) => {
          if (!v) setInviteRole(null)
        }}
        onInvited={onInvited}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MemberManagement({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations('Tenant.members')
  const showStaffSchedule = useFeatureFlag('staff_schedule')
  const [members, setMembers] = useState<Member[]>([])
  const [pending, setPending] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [editTarget, setEditTarget] = useState<Member | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<Member | null>(null)
  const [isRemoving, startRemoveTransition] = useTransition()
  const [isCancelling, startCancelTransition] = useTransition()

  async function refresh() {
    const [membersResult, pendingResult] = await Promise.all([
      getMembers(),
      getPendingInvitations(),
    ])
    if (membersResult.success) {
      setMembers(membersResult.data)
    } else {
      toast.error(membersResult.error)
      setLoadError(membersResult.error)
    }
    if (pendingResult.success) {
      setPending(pendingResult.data)
    } else {
      toast.error(pendingResult.error)
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  function handleMemberSaved(id: string, patch: Partial<Member>) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function handleRoleChange(member: Member, newRole: MemberRole) {
    startRemoveTransition(async () => {
      const result = await updateMemberRole(member.id, newRole)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(t('roleUpdated'))
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)))
    })
  }

  function confirmRemove() {
    if (!removeTarget) return
    startRemoveTransition(async () => {
      const result = await removeMember(removeTarget.id)
      if (!result.success) {
        toast.error(result.error)
        setRemoveTarget(null)
        return
      }
      toast.success(t('removed'))
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id))
      setRemoveTarget(null)
    })
  }

  function handleCancelInvitation(invitation: PendingInvitation) {
    startCancelTransition(async () => {
      const result = await cancelInvitation(invitation.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(t('cancelledInvite'))
      setPending((prev) => prev.filter((p) => p.id !== invitation.id))
    })
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">{t('loading')}</p>
  }

  if (loadError) {
    return <p className="text-destructive text-sm">{loadError}</p>
  }

  return (
    <div className="space-y-8">
      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <h2 className="sr-only">{t('title')}</h2>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="text-muted-foreground px-6 py-10 text-center text-sm">{t('noMembers')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b hover:bg-transparent">
                    <TableHead className="h-11 min-w-[12rem] pl-6 font-medium">
                      {t('email')}
                    </TableHead>
                    <TableHead className="h-11 w-[10.5rem] min-w-[10.5rem] font-medium">
                      {t('role')}
                    </TableHead>
                    <TableHead className="h-11 w-36 font-medium">{t('joined')}</TableHead>
                    <TableHead className="h-11 w-14 pr-6" aria-hidden />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const isSelf = member.user_id === currentUserId
                    const roleLabel = member.role === 'editor' ? t('roleEditor') : t('roleStaff')
                    return (
                      <TableRow key={member.id} className="hover:bg-muted/40">
                        <TableCell className="max-w-[18rem] truncate py-3 pl-6 font-medium">
                          {member.email}
                        </TableCell>
                        <TableCell className="py-3 align-middle">
                          {isSelf ? (
                            <RoleBadge role={member.role} label={roleLabel} />
                          ) : (
                            <Select
                              value={member.role}
                              onValueChange={(v) => handleRoleChange(member, v as MemberRole)}
                            >
                              <SelectTrigger
                                className="!h-10 min-h-10 w-full max-w-[11rem] min-w-[9rem]"
                                aria-label={t('roleLabel')}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent align="start">
                                <SelectItem value="staff">{t('roleStaff')}</SelectItem>
                                <SelectItem value="editor">{t('roleEditor')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3 text-sm tabular-nums">
                          {new Date(member.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-3 pr-6 text-right">
                          {!isSelf && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="iconSm"
                                onClick={() => setEditTarget(member)}
                                aria-label={t('editMember')}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              {showStaffSchedule && (
                                <Button
                                  variant="ghost"
                                  size="iconSm"
                                  onClick={() => setScheduleTarget(member)}
                                  aria-label={t('editSchedule')}
                                >
                                  <CalendarDays className="size-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive size-9"
                                onClick={() => setRemoveTarget(member)}
                                aria-label={t('removeTitle')}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteSection onInvited={refresh} />

      {pending.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0 shadow-sm">
          <CardHeader className="bg-muted/40 border-b px-5 py-4 sm:px-6">
            <CardTitle className="text-base">{t('pendingTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 min-w-[12rem] pl-6 font-medium">
                      {t('email')}
                    </TableHead>
                    <TableHead className="h-11 w-36 font-medium">{t('role')}</TableHead>
                    <TableHead className="h-11 w-32 pr-6 text-right" aria-hidden />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-muted/40">
                      <TableCell className="text-muted-foreground max-w-[18rem] truncate py-3 pl-6">
                        {inv.email}
                      </TableCell>
                      <TableCell className="py-3">
                        <RoleBadge
                          role={inv.role}
                          label={inv.role === 'editor' ? t('roleEditor') : t('roleStaff')}
                        />
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right">
                        <Button
                          variant="outline"
                          disabled={isCancelling}
                          onClick={() => handleCancelInvitation(inv)}
                        >
                          {t('cancel')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <MemberEditDialog
        member={editTarget}
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null)
        }}
        onSaved={(patch) => {
          if (editTarget) handleMemberSaved(editTarget.id, patch)
        }}
      />

      <MemberScheduleEditor
        member={scheduleTarget}
        open={!!scheduleTarget}
        onOpenChange={(v) => {
          if (!v) setScheduleTarget(null)
        }}
      />

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(v) => {
          if (!v) setRemoveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{removeTarget?.email}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelAction')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? t('removing') : t('remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
