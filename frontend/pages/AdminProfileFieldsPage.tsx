import { useEffect, useState } from 'react'
import { useGetProfileFieldDefs } from '../hooks/backend/admin'
import { useSaveProfileFieldDef } from '../hooks/backend/admin'
import { useDeleteProfileFieldDef } from '../hooks/backend/admin'
import AdminNav from '../components/AdminNav'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Textarea } from '../lib/shadcn/textarea'
import { Label } from '../lib/shadcn/label'
import { Switch } from '../lib/shadcn/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../lib/shadcn/dialog'
import { cn } from '../lib/shadcn/utils'
import {
  Plus, Trash2, Edit, AlertCircle, CheckCircle, Type, Hash, Mail,
  Phone, Calendar, List, AlignLeft, ToggleRight,
} from 'lucide-react'

type FieldDef = {
  id: number
  field_key: string
  field_label: string
  field_type: string
  is_required: boolean
  is_active: boolean
  placeholder: string | null
  help_text: string | null
  sort_order: number
  options: Array<{ label: string; value: string }> | null
}

const FIELD_TYPES = [
  { value: 'text',     label: 'Text',      icon: Type,        desc: 'Single-line text' },
  { value: 'textarea', label: 'Text Area',  icon: AlignLeft,   desc: 'Multi-line text' },
  { value: 'email',    label: 'Email',      icon: Mail,        desc: 'Email address' },
  { value: 'phone',    label: 'Phone',      icon: Phone,       desc: 'Phone number' },
  { value: 'date',     label: 'Date',       icon: Calendar,    desc: 'Date picker' },
  { value: 'number',   label: 'Number',     icon: Hash,        desc: 'Numeric value' },
  { value: 'select',   label: 'Dropdown',   icon: List,        desc: 'Pick from list' },
  { value: 'yes_no',   label: 'Yes / No',   icon: ToggleRight, desc: 'Boolean toggle' },
]

function toKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const emptyForm = {
  id: undefined as number | undefined,
  field_key: '', field_label: '', field_type: 'text',
  is_required: false, is_active: true,
  placeholder: '', help_text: '', options_raw: '',
}

export default function AdminProfileFieldsPage() {
  const { data, trigger: reload, loading } = useGetProfileFieldDefs()
  const { trigger: saveFn, loading: saving } = useSaveProfileFieldDef()
  const { trigger: deleteFn } = useDeleteProfileFieldDef()

  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<FieldDef | null>(null)

  useEffect(() => { reload({}, { skipCache: true }) }, [])

  const fields = (data as FieldDef[] | undefined) ?? []

  function openNew() {
    setForm({ ...emptyForm })
    setFormError('')
    setShowDialog(true)
  }

  function openEdit(f: FieldDef) {
    setForm({
      id: f.id,
      field_key: f.field_key,
      field_label: f.field_label,
      field_type: f.field_type,
      is_required: f.is_required,
      is_active: f.is_active,
      placeholder: f.placeholder ?? '',
      help_text: f.help_text ?? '',
      options_raw: f.options ? f.options.map(o => `${o.label}:${o.value}`).join('\n') : '',
    })
    setFormError('')
    setShowDialog(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.field_label.trim()) { setFormError('Label is required.'); return }
    if (!form.field_key.trim()) { setFormError('Field key is required.'); return }

    let options: Array<{ label: string; value: string }> | undefined
    if (form.field_type === 'select' && form.options_raw.trim()) {
      options = form.options_raw.split('\n').filter(Boolean).map(line => {
        const [label, value] = line.split(':')
        return { label: (label ?? line).trim(), value: (value ?? label ?? line).trim() }
      })
    }

    try {
      await saveFn({
        ...(form.id ? { id: form.id } : {}),
        field_key: form.field_key,
        field_label: form.field_label,
        field_type: form.field_type,
        is_required: form.is_required,
        is_active: form.is_active,
        sort_order: form.id ? (fields.find(f => f.id === form.id)?.sort_order ?? 99) : fields.length,
        ...(form.placeholder ? { placeholder: form.placeholder } : {}),
        ...(form.help_text ? { help_text: form.help_text } : {}),
        ...(options ? { options } : {}),
      })
      setShowDialog(false)
      reload({}, { skipCache: true })
      setToast(form.id ? 'Field updated.' : 'Field added.')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteFn({ id: deleteTarget.id })
    setDeleteTarget(null)
    reload({}, { skipCache: true })
  }

  const typeIcon = (t: string) => FIELD_TYPES.find(f => f.value === t)?.icon ?? Type

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Profile Fields</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure what identity & profile information clients must provide during onboarding.</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Add Field</Button>
        </div>

        {toast && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />{toast}
          </div>
        )}

        {/* Field cards */}
        {loading && <div className="text-sm text-muted-foreground py-6 text-center">Loading fields…</div>}
        <div className="space-y-2">
          {fields.map((f, i) => {
            const Icon = typeIcon(f.field_type)
            return (
              <div key={f.id} className={cn(
                'flex items-center gap-4 px-5 py-3.5 rounded-xl border bg-card',
                !f.is_active && 'opacity-50'
              )}>
                <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">{i + 1}</span>
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{f.field_label}</span>
                    {f.is_required && <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold">Required</span>}
                    {!f.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{f.field_key}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">{f.field_type.replace('_', ' ')}</span>
                    {f.options && <span className="text-xs text-muted-foreground">· {f.options.length} options</span>}
                  </div>
                  {f.help_text && <p className="text-xs text-muted-foreground mt-0.5 italic truncate">{f.help_text}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(f)} className="gap-1.5 text-xs">
                    <Edit className="w-3.5 h-3.5" />Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(f)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
          {fields.length === 0 && !loading && (
            <div className="text-center py-10 text-muted-foreground border rounded-xl border-dashed">
              <p className="text-sm">No fields defined yet. Click "Add Field" to start.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit / New Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Field' : 'Add Profile Field'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Field Label <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Date of Birth" value={form.field_label}
                  onChange={e => setForm(f => ({ ...f, field_label: e.target.value, field_key: f.id ? f.field_key : toKey(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Field Key <span className="text-destructive">*</span></Label>
                <Input placeholder="date_of_birth" value={form.field_key} className="font-mono text-sm"
                  onChange={e => setForm(f => ({ ...f, field_key: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Field Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {FIELD_TYPES.map(t => {
                  const TIcon = t.icon
                  return (
                    <button key={t.value} type="button"
                      onClick={() => setForm(f => ({ ...f, field_type: t.value }))}
                      className={cn('flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 text-xs font-medium transition-all',
                        form.field_type === t.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      )}>
                      <TIcon className="w-4 h-4" />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {form.field_type === 'select' && (
              <div className="space-y-1.5">
                <Label>Options <span className="text-muted-foreground font-normal">(one per line: Label:value)</span></Label>
                <Textarea rows={5} className="font-mono text-xs resize-none"
                  placeholder={"United Kingdom:gb\nUnited States:us\nOther:other"}
                  value={form.options_raw}
                  onChange={e => setForm(f => ({ ...f, options_raw: e.target.value }))} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Placeholder</Label>
                <Input placeholder="e.g. +1 (555) 000-0000" value={form.placeholder}
                  onChange={e => setForm(f => ({ ...f, placeholder: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Help Text</Label>
                <Input placeholder="Short hint shown below the field" value={form.help_text}
                  onChange={e => setForm(f => ({ ...f, help_text: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch id="req-toggle" checked={form.is_required}
                  onCheckedChange={v => setForm(f => ({ ...f, is_required: v }))} />
                <Label htmlFor="req-toggle" className="cursor-pointer">Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="active-toggle" checked={form.is_active}
                  onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label htmlFor="active-toggle" className="cursor-pointer">Active</Label>
              </div>
            </div>

            {formError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : form.id ? 'Save Changes' : 'Add Field'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Field?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete <strong className="text-foreground">"{deleteTarget?.field_label}"</strong>? Existing profile data using this key will be preserved but no longer shown.</p>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
