'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { updateMember } from '@/app/actions/memberships'
import type { Member } from '@/app/actions/memberships'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface MemberEditDialogProps {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: Partial<Member>) => void
}

export function MemberEditDialog({ member, open, onOpenChange, onSaved }: MemberEditDialogProps) {
  const t = useTranslations('Tenant.members')
  const [isPending, startTransition] = useTransition()

  const [firstName, setFirstName] = useState(member?.first_name ?? '')
  const [lastName, setLastName] = useState(member?.last_name ?? '')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [jobTitle, setJobTitle] = useState(member?.job_title ?? '')
  const [rateStr, setRateStr] = useState(member?.hourly_rate?.toString() ?? '')
  const [currency, setCurrency] = useState(member?.currency ?? 'EUR')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Reset local state when member changes
  function initFromMember(m: Member | null) {
    setFirstName(m?.first_name ?? '')
    setLastName(m?.last_name ?? '')
    setPhone(m?.phone ?? '')
    setJobTitle(m?.job_title ?? '')
    setRateStr(m?.hourly_rate?.toString() ?? '')
    setCurrency(m?.currency ?? 'EUR')
    setPhoneError(null)
  }

  function handleOpenChange(v: boolean) {
    if (v && member) initFromMember(member)
    if (!v) initFromMember(null)
    onOpenChange(v)
  }

  function handleSave() {
    if (!member) return
    const phoneTrimmed = phone.trim().replace(/\s/g, '')
    const phoneRegex = /^\+?[1-9]\d{7,14}$/
    if (phoneTrimmed && !phoneRegex.test(phoneTrimmed)) {
      setPhoneError(t('phoneError'))
      return
    }
    setPhoneError(null)

    const hourlyRate = rateStr.trim() === '' ? null : parseFloat(rateStr)
    if (hourlyRate !== null && (isNaN(hourlyRate) || hourlyRate < 0)) {
      toast.error(t('payRate.invalidRate'))
      return
    }
    const cur = currency.trim().toUpperCase()
    if (cur && !/^[A-Z]{3}$/.test(cur)) {
      toast.error(t('payRate.invalidCurrency'))
      return
    }

    startTransition(async () => {
      const result = await updateMember(member.id, {
        first_name: firstName,
        last_name: lastName,
        phone: phoneTrimmed,
        job_title: jobTitle,
        hourly_rate: hourlyRate,
        currency: cur,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(t('saved'))
      onSaved({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phoneTrimmed || null,
        job_title: jobTitle.trim() || null,
        hourly_rate: hourlyRate,
        currency: cur || null,
      })
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editMember')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">{t('firstName')}</Label>
              <Input
                id="edit-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last-name">{t('lastName')}</Label>
              <Input
                id="edit-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">{t('phone')}</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setPhoneError(null)
              }}
              placeholder={t('phonePlaceholder')}
            />
            {phoneError && <p className="text-destructive text-xs">{phoneError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-job-title">{t('jobTitle')}</Label>
            <Input
              id="edit-job-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-rate">{t('hourlyRate')}</Label>
              <Input
                id="edit-rate"
                type="number"
                min={0}
                step="0.01"
                value={rateStr}
                onChange={(e) => setRateStr(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-currency">{t('currency')}</Label>
              <Input
                id="edit-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="EUR"
                maxLength={3}
                className="uppercase"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('cancelAction')}
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
