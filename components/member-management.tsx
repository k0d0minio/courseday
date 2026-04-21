'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  getMembers,
  getPendingInvitations,
  inviteMember,
  updateMemberRole,
  removeMember,
  cancelInvitation,
} from '@/app/actions/memberships';
import type { Member, PendingInvitation, MemberRole } from '@/app/actions/memberships';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function RoleBadge({
  role,
  label,
}: {
  role: MemberRole;
  label: string;
}) {
  return (
    <Badge variant={role === 'editor' ? 'default' : 'secondary'} className="font-normal">
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Invite form
// ---------------------------------------------------------------------------

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const t = useTranslations('Tenant.members');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('viewer');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteMember(email, role);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.emailed ? t('invited') : t('invitedExisting'));
      setEmail('');
      setRole('viewer');
      onInvited();
    });
  }

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b bg-muted/40 px-5 py-4 sm:px-6">
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
                <SelectItem value="viewer">{t('roleViewer')}</SelectItem>
                <SelectItem value="editor">{t('roleEditor')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="submit"
              className="h-10 min-h-10 w-full shrink-0 px-5 sm:w-auto"
              disabled={isPending}
            >
              <UserPlus className="size-4 shrink-0" aria-hidden />
              {isPending ? t('inviting') : t('invite')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MemberManagement({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations('Tenant.members');
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();

  async function refresh() {
    const [membersResult, pendingResult] = await Promise.all([
      getMembers(),
      getPendingInvitations(),
    ]);
    if (membersResult.success) {
      setMembers(membersResult.data);
    } else {
      toast.error(membersResult.error);
      setLoadError(membersResult.error);
    }
    if (pendingResult.success) {
      setPending(pendingResult.data);
    } else {
      toast.error(pendingResult.error);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  function handleRoleChange(member: Member, newRole: MemberRole) {
    startRemoveTransition(async () => {
      const result = await updateMemberRole(member.id, newRole);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t('roleUpdated'));
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
      );
    });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    startRemoveTransition(async () => {
      const result = await removeMember(removeTarget.id);
      if (!result.success) {
        toast.error(result.error);
        setRemoveTarget(null);
        return;
      }
      toast.success(t('removed'));
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      setRemoveTarget(null);
    });
  }

  function handleCancelInvitation(invitation: PendingInvitation) {
    startCancelTransition(async () => {
      const result = await cancelInvitation(invitation.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t('cancelledInvite'));
      setPending((prev) => prev.filter((p) => p.id !== invitation.id));
    });
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  return (
    <div className="space-y-8">
      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <h2 className="sr-only">{t('title')}</h2>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              {t('noMembers')}
            </p>
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
                    const isSelf = member.user_id === currentUserId;
                    const roleLabel =
                      member.role === 'editor' ? t('roleEditor') : t('roleViewer');
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
                                className="!h-10 min-h-10 w-full min-w-[9rem] max-w-[11rem]"
                                aria-label={t('roleLabel')}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent align="start">
                                <SelectItem value="viewer">{t('roleViewer')}</SelectItem>
                                <SelectItem value="editor">{t('roleEditor')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                          {new Date(member.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-3 pr-6 text-right">
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-9 text-muted-foreground hover:text-destructive"
                              onClick={() => setRemoveTarget(member)}
                              aria-label={t('removeTitle')}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
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
          <CardHeader className="border-b bg-muted/40 px-5 py-4 sm:px-6">
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
                      <TableCell className="max-w-[18rem] truncate py-3 pl-6 text-muted-foreground">
                        {inv.email}
                      </TableCell>
                      <TableCell className="py-3">
                        <RoleBadge
                          role={inv.role}
                          label={
                            inv.role === 'editor' ? t('roleEditor') : t('roleViewer')
                          }
                        />
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9"
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

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(v) => {
          if (!v) setRemoveTarget(null);
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
  );
}
