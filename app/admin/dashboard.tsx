'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { deleteTenant } from '@/app/actions/tenants';
import { setFeatureFlag } from '@/app/actions/feature-flags';
import { KNOWN_FLAGS, FLAG_LABELS } from '@/lib/feature-flags';
import type { FlagMap } from '@/lib/feature-flags';
import { rootDomain, protocol } from '@/lib/utils';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  language: string;
  created_at: string;
};

function TenantCard({
  tenant,
  initialFlags,
  onDelete,
  isDeleting,
}: {
  tenant: Tenant;
  initialFlags: FlagMap;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [flags, setFlags] = useState(initialFlags);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleFlagChange(key: (typeof KNOWN_FLAGS)[number], enabled: boolean) {
    setFlags((prev) => ({ ...prev, [key]: enabled }));
    startTransition(async () => {
      await setFeatureFlag(tenant.id, key, enabled);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{tenant.name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            disabled={isDeleting}
            onClick={() => onDelete(tenant.id)}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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
        <p className="text-sm text-gray-500">{tenant.slug}</p>
        <p className="text-sm text-gray-500">Language: {tenant.language}</p>
        <p className="text-sm text-gray-500 mt-1">
          Created: {new Date(tenant.created_at).toLocaleDateString()}
        </p>
        <div className="mt-3">
          <a
            href={`${protocol}://${tenant.slug}.${rootDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-sm"
          >
            Visit tenant →
          </a>
        </div>

        {/* Feature flags */}
        <div className="mt-4 border-t pt-3">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
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
            <div className="mt-3 space-y-2">
              {KNOWN_FLAGS.map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`flag-${tenant.id}-${key}`} className="text-sm">
                    {FLAG_LABELS[key]}
                  </Label>
                  <Switch
                    id={`flag-${tenant.id}-${key}`}
                    checked={flags[key]}
                    disabled={isPending}
                    onCheckedChange={(checked) => handleFlagChange(key, checked)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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

  return (
    <div className="space-y-6 relative p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tenant Management</h1>
        <Link
          href={`${protocol}://${rootDomain}`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {rootDomain}
        </Link>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No tenants yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((tenant) => (
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
