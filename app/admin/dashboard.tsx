'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { deleteTenant } from '@/app/actions/tenants';
import { rootDomain, protocol } from '@/lib/utils';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  language: string;
  created_at: string;
};

export function AdminDashboard({ tenants }: { tenants: Tenant[] }) {
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
            <Card key={tenant.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{tenant.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => handleDelete(tenant.id)}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  >
                    {deletingId === tenant.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{tenant.slug}</p>
                <p className="text-sm text-gray-500">
                  Language: {tenant.language}
                </p>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
