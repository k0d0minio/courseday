'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  getAllFeatureRequests,
  updateFeatureRequestStatus,
} from '@/app/actions/feature-requests';
import type { FeatureRequest, FeatureRequestStatus } from '@/app/actions/feature-requests';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: FeatureRequestStatus[] = [
  'pending', 'reviewing', 'accepted', 'rejected', 'shipped',
];

const STATUS_CLASSES: Record<FeatureRequestStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  reviewing: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

const STATUS_LABELS: Record<FeatureRequestStatus, string> = {
  pending: 'Pending',
  reviewing: 'Reviewing',
  accepted: 'Accepted',
  rejected: 'Rejected',
  shipped: 'Shipped',
};

function StatusBadge({ status }: { status: FeatureRequestStatus }) {
  return (
    <Badge variant="outline" className={cn('border-0', STATUS_CLASSES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function FeatureRequestRow({
  request,
  tenantName,
}: {
  request: FeatureRequest;
  tenantName: string;
}) {
  const [status, setStatus] = useState(request.status);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: FeatureRequestStatus) {
    setStatus(newStatus);
    startTransition(async () => {
      const result = await updateFeatureRequestStatus(request.id, newStatus);
      if (!result.success) {
        toast.error(result.error);
        setStatus(request.status);
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium text-sm max-w-xs">
        <div>
          <p className="font-medium">{request.title}</p>
          {request.description && (
            <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">
              {request.description}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{tenantName}</TableCell>
      <TableCell>
        <Select
          value={status}
          onValueChange={(v) => handleStatusChange(v as FeatureRequestStatus)}
          disabled={isPending}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue>
              <StatusBadge status={status} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                <StatusBadge status={s} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {new Date(request.created_at).toLocaleDateString()}
      </TableCell>
    </TableRow>
  );
}

export function AdminFeatureRequests({
  tenants,
}: {
  tenants: { id: string; name: string }[];
}) {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  useEffect(() => {
    getAllFeatureRequests().then((result) => {
      if (result.success) setRequests(result.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading feature requests…</p>;
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No feature requests yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Request</TableHead>
          <TableHead>Tenant</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => (
          <FeatureRequestRow
            key={req.id}
            request={req}
            tenantName={tenantMap.get(req.tenant_id) ?? req.tenant_id}
          />
        ))}
      </TableBody>
    </Table>
  );
}
