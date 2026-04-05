'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  createFeatureRequest,
  getTenantFeatureRequests,
  featureRequestSchema,
} from '@/app/actions/feature-requests';
import type { FeatureRequest, FeatureRequestFormData, FeatureRequestStatus } from '@/app/actions/feature-requests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<FeatureRequestStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  reviewing: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  shipped: 'bg-purple-100 text-purple-700',
};

function StatusBadge({ status, label }: { status: FeatureRequestStatus; label: string }) {
  return (
    <Badge variant="outline" className={cn('border-0', STATUS_CLASSES[status])}>
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeatureRequestManagement() {
  const t = useTranslations('Tenant.featureRequests');
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeatureRequestFormData>({
    resolver: zodResolver(featureRequestSchema),
    defaultValues: { title: '', description: '' },
  });

  useEffect(() => {
    getTenantFeatureRequests().then((result) => {
      if (result.success) setRequests(result.data);
      setLoading(false);
    });
  }, []);

  function onSubmit(data: FeatureRequestFormData) {
    startTransition(async () => {
      const result = await createFeatureRequest(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t('submitted'));
      reset();
      setRequests((prev) => [result.data, ...prev]);
    });
  }

  const statusLabel = (status: FeatureRequestStatus) =>
    t(`status${status.charAt(0).toUpperCase() + status.slice(1)}` as
      'statusPending' | 'statusReviewing' | 'statusAccepted' | 'statusRejected' | 'statusShipped');

  return (
    <div className="space-y-8">
      {/* Submit form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <h2 className="text-lg font-semibold">{t('new')}</h2>

        <div className="space-y-2">
          <Label htmlFor="fr-title">{t('titleLabel')}</Label>
          <Input
            id="fr-title"
            placeholder={t('titlePlaceholder')}
            {...register('title')}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fr-description">{t('descriptionLabel')}</Label>
          <Textarea
            id="fr-description"
            placeholder={t('descriptionPlaceholder')}
            rows={3}
            {...register('description')}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>

      {/* Existing requests */}
      <div className="space-y-3">
        <h3 className="text-base font-medium">{t('title')}</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noRequests')}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-lg border p-4 space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{req.title}</p>
                  <StatusBadge status={req.status} label={statusLabel(req.status)} />
                </div>
                {req.description && (
                  <p className="text-sm text-muted-foreground">{req.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
