'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { updateMemberProfile, updateStaffProfile } from '@/app/actions/memberships'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface ProfileFormProps {
  initialFirstName: string
  initialLastName: string
  initialJobTitle: string
  /** When set, the form edits another user's profile (editor-edits-staff mode). */
  membershipId?: string
  onSaved?: () => void
}

export function ProfileForm({
  initialFirstName,
  initialLastName,
  initialJobTitle,
  membershipId,
  onSaved,
}: ProfileFormProps) {
  const t = useTranslations('Tenant.profile')
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [jobTitle, setJobTitle] = useState(initialJobTitle)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const result = membershipId
        ? await updateStaffProfile(membershipId, {
            first_name: firstName,
            last_name: lastName,
            job_title: jobTitle,
          })
        : await updateMemberProfile({
            first_name: firstName,
            last_name: lastName,
            job_title: jobTitle,
          })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(t('saved'))
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first-name">{t('firstNameLabel')}</Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">{t('lastNameLabel')}</Label>
            <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-title">{t('jobTitleLabel')}</Label>
          <Input
            id="job-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder={t('jobTitlePlaceholder')}
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('saving') : t('save')}
        </Button>
      </CardContent>
    </Card>
  )
}
