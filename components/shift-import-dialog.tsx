'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Upload, Download, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { previewShiftImport, bulkCreateShifts } from '@/app/actions/shifts'
import type { ValidatedImportRow, BulkShiftRow } from '@/app/actions/shifts'

const TEMPLATE_CSV =
  'date,start_time,end_time,email,role\n2026-01-15,08:00,16:00,jane@example.com,Head chef\n'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ShiftImportDialog({ isOpen, onClose, onSuccess }: Props) {
  const t = useTranslations('Tenant.staff.importDialog')
  const fileRef = useRef<HTMLInputElement>(null)
  const [isParsing, startParsing] = useTransition()
  const [isImporting, startImporting] = useTransition()
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ValidatedImportRow[] | null>(null)

  const hasErrors = rows?.some((r) => r.status === 'error') ?? false
  const okRows =
    rows?.filter((r): r is ValidatedImportRow & { status: 'ok' } => r.status === 'ok') ?? []

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setRows(null)

    const formData = new FormData()
    formData.append('file', file)

    startParsing(async () => {
      const result = await previewShiftImport(formData)
      if (!result.success) {
        toast.error(result.error)
        setFileName(null)
        return
      }
      setRows(result.data)
    })

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function handleImport() {
    if (okRows.length === 0) return
    const bulkRows: BulkShiftRow[] = okRows.map((r) => ({
      date: r.date,
      user_id: r.user_id,
      start_time: r.start_time,
      end_time: r.end_time,
      role: r.role,
    }))

    startImporting(async () => {
      const result = await bulkCreateShifts(bulkRows)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(t('imported', { count: result.data.count }))
      setRows(null)
      setFileName(null)
      onSuccess()
      onClose()
    })
  }

  function handleDownloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shift-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleClose() {
    setRows(null)
    setFileName(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">{t('description')}</p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={isParsing || isImporting}
          >
            <Upload className="mr-2 size-4" />
            {isParsing ? t('parsing') : t('chooseFile')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={isParsing || isImporting}
          >
            <Download className="mr-2 size-4" />
            {t('downloadTemplate')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {fileName && rows && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              {t('accepted', { name: fileName, count: rows.length })}
            </p>

            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      {t('columnDate')}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      {t('columnStart')}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      {t('columnEnd')}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      {t('columnEmail')}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      {t('columnRole')}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      {t('columnStatus')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn('border-t', row.status === 'error' && 'bg-destructive/5')}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{row.date}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.start_time}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.end_time}</td>
                      <td className="px-3 py-2 text-xs">{row.email}</td>
                      <td className="px-3 py-2 text-xs">{row.role}</td>
                      <td className="px-3 py-2">
                        {row.status === 'ok' ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                            <CheckCircle2 className="size-3.5" />
                            {t('statusOk')}
                          </span>
                        ) : (
                          <span
                            className="text-destructive flex items-center gap-1 text-xs"
                            title={row.error}
                          >
                            <XCircle className="size-3.5 shrink-0" />
                            {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasErrors && <p className="text-destructive text-xs">{t('allErrors')}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isImporting}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!rows || hasErrors || okRows.length === 0 || isImporting || isParsing}
          >
            {isImporting ? t('importing') : t('importButton', { count: okRows.length })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
