'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2, ChevronDown, ChevronUp, PauseCircle, PlayCircle, Archive, Search } from 'lucide-react';
import Link from 'next/link';
import { deleteTenant, suspendTenant, reactivateTenant, archiveTenant } from '@/app/actions/tenants';
import { setFeatureFlag } from '@/app/actions/feature-flags';
import { KNOWN_FLAGS, FLAG_LABELS, FLAG_DESCRIPTIONS } from '@/lib/feature-flags';
import type { FlagMap } from '@/lib/feature-flags';
import { rootDomain, protocol } from '@/lib/utils';
import type { TenantStatus } from '@/app/actions/tenants';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  language: string;
  created_at: string;
  status: TenantStatus;
};

const STATUS_BADGE: Record<TenantStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  archived: { label: 'Archived', variant: 'secondary' },
};

function DeleteConfirmDialog({
  tenant,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  tenant: Tenant;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const [typed, setTyped] = useState('');
  const canDelete = typed === tenant.slug;

  return (
    <AlertDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTyped(''); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {tenant.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the tenant and all associated data. This cannot be undone.
            Type <strong>{tenant.slug}</strong> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={tenant.slug}
          autoComplete="off"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!canDelete || isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</> : 'Delete permanently'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TenantCard({
  tenant: initialTenant,
  initialFlags,
  onDelete,
  isDeleting,
}: {
  tenant: Tenant;
  initialFlags: FlagMap;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [tenant, setTenant] = useState(initialTenant);
  const [flags, setFlags] = useState(initialFlags);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isStatusPending, startStatusTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { label: statusLabel, variant: statusVariant } = STATUS_BADGE[tenant.status];

  function handleFlagChange(key: (typeof KNOWN_FLAGS)[number], enabled: boolean) {
    setFlags((prev) => ({ ...prev, [key]: enabled }));
    startTransition(async () => {
      await setFeatureFlag(tenant.id, key, enabled);
    });
  }

  function handleStatusChange(action: 'suspend' | 'reactivate' | 'archive') {
    startStatusTransition(async () => {
      const fn = action === 'suspend' ? suspendTenant : action === 'reactivate' ? reactivateTenant : archiveTenant;
      const result = await fn(tenant.id);
      if (result.success) {
        const next: TenantStatus = action === 'suspend' ? 'suspended' : action === 'reactivate' ? 'active' : 'archived';
        setTenant((t) => ({ ...t, status: next }));
      }
    });
  }

  return (
    <>
      <Card className={tenant.status === 'archived' ? 'opacity-60' : undefined}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CardTitle className="text-xl truncate">{tenant.name}</CardTitle>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={isDeleting || isStatusPending}
              onClick={() => setDeleteOpen(true)}
              aria-label={`Delete ${tenant.name}`}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"
            >
              {isDeleting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tenant.slug}</p>
          <p className="text-sm text-muted-foreground">Language: {tenant.language}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Created: {new Date(tenant.created_at).toLocaleDateString()}
          </p>
          <div className="mt-3">
            <a
              href={`${protocol}://${tenant.slug}.${rootDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              Visit tenant →
            </a>
          </div>

          {/* Lifecycle actions */}
          {tenant.status !== 'archived' && (
            <div className="mt-3 flex gap-2">
              {tenant.status === 'active' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isStatusPending}
                    onClick={() => handleStatusChange('suspend')}
                  >
                    <PauseCircle className="h-4 w-4 mr-1" /> Suspend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isStatusPending}
                    onClick={() => handleStatusChange('archive')}
                  >
                    <Archive className="h-4 w-4 mr-1" /> Archive
                  </Button>
                </>
              )}
              {tenant.status === 'suspended' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isStatusPending}
                    onClick={() => handleStatusChange('reactivate')}
                  >
                    <PlayCircle className="h-4 w-4 mr-1" /> Reactivate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isStatusPending}
                    onClick={() => handleStatusChange('archive')}
                  >
                    <Archive className="h-4 w-4 mr-1" /> Archive
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Feature flags */}
          <div className="mt-4 border-t pt-3">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              Feature Flags
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expanded && (
              <div className="mt-3 space-y-4">
                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Activities</p>
                      <p className="text-xs text-muted-foreground">
                        Core functionality. Always on.
                      </p>
                    </div>
                    <Badge variant="secondary">Always on</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Toggleable Features
                  </p>
                  {KNOWN_FLAGS.map((key) => (
                    <div key={key} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`flag-${tenant.id}-${key}`} className="text-sm">
                            {FLAG_LABELS[key]}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {FLAG_DESCRIPTIONS[key]}
                          </p>
                        </div>
                        <Switch
                          id={`flag-${tenant.id}-${key}`}
                          checked={flags[key]}
                          disabled={isPending}
                          onCheckedChange={(checked) => handleFlagChange(key, checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {isPending && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving feature settings...
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        tenant={tenant}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => { setDeleteOpen(false); onDelete(tenant.id); }}
        isDeleting={isDeleting}
      />
    </>
  );
}

export function AdminDashboard({
  tenants,
  flagsByTenant,
}: {
  tenants: Tenant[];
  flagsByTenant: Record<string, FlagMap>;
}) {
  const [list, setList] = useState(tenants);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TenantStatus>('all');

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteTenant(id);
      if (result.success) {
        setList((prev) => prev.filter((t) => t.id !== id));
      }
      setDeletingId(null);
    });
  }

  const filteredList = useMemo(() => {
    return list.filter((tenant) => {
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      if (!matchesStatus) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return tenant.name.toLowerCase().includes(q) || tenant.slug.toLowerCase().includes(q);
    });
  }, [list, search, statusFilter]);

  const totalTenants = list.length;
  const activeCount = list.filter((tenant) => tenant.status === 'active').length;
  const suspendedCount = list.filter((tenant) => tenant.status === 'suspended').length;
  const archivedCount = list.filter((tenant) => tenant.status === 'archived').length;

  const featureAdoption = KNOWN_FLAGS.map((key) => {
    const enabledCount = list.reduce((count, tenant) => {
      return count + (flagsByTenant[tenant.id]?.[key] ? 1 : 0);
    }, 0);
    const adoptionRate = totalTenants === 0 ? 0 : Math.round((enabledCount / totalTenants) * 100);

    return {
      key,
      label: FLAG_LABELS[key],
      enabledCount,
      adoptionRate,
    };
  });

  return (
    <div id="tenants" className="space-y-6 relative">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Tenant Management</h1>
        <Link
          href={`${protocol}://${rootDomain}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {rootDomain}
        </Link>
      </div>

      <div id="overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{totalTenants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{suspendedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{archivedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Adoption</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {featureAdoption.map((feature) => (
            <div key={feature.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{feature.label}</span>
                <span className="text-muted-foreground">
                  {feature.enabledCount}/{totalTenants} ({feature.adoptionRate}%)
                </span>
              </div>
              <div className="h-2 w-full rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${feature.adoptionRate}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tenant name or slug"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as 'all' | TenantStatus)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredList.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {list.length === 0 ? 'No tenants yet.' : 'No tenants match current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredList.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              initialFlags={flagsByTenant[tenant.id]}
              onDelete={handleDelete}
              isDeleting={deletingId === tenant.id && isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
