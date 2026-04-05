'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { createCourse } from '@/app/actions/courses';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { protocol, rootDomain } from '@/lib/utils';

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export function NewTenantForm() {
  const t = useTranslations('Platform.new');
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlug(toSlug(value));
    setSlugEdited(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCourse({ email, password, name: name.trim(), slug });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!result.data.requiresConfirmation) {
        window.location.href = `${protocol}://${slug}.${rootDomain}/admin/onboarding`;
      } else {
        setCreatedSlug(slug);
      }
    });
  }

  if (createdSlug) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center">
            <Logo className="text-2xl" />
          </div>
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <p className="font-medium">{t('checkEmail')}</p>
              <p className="text-sm text-muted-foreground">
                {t('checkEmailBodyPrefix')} <strong>{email}</strong>. {t('checkEmailBodySuffix')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('checkEmailDomainPrefix')}{' '}
                <strong>{createdSlug}.{rootDomain}</strong>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo className="text-2xl" />
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold tracking-tight text-center">
              {t('title')}
            </h1>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="space-y-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('passwordLabel')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('nameLabel')}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">{t('slugLabel')}</Label>
                  <div className="flex items-center rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring overflow-hidden">
                    <input
                      id="slug"
                      className="flex-1 min-w-0 px-3 py-2 text-sm bg-transparent outline-none"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="pierpont"
                      required
                    />
                    <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-l whitespace-nowrap">
                      .{rootDomain}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('slugHint')}
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isPending || !email || !password || !name.trim() || !slug}
              >
                {isPending ? t('creating') : t('submitButton')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
