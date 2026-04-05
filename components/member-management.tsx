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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      toast.success(t('invited'));
      setEmail('');
      setRole('viewer');
      onInvited();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-base font-medium">{t('inviteTitle')}</h3>
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-48 space-y-2">
          <Label htmlFor="invite-email">{t('emailLabel')}</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">{t('roleLabel')}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
            <SelectTrigger id="invite-role" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">{t('roleViewer')}</SelectItem>
              <SelectItem value="editor">{t('roleEditor')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={isPending}>
          <UserPlus className="w-4 h-4 mr-1" />
          {isPending ? t('inviting') : t('invite')}
        </Button>
      </div>
    </form>
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
      {/* Current members */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noMembers')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('joined')}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isSelf = member.user_id === currentUserId;
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.email}</TableCell>
                    <TableCell>
                      {isSelf ? (
                        <span className="text-sm">{t(`role${member.role.charAt(0).toUpperCase() + member.role.slice(1)}` as 'roleEditor' | 'roleViewer')}</span>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member, v as MemberRole)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">{t('roleViewer')}</SelectItem>
                            <SelectItem value="editor">{t('roleEditor')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemoveTarget(member)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invite form */}
      <InviteForm onInvited={refresh} />

      {/* Pending invitations */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-medium">{t('pendingTitle')}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="text-muted-foreground">{inv.email}</TableCell>
                  <TableCell className="text-sm">
                    {t(`role${inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}` as 'roleEditor' | 'roleViewer')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
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
      )}

      {/* Remove confirmation */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(v) => { if (!v) setRemoveTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.email}
            </AlertDialogDescription>
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
