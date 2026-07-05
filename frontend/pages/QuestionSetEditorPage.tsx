import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetQuestionSet } from '../hooks/backend/questions'
import { useSaveQuestionSet } from '../hooks/backend/questions'
import { useSaveQuestion } from '../hooks/backend/questions'
import { useDeleteQuestion } from '../hooks/backend/questions'
import { useReorderQuestions } from '../hooks/backend/questions'
import AdminNav from '../components/AdminNav'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Textarea } from '../lib/shadcn/textarea'
import { Label } from '../lib/shadcn/label'
import { Switch } from '../lib/shadcn/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import { Separator } from '../lib/shadcn/separator'
import { cn } from '../lib/shadcn/utils'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save,
  AlignLeft, ToggleRight, Paperclip, Image, GripVertical,
  AlertCircle, CheckCircle, Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionSet = {
  id: number
  title: string
  description: string | null
  declaration_type: string
  is_active: boolean
}

type Question = {
  id?: number
  localId: string
  question_text: string
  question_type: string
  is_required: boolean
  help_text: string
  isDirty: boolean
  isNew: boolean
}

const QUESTION_TYPES = [
  { value: 'open_text',    label: 'Open Text',    icon: AlignLeft,   color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20',   desc: 'Free-form text response' },
  { value: 'yes_no',       label: 'Yes / No',     icon: ToggleRight, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', desc: 'Toggle yes or no' },
  { value: 'file_upload',  label: 'File Upload',  icon: Paperclip,   color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', desc: 'Document or PDF upload' },
  { value: 'image_upload', label: 'Image Upload', icon: Image,       color: 'text-teal-600 dark:text-teal-400',   bg: 'bg-teal-50 dark:bg-teal-900/20',   desc: 'Photo or image upload' },
] as const

const DECLARATION_TYPES = [
  'Financial Disclosure', 'Identity Verification', 'Compliance Declaration',
  'Inquiry Submission', 'Questionnaire', 'Statement Disclosure',
]

let localIdCounter = 0
function newLocalId() { return `local_${++localIdCounter}` }

// ─── Question Type Picker ──────────────────────────────────────────────────────

function TypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {QUESTION_TYPES.map(t => {
        const Icon = t.icon
        const isSelected = value === t.value
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-all',
              isSelected
                ? `${t.bg} border-current ${t.color} shadow-sm`
                : 'border-border hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('w-5 h-5', isSelected ? t.color : '')} />
            <span className="text-xs font-semibold leading-tight">{t.label}</span>
            <span className="text-xs opacity-70 leading-tight hidden sm:block">{t.desc}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Single Question Card ──────────────────────────────────────────────────────

function QuestionCard({
  q, index, total, isExpanded, onExpand,
  onChange, onDelete, onMoveUp, onMoveDown,
}: {
  q: Question
  index: number
  total: number
  isExpanded: boolean
  onExpand: () => void
  onChange: (patch: Partial<Question>) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const typeCfg = QUESTION_TYPES.find(t => t.value === q.question_type) ?? QUESTION_TYPES[0]!
  const Icon = typeCfg.icon

  return (
    <div
      className={cn(
        'rounded-xl border bg-card transition-shadow',
        isExpanded ? 'shadow-md border-primary/40' : 'hover:shadow-sm',
        q.isDirty && !isExpanded ? 'border-l-4 border-l-amber-400' : ''
      )}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={onExpand}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {q.question_text || <span className="italic text-muted-foreground">Untitled question</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {q.is_required && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-medium">Required</span>
          )}
          <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', typeCfg.bg, typeCfg.color)}>
            <Icon className="w-3 h-3" />
            {typeCfg.label}
          </span>
          {q.isDirty && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
        </div>
      </button>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Question text */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Question Text</Label>
            <Textarea
              rows={2}
              placeholder="Enter your question here…"
              value={q.question_text}
              onChange={e => onChange({ question_text: e.target.value, isDirty: true })}
              className="resize-none text-sm"
            />
          </div>

          {/* Type picker */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Response Type</Label>
            <TypePicker value={q.question_type} onChange={v => onChange({ question_type: v, isDirty: true })} />
          </div>

          {/* Help text */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Info className="w-3 h-3" /> Help Text <span className="font-normal normal-case">(optional hint shown to client)</span>
            </Label>
            <Input
              placeholder="e.g. Accepted formats: PDF, DOCX. Max 10MB."
              value={q.help_text}
              onChange={e => onChange({ help_text: e.target.value, isDirty: true })}
              className="text-sm"
            />
          </div>

          {/* Required + actions row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <Switch
                id={`req-${q.localId}`}
                checked={q.is_required}
                onCheckedChange={v => onChange({ is_required: v, isDirty: true })}
              />
              <Label htmlFor={`req-${q.localId}`} className="cursor-pointer text-sm">Required</Label>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="ghost" disabled={index === 0} onClick={onMoveUp} aria-label="Move up">
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={index === total - 1} onClick={onMoveDown} aria-label="Move down">
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button type="button" size="sm" variant="ghost" onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label="Delete question">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function QuestionSetEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, loading, error, trigger } = useGetQuestionSet()
  const { trigger: triggerSaveSet, loading: savingSet } = useSaveQuestionSet()
  const { trigger: triggerSaveQuestion } = useSaveQuestion()
  const { trigger: triggerDeleteQuestion } = useDeleteQuestion()
  const { trigger: triggerReorder } = useReorderQuestions()

  const [setMeta, setSetMeta] = useState<QuestionSet | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<number[]>([])
  const [expandedLocalId, setExpandedLocalId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up timer on unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }, [])

  useEffect(() => {
    if (id) trigger({ id: Number(id) })
  }, [id])

  // Populate state from loaded data
  useEffect(() => {
    const result = data as { questionSet: QuestionSet | null; questions: Array<{
      id: number; question_text: string; question_type: string;
      is_required: boolean; help_text: string | null; sort_order: number
    }> } | undefined
    if (!result) return
    if (result.questionSet) setSetMeta(result.questionSet)
    setQuestions(
      result.questions.map(q => ({
        id: q.id,
        localId: newLocalId(),
        question_text: q.question_text,
        question_type: q.question_type,
        is_required: q.is_required,
        help_text: q.help_text ?? '',
        isDirty: false,
        isNew: false,
      }))
    )
  }, [data])

  function addQuestion() {
    const localId = newLocalId()
    const newQ: Question = {
      localId,
      question_text: '',
      question_type: 'open_text',
      is_required: false,
      help_text: '',
      isDirty: true,
      isNew: true,
    }
    setQuestions(qs => [...qs, newQ])
    setExpandedLocalId(localId)
    setTimeout(() => {
      document.querySelector(`[data-localid="${localId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  function updateQuestion(localId: string, patch: Partial<Question>) {
    setQuestions(qs => qs.map(q => q.localId === localId ? { ...q, ...patch } : q))
  }

  function deleteQuestion(localId: string) {
    const q = questions.find(q => q.localId === localId)
    if (q?.id) setPendingDeletes(d => [...d, q.id!])
    setQuestions(qs => qs.filter(q => q.localId !== localId))
    if (expandedLocalId === localId) setExpandedLocalId(null)
  }

  function moveQuestion(localId: string, direction: 'up' | 'down') {
    setQuestions(qs => {
      const idx = qs.findIndex(q => q.localId === localId)
      if (idx < 0) return qs
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= qs.length) return qs
      const arr = [...qs]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx]!, arr[idx]!]
      return arr
    })
  }

  async function handleSaveAll() {
    if (!setMeta || !id) return
    setSaveState('saving')
    try {
      // 1. Save set metadata
      await triggerSaveSet({
        id: setMeta.id,
        title: setMeta.title,
        ...(setMeta.description ? { description: setMeta.description } : {}),
        declaration_type: setMeta.declaration_type,
        is_active: setMeta.is_active,
      })

      // 2. Delete removed questions
      for (const qid of pendingDeletes) {
        await triggerDeleteQuestion({ id: qid })
      }
      setPendingDeletes([])

      // 3. Save each question and collect ids
      const savedIds: Array<{ localId: string; id: number }> = []
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]!
        if (!q.isDirty && !q.isNew) {
          savedIds.push({ localId: q.localId, id: q.id! })
          continue
        }
        const saved = await triggerSaveQuestion({
          ...(q.id ? { id: q.id } : {}),
          question_set_id: Number(id),
          question_text: q.question_text,
          question_type: q.question_type,
          is_required: q.is_required,
          ...(q.help_text ? { help_text: q.help_text } : {}),
          sort_order: i,
        })
        const savedId = (saved as { id?: number } | undefined)?.id
        if (savedId) savedIds.push({ localId: q.localId, id: savedId })
      }

      // 4. Reorder if needed
      const reorderItems = questions.map((q, i) => {
        const entry = savedIds.find(s => s.localId === q.localId)
        return entry ? { id: entry.id, sort_order: i } : null
      }).filter((x): x is { id: number; sort_order: number } => x !== null)
      if (reorderItems.length > 0) await triggerReorder({ items: reorderItems })

      // 5. Mark all clean
      setQuestions(qs => qs.map((q, _i) => {
        const entry = savedIds.find(s => s.localId === q.localId)
        const resolvedId = entry?.id ?? q.id
        const base = { ...q, isDirty: false as const, isNew: false as const }
        return resolvedId !== undefined ? { ...base, id: resolvedId } : base
      }))

      setSaveState('saved')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => setSaveState('idle'), 3000)
    } catch {
      setSaveState('error')
    }
  }

  const hasDirtyChanges = questions.some(q => q.isDirty) || pendingDeletes.length > 0

  if (loading) return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="max-w-3xl mx-auto px-6 py-12 text-center text-muted-foreground text-sm">Loading question set…</div>
    </div>
  )

  if (error || !setMeta) return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="max-w-3xl mx-auto px-6 py-12 text-center text-destructive text-sm">{error ?? 'Question set not found.'}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-16">
      <AdminNav />

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/questions')} className="gap-1.5 -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-medium text-foreground flex-1 truncate">{setMeta.title}</span>
          <div className="flex items-center gap-2">
            {saveState === 'saved' && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {saveState === 'error' && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Save failed
              </span>
            )}
            {hasDirtyChanges && saveState === 'idle' && (
              <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
            )}
            <Button size="sm" onClick={handleSaveAll} disabled={savingSet || saveState === 'saving'} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saveState === 'saving' ? 'Saving…' : 'Save All'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Set Metadata Card */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Form Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Form Title</Label>
              <Input value={setMeta.title} onChange={e => setSetMeta(m => m ? { ...m, title: e.target.value } : m)} />
            </div>
            <div className="space-y-1.5">
              <Label>Declaration Type</Label>
              <Select value={setMeta.declaration_type} onValueChange={v => setSetMeta(m => m ? { ...m, declaration_type: v } : m)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DECLARATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch id="set-active" checked={setMeta.is_active} onCheckedChange={v => setSetMeta(m => m ? { ...m, is_active: v } : m)} />
              <Label htmlFor="set-active" className="cursor-pointer">Active (visible to clients)</Label>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea rows={2} className="resize-none text-sm" value={setMeta.description ?? ''}
                onChange={e => setSetMeta(m => m ? { ...m, description: e.target.value || null } : m)} />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Questions <span className="text-muted-foreground font-normal">({questions.length})</span></h2>
          </div>

          {questions.length === 0 && (
            <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
              <AlignLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No questions yet.</p>
              <p className="text-xs mt-1">Click "Add Question" to get started.</p>
            </div>
          )}

          {questions.map((q, i) => (
            <div key={q.localId} data-localid={q.localId}>
              <QuestionCard
                q={q}
                index={i}
                total={questions.length}
                isExpanded={expandedLocalId === q.localId}
                onExpand={() => setExpandedLocalId(prev => prev === q.localId ? null : q.localId)}
                onChange={patch => updateQuestion(q.localId, patch)}
                onDelete={() => deleteQuestion(q.localId)}
                onMoveUp={() => moveQuestion(q.localId, 'up')}
                onMoveDown={() => moveQuestion(q.localId, 'down')}
              />
            </div>
          ))}

          {/* Add question button */}
          <button
            type="button"
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 text-primary/70 hover:text-primary text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>
    </div>
  )
}
