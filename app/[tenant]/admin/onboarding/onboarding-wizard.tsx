'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { completeOnboarding } from '@/app/actions/tenants'
import { SettingsForm } from '@/app/[tenant]/admin/settings/settings-form'
import { LanguageSettings } from '@/app/[tenant]/admin/settings/language-settings'
import { VenueTypeManagement } from '@/components/venue-type-management'
import { PocManagement } from '@/components/poc-management'
import { MemberManagement } from '@/components/member-management'
import { Button } from '@/components/ui/button'

const STEPS = ['branding', 'language', 'venueTypes', 'poc', 'team'] as const
type Step = (typeof STEPS)[number]

interface OnboardingWizardProps {
  tenantId: string
  currentUserId: string
  initialPaletteId: string | null
  initialAccentColor: string | null
  initialLogoUrl: string | null
}

export function OnboardingWizard({
  tenantId,
  currentUserId,
  initialPaletteId,
  initialAccentColor,
  initialLogoUrl,
}: OnboardingWizardProps) {
  const t = useTranslations('Tenant.onboarding')
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isPending, startTransition] = useTransition()

  const totalSteps = STEPS.length
  const isLast = currentStep === totalSteps - 1

  async function finish() {
    startTransition(async () => {
      await completeOnboarding(tenantId)
      router.push('/')
    })
  }

  function handleNext() {
    if (isLast) {
      finish()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  function handleSkipAll() {
    finish()
  }

  const stepLabels: Record<Step, string> = {
    branding: t('stepBranding'),
    language: t('stepLanguage'),
    venueTypes: t('stepVenueTypes'),
    poc: t('stepPoc'),
    team: t('stepTeam'),
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <div key={step} className="flex min-w-0 flex-1 items-center">
              <div className="flex flex-shrink-0 flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors ${
                    done
                      ? 'bg-primary border-primary text-primary-foreground'
                      : active
                        ? 'border-primary text-primary bg-background'
                        : 'border-muted-foreground/30 text-muted-foreground/50 bg-background'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`hidden text-xs whitespace-nowrap sm:block ${
                    active ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {stepLabels[step]}
                </span>
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 transition-colors ${
                    done ? 'bg-primary' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step label for mobile */}
      <p className="text-sm font-medium sm:hidden">
        {t('stepOf', { current: currentStep + 1, total: totalSteps })}
        {' · '}
        {stepLabels[STEPS[currentStep]]}
      </p>

      {/* Step content */}
      <div className="min-h-48">
        {STEPS[currentStep] === 'branding' && (
          <SettingsForm
            tenantId={tenantId}
            initialPaletteId={initialPaletteId}
            initialAccentColor={initialAccentColor}
            initialLogoUrl={initialLogoUrl}
            initialLatitude={null}
            initialLongitude={null}
          />
        )}
        {STEPS[currentStep] === 'language' && <LanguageSettings />}
        {STEPS[currentStep] === 'venueTypes' && <VenueTypeManagement />}
        {STEPS[currentStep] === 'poc' && <PocManagement />}
        {STEPS[currentStep] === 'team' && <MemberManagement currentUserId={currentUserId} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button
              variant="ghost"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={isPending}
            >
              {t('back')}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleSkipAll}
            disabled={isPending}
            className="text-muted-foreground"
          >
            {t('skipAll')}
          </Button>
        </div>
        <Button onClick={handleNext} disabled={isPending}>
          {isPending ? t('finishing') : isLast ? t('done') : t('next')}
        </Button>
      </div>
    </div>
  )
}
