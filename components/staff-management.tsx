'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  getAllStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
} from '@/app/actions/staff';
import {
  getAllStaffRoles,
  createStaffRole,
  updateStaffRole,
  deleteStaffRole,
} from '@/app/actions/staff-role';
import { staffMemberSchema, type StaffMemberFormData } from '@/lib/staff-schema';
import { staffRoleSchema, type StaffRoleFormData } from '@/lib/staff-role-schema';
import type { StaffMember, StaffRole } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

function StaffRoleDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: StaffRole | null;
  onSaved: (r: StaffRole) => void;
}) {
  const t = useTranslations('Tenant.staff.settings.roleDialog');
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffRoleFormData>({
    resolver: standardSchemaResolver(staffRoleSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    reset(initial ? { name: initial.name } : { name: '' });
  }, [initial, open, reset]);

  function onSubmit(data: StaffRoleFormData) {
    startTransition(async () => {
      const result = initial
        ? await updateStaffRole(initial.id, data)
        : await createStaffRole(data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(initial ? t('updated') : t('created'));
      onSaved(result.data);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? t('editTitle') : t('addTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sr-name">{t('nameLabel')}</Label>
            <Input id="sr-name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StaffMemberDialog({
  open,
  onOpenChange,
  initial,
  rolePresets,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: StaffMember | null;
  rolePresets: StaffRole[];
  onSaved: (m: StaffMember) => void;
}) {
  const t = useTranslations('Tenant.staff.settings.memberDialog');
  const [isPending, startTransition] = useTransition();
  const datalistId = 'staff-settings-role-presets';
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<StaffMemberFormData>({
    resolver: standardSchemaResolver(staffMemberSchema),
    defaultValues: { name: '', role: '', active: true },
  });

  useEffect(() => {
    reset(
      initial
        ? { name: initial.name, role: initial.role ?? '', active: initial.active }
        : { name: '', role: '', active: true }
    );
  }, [initial, open, reset]);

  function onSubmit(data: StaffMemberFormData) {
    startTransition(async () => {
      const result = initial
        ? await updateStaffMember(initial.id, data)
        : await createStaffMember(data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(initial ? t('updated') : t('created'));
      onSaved(result.data);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? t('editTitle') : t('addTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sm-name">{t('nameLabel')}</Label>
            <Input id="sm-name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sm-role">{t('roleLabel')}</Label>
            <Input id="sm-role" list={datalistId} {...register('role')} />
            <datalist id={datalistId}>
              {rolePresets.map((r) => (
                <option key={r.id} value={r.name} />
              ))}
            </datalist>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <Label htmlFor="sm-active" className="cursor-pointer">
              {t('activeLabel')}
            </Label>
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <Switch
                  id="sm-active"
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StaffManagement() {
  const t = useTranslations('Tenant.staff.settings');
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<StaffRole | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<StaffRole | null>(null);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<StaffMember | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    const [mr, rr] = await Promise.all([getAllStaffMembers(), getAllStaffRoles()]);
    if (mr.success && mr.data) setMembers(mr.data);
    if (rr.success && rr.data) setRoles(rr.data);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleDeleteRole() {
    if (!deleteRoleTarget) return;
    startTransition(async () => {
      const result = await deleteStaffRole(deleteRoleTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRoles((prev) => prev.filter((r) => r.id !== deleteRoleTarget.id));
      toast.success(t('roleDeleted'));
      setDeleteRoleTarget(null);
    });
  }

  function handleDeleteMember() {
    if (!deleteMemberTarget) return;
    startTransition(async () => {
      const result = await deleteStaffMember(deleteMemberTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== deleteMemberTarget.id));
      toast.success(t('memberDeleted'));
      setDeleteMemberTarget(null);
    });
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">{t('rolesHeading')}</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditRole(null);
              setRoleDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('addRole')}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t('rolesDescription')}</p>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noRoles')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('roleNameCol')}</TableHead>
                <TableHead className="w-[100px] text-right">{t('actionsCol')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditRole(r);
                        setRoleDialogOpen(true);
                      }}
                      aria-label={t('editRoleAria')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteRoleTarget(r)}
                      aria-label={t('deleteRoleAria')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">{t('membersHeading')}</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditMember(null);
              setMemberDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('addMember')}
          </Button>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noMembers')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('memberNameCol')}</TableHead>
                <TableHead>{t('memberRoleCol')}</TableHead>
                <TableHead className="w-[90px]">{t('memberActiveCol')}</TableHead>
                <TableHead className="w-[100px] text-right">{t('actionsCol')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.role || '—'}</TableCell>
                  <TableCell>{m.active ? t('activeYes') : t('activeNo')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditMember(m);
                        setMemberDialogOpen(true);
                      }}
                      aria-label={t('editMemberAria')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteMemberTarget(m)}
                      aria-label={t('deleteMemberAria')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <StaffRoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        initial={editRole}
        onSaved={(r) => {
          setRoles((prev) => {
            const idx = prev.findIndex((x) => x.id === r.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = r;
              return next.sort((a, b) => a.name.localeCompare(b.name));
            }
            return [...prev, r].sort((a, b) => a.name.localeCompare(b.name));
          });
        }}
      />

      <StaffMemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        initial={editMember}
        rolePresets={roles}
        onSaved={(m) => {
          setMembers((prev) => {
            const idx = prev.findIndex((x) => x.id === m.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = m;
              return next;
            }
            return [...prev, m];
          });
        }}
      />

      <AlertDialog
        open={!!deleteRoleTarget}
        onOpenChange={(o) => !o && setDeleteRoleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteRoleTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteRoleDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} disabled={isPending}>
              {isPending ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteMemberTarget}
        onOpenChange={(o) => !o && setDeleteMemberTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteMemberTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteMemberDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} disabled={isPending}>
              {isPending ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
