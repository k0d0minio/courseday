'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, Pencil, Trash2, UserPlus, X } from 'lucide-react'
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
import { ProfileForm } from '@/app/[tenant]/profile/profile-form'
import { updateMemberPayRate } from '@/app/actions/pay-rates'
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
// Pay rate inline editor
// ---------------------------------------------------------------------------

function PayRateEditor({
  member,
  onSaved,
}: {
  member: Member
  onSaved: (id: string, rate: number | null, currency: string | null) => void
}) {
  const t = useTranslations('Tenant.members')
  const [editing, setEditing] = useState(false)
  const [rateStr, setRateStr] = useState(member.hourly_rate?.toString() ?? '')
  const [currency, setCurrency] = useState(member.currency ?? 'EUR')
  const [isPending, startTransition] = useTransition()

  function handleEdit() {
    setRateStr(member.hourly_rate?.toString() ?? '')
    setCurrency(member.currency ?? 'EUR')
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
  }

  function handleSave() {
    const parsed = rateStr.trim() === '' ? null : parseFloat(rateStr)
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error(t('payRate.invalidRate'))
      return
    }
    const cur = currency.trim().toUpperCase()
    if (cur && !/^[A-Z]{3}$/.test(cur)) {
      toast.error(t('payRate.invalidCurrency'))
      return
    }
    startTransition(async () => {
      const result = await updateMemberPayRate(member.id, {
        hourly_rate: parsed,
        currency: cur || null,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(t('payRate.saved'))
      onSaved(member.id, parsed, cur || null)
      setEditing(false)
    })
  }

  if (!editing) {
    const display =
      member.hourly_rate !== null
        ? `${member.hourly_rate} ${member.currency ?? ''}`
        : t('payRate.notSet')
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-sm tabular-nums">{display}</span>
        <Button
          variant="ghost"
          size="iconXs"
          onClick={handleEdit}
          aria-label={t('payRate.editAria')}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={0}
        step="0.01"
        value={rateStr}
        onChange={(e) => setRateStr(e.target.value)}
        placeholder="0.00"
        className="h-8 w-20 text-sm"
        aria-label={t('payRate.rateLabel')}
      />
      <Input
        value={currency}
        onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
        placeholder="EUR"
        className="h-8 w-16 text-sm uppercase"
        aria-label={t('payRate.currencyLabel')}
        maxLength={3}
      />
      <Button
        variant="ghost"
        size="iconXs"
        disabled={isPending}
        onClick={handleSave}
        aria-label={t('payRate.saveAria')}
      >
        <Check className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="iconXs"
        onClick={handleCancel}
        aria-label={t('payRate.cancelAria')}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Invite form
// ---------------------------------------------------------------------------

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const t = useTranslations('Tenant.members')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('staff')
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
      setRole('staff')
      onInvited()
    })
  }

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="bg-muted/40 border-b px-5 py-4 sm:px-6">
        <CardTitle className="text-base">{t('inviteTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-5 sm:px-6">
        <form onSubmit={handleSubmit}>
          <p id="invite-fields-desc" className="sr-only">
            {t('emailLabel')}, {t('roleLabel')}
          </p>
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3"
            aria-describedby="invite-fields-desc"
          >
            <Input
              id="invite-email"
              type="email"
              className="h-10 min-h-10 w-full flex-1 sm:min-w-0"
              placeholder={t('emailPlaceholder')}
              aria-label={t('emailLabel')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
              <SelectTrigger
                id="invite-role"
                className="!h-10 min-h-10 w-full shrink-0 sm:w-[10.5rem]"
                aria-label={t('roleLabel')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="staff">{t('roleStaff')}</SelectItem>
                <SelectItem value="editor">{t('roleEditor')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="submit"
              size="lg"
              className="w-full shrink-0 sm:w-auto"
              disabled={isPending}
            >
              <UserPlus className="size-4 shrink-0" aria-hidden />
              {isPending ? t('inviting') : t('invite')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MemberManagement({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations('Tenant.members')
  const [members, setMembers] = useState<Member[]>([])
  const [pending, setPending] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [editProfileTarget, setEditProfileTarget] = useState<Member | null>(null)
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

  function handlePayRateSaved(id: string, rate: number | null, currency: string | null) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, hourly_rate: rate, currency } : m)))
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
                    <TableHead className="h-11 w-40 font-medium">{t('payRate.header')}</TableHead>
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
                        <TableCell className="py-3">
                          <PayRateEditor member={member} onSaved={handlePayRateSaved} />
                        </TableCell>
                        <TableCell className="py-3 pr-6 text-right">
                          {!isSelf && (
                            <div className="flex items-center justify-end gap-1">
                              {member.role === 'staff' && (
                                <Button
                                  variant="ghost"
                                  size="iconSm"
                                  onClick={() => setEditProfileTarget(member)}
                                  aria-label={t('editProfile')}
                                >
                                  <Pencil className="size-4" />
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

      <InviteForm onInvited={refresh} />

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

      <Dialog
        open={!!editProfileTarget}
        onOpenChange={(v) => {
          if (!v) setEditProfileTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editProfileTitle')}</DialogTitle>
          </DialogHeader>
          {editProfileTarget && (
            <ProfileForm
              membershipId={editProfileTarget.id}
              initialFirstName={editProfileTarget.first_name ?? ''}
              initialLastName={editProfileTarget.last_name ?? ''}
              initialJobTitle={editProfileTarget.job_title ?? ''}
              onSaved={() => setEditProfileTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

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
