import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetQuestionSets } from '../hooks/backend/questions'
import { useDeleteQuestionSet } from '../hooks/backend/questions'
import { useSaveQuestionSet } from '../hooks/backend/questions'
import AdminNav from '../components/AdminNav'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../lib/shadcn/dialog'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import { Textarea } from '../lib/shadcn/textarea'
import { Switch } from '../lib/shadcn/switch'
import {
  Plus, ClipboardList, Edit, Trash2, AlertCircle,
  FileText, ToggleRight, Paperclip, Image, AlignLeft,
} from 'lucide-react'

const DECLARATION_TYPES = [
  'Financial Disclosure', 'Identity Verification', 'Compliance Declaration',
  'Inquiry Submission', 'Questionnaire', 'Statement Disclosure',
]

type QuestionSet = {
  id: number
  title: string
  description: string | null
  declaration_type: string
  is_active: boolean
  question_count: number
  created_at: string
  updated_at: string
}

export default function QuestionsPage() {
  const navigate = useNavigate()
  const { data, loading, error, trigger } = useGetQuestionSets()
  const { trigger: triggerDelete } = useDeleteQuestionSet()
  const { trigger: triggerSave, loading: saving } = useSaveQuestionSet()

  const [showNewDialog, setShowNewDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<QuestionSet | null>(null)
  const [newForm, setNewForm] = useState({ title: '', description: '', declaration_type: '', is_active: true })
  const [createError, setCreateError] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => { trigger({}, { skipCache: true }) }, [])

  const sets = (data as QuestionSet[] | undefined) ?? []

  // Group by declaration type
  const grouped = DECLARATION_TYPES.reduce<Record<string, QuestionSet[]>>((acc, type) => {
    acc[type] = sets.filter(s => s.declaration_type === type)
    return acc
  }, {})
  const otherSets = sets.filter(s => !DECLARATION_TYPES.includes(s.declaration_type))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    if (!newForm.title.trim() || !newForm.declaration_type) {
      setCreateError('Title and declaration type are required.')
      return
    }
    try {
      const result = await triggerSave({
        title: newForm.title,
        ...(newForm.description ? { description: newForm.description } : {}),
        declaration_type: newForm.declaration_type,
        is_active: newForm.is_active,
      })
      setShowNewDialog(false)
      setNewForm({ title: '', description: '', declaration_type: '', is_active: true })
      const id = (result as { id?: number } | undefined)?.id
      if (id) navigate(`/questions/${id}`)
      else trigger({}, { skipCache: true })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create question set.')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await triggerDelete({ id: deleteTarget.id })
    setDeleteTarget(null)
    trigger({}, { skipCache: true })
  }

  async function handleToggleActive(set: QuestionSet) {
    setTogglingId(set.id)
    try {
      await triggerSave({
        id: set.id,
        title: set.title,
        ...(set.description ? { description: set.description } : {}),
        declaration_type: set.declaration_type,
        is_active: !set.is_active,
      })
      trigger({}, { skipCache: true })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Question Sets</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage survey-style questions for each declaration type. Clients answer these when submitting.
            </p>
          </div>
          <Button onClick={() => setShowNewDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Question Set
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Question type legend */}
        <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/40 border">
          <span className="text-xs font-medium text-muted-foreground self-center">Question types:</span>
          {[
            { type: 'open_text', label: 'Open Text', icon: AlignLeft, color: 'text-blue-600 dark:text-blue-400' },
            { type: 'yes_no', label: 'Yes / No', icon: ToggleRight, color: 'text-purple-600 dark:text-purple-400' },
            { type: 'file_upload', label: 'File Upload', icon: Paperclip, color: 'text-orange-600 dark:text-orange-400' },
            { type: 'image_upload', label: 'Image Upload', icon: Image, color: 'text-teal-600 dark:text-teal-400' },
          ].map(({ label, icon: Icon, color }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-foreground">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              {label}
            </span>
          ))}
        </div>

        {/* Grouped sections */}
        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading question sets…</div>
        ) : (
          <div className="space-y-6">
            {[...DECLARATION_TYPES.map(type => ({ type, items: grouped[type] ?? [] })), ...(otherSets.length ? [{ type: 'Other', items: otherSets }] : [])].map(({ type, items }) => (
              <div key={type}>
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">{type}</h2>
                  <div className="flex-1 h-px bg-border" />
                  {items.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No question sets</span>
                  )}
                </div>
                {items.length > 0 && (
                  <div className="grid grid-cols-1 gap-3">
                    {items.map(set => (
                      <Card key={set.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="px-5 py-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-foreground text-sm">{set.title}</span>
                                {set.is_active
                                  ? <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">Active</Badge>
                                  : <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                }
                              </div>
                              {set.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{set.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{set.question_count} question{set.question_count !== 1 ? 's' : ''}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">Updated {new Date(set.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                    <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={set.is_active}
                                  onCheckedChange={() => handleToggleActive(set)}
                                  disabled={togglingId === set.id}
                                  aria-label={set.is_active ? 'Deactivate' : 'Activate'}
                                />
                                <span className="text-xs text-muted-foreground w-14">{togglingId === set.id ? '…' : set.is_active ? 'Active' : 'Inactive'}</span>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => navigate(`/questions/${set.id}`)} className="gap-1.5">
                                <Edit className="w-3.5 h-3.5" />
                                Edit
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(set)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Set Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Question Set</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Financial Disclosure Form" value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Declaration Type <span className="text-destructive">*</span></Label>
              <Select value={newForm.declaration_type} onValueChange={v => setNewForm(f => ({ ...f, declaration_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>
                  {DECLARATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Optional description…" rows={2} value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={newForm.is_active} onCheckedChange={v => setNewForm(f => ({ ...f, is_active: v }))} id="new-active" />
              <Label htmlFor="new-active" className="cursor-pointer">Active (visible to clients)</Label>
            </div>
            {createError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{createError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowNewDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>Create & Edit Questions</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Question Set?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <span className="font-medium text-foreground">"{deleteTarget?.title}"</span> and all its questions. This cannot be undone.
          </p>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
