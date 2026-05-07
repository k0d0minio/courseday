'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { getTemplates, deleteTemplate } from '@/app/actions/schedule-templates'
import type { ScheduleTemplate } from '@/app/actions/schedule-templates'
import { ScheduleTemplateEditorDialog } from '@/components/schedule-template-editor-dialog'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function ScheduleTemplateManagement() {
  const t = useTranslations('Tenant.templates')
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleTemplate | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getTemplates()
    if (result.success) {
      setTemplates(result.data)
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(tmpl: ScheduleTemplate) {
    setEditing(tmpl)
    setEditorOpen(true)
  }

  function handleSaved(tmpl: ScheduleTemplate) {
    setTemplates((prev) => {
      const idx = prev.findIndex((x) => x.id === tmpl.id)
      if (idx === -1) return [...prev, tmpl].sort((a, b) => a.name.localeCompare(b.name))
      const next = [...prev]
      next[idx] = tmpl
      return next.sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const result = await deleteTemplate(id)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success(t('deleted'))
      setTemplates((prev) => prev.filter((tmpl) => tmpl.id !== id))
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground space-y-2 text-sm leading-relaxed">
        <p>{t('pageIntro')}</p>
        <p>{t('pageVsCopyDay')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-foreground text-sm font-medium">
          {t('listHeading', { count: templates.length })}
        </h2>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('newTemplate')}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      ) : templates.length === 0 ? (
        <div className="bg-muted/20 space-y-3 rounded-lg border border-dashed px-4 py-8 text-center">
          <p className="text-muted-foreground text-sm">{t('settingsEmpty')}</p>
          <Button type="button" onClick={openCreate} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            {t('newTemplate')}
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {templates.map((tmpl) => (
            <li
              key={tmpl.id}
              className="bg-card flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{tmpl.name}</p>
                <p className="text-muted-foreground text-xs">
                  {t('activityCount', { count: tmpl.items.length })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => openEdit(tmpl)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  {t('edit')}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={deleting === tmpl.id}>
                      {deleting === tmpl.id ? t('deleting') : t('delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deleteDescription', { name: tmpl.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(tmpl.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ScheduleTemplateEditorDialog
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o)
          if (!o) setEditing(null)
        }}
        template={editing}
        onSaved={handleSaved}
      />
    </div>
  )
}
