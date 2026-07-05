import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGetMyAssignments } from '../hooks/backend/client'
import { useGetQuestionsForType } from '../hooks/backend/questions'
import { useSubmitAssignment } from '../hooks/backend/client'
import { useUploadDeclarationFile } from '../hooks/backend/declarations'
import { useClientAuth } from '../hooks/useClientAuth'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent } from '../lib/shadcn/card'
import { cn } from '../lib/shadcn/utils'
import {
  ClipboardList, CheckCircle, Clock, Plus, LogOut, User, ChevronRight,
  FileText, AlertCircle, Loader2, ArrowLeft, AlignLeft, ToggleRight, Paperclip, Image,
  Upload, X,
} from 'lucide-react'

// ─── Shared survey components (inline, reused from NewDeclarationPage) ─────────

type AnswerState = {
  text_answer?: string; bool_answer?: boolean | null
  file_id?: string; file_name?: string; file_mime_type?: string
  preview_url?: string; uploading?: boolean; upload_error?: string
}

type Question = {
  id: number; question_text: string; question_type: string
  is_required: boolean; help_text: string | null
}

type Assignment = {
  id: number; question_set_id: number; question_set_title: string
  declaration_type: string; description: string | null; question_count: number
  required_count: number; assigned_at: string; due_date: string | null; status: string; notes: string | null
}

function YesNoInput({ value, onChange }: { value: boolean | null | undefined; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3 mt-1">
      {[true, false].map(opt => (
        <button key={String(opt)} type="button" onClick={() => onChange(opt)}
          className={cn('flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
            value === opt
              ? opt ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'border-border text-muted-foreground hover:border-muted-foreground'
          )}>
          {opt ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

function FileInput({ answer, accept, imageMode, onUpload, onClear }: {
  answer: AnswerState; accept?: string; imageMode?: boolean
  onUpload: (f: File) => void; onClear: () => void
}) {
  if (answer.uploading) return (
    <div className="border rounded-xl p-4 flex items-center gap-3 bg-muted/30">
      <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
      <p className="text-sm text-foreground">{answer.file_name ?? 'Uploading…'}</p>
    </div>
  )
  if (answer.file_id) return (
    <div className="border rounded-xl overflow-hidden">
      {imageMode && answer.preview_url && (
        <div className="bg-muted/40 flex items-center justify-center p-3">
          <img src={answer.preview_url} alt="Preview" className="max-h-40 rounded-lg object-contain" />
        </div>
      )}
      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10">
        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
        <span className="flex-1 text-sm truncate text-foreground font-medium">{answer.file_name}</span>
        <button type="button" onClick={onClear} className="p-1 hover:bg-muted rounded" aria-label="Remove">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
  return (
    <label className="block mt-1 cursor-pointer">
      <input type="file" className="hidden" accept={accept} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
      <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl py-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
        <Upload className="w-5 h-5" />
        <span className="text-sm font-medium">Click to upload {imageMode ? 'an image' : 'a file'}</span>
        {accept && <span className="text-xs">{accept}</span>}
      </div>
    </label>
  )
}

// ─── Assignment Survey (inline modal-like panel) ───────────────────────────────

function AssignmentSurvey({ assignment, onClose, onSubmitted }: {
  assignment: Assignment; onClose: () => void; onSubmitted: () => void
}) {
  const { trigger: loadQs } = useGetQuestionsForType()
  const { trigger: submitFn, loading: submitting } = useSubmitAssignment()
  const { trigger: uploadFn } = useUploadDeclarationFile()

  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQs({ declaration_type: assignment.declaration_type }).then(r => {
      const res = r as { questions: Question[] } | undefined
      setQuestions(res?.questions ?? [])
      setLoading(false)
    })
  }, [assignment.id])

  function setAnswer(qid: number, patch: Partial<AnswerState>) {
    setAnswers(a => ({ ...a, [qid]: { ...(a[qid] ?? {}), ...patch } }))
  }

  async function handleFileUpload(qid: number, file: File) {
    setAnswer(qid, { uploading: true, file_name: file.name })
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader(); r.onload = () => { const s = (r.result as string).split(',')[1]; s ? res(s) : rej(new Error('Read failed')) }; r.onerror = () => rej(r.error); r.readAsDataURL(file)
      })
      const preview_url = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      const result = await uploadFn({ fileName: file.name, base64Data: b64, mimeType: file.type || 'application/octet-stream' })
      const r = result as { fileId?: string; fileName?: string } | undefined
      const patch: Partial<AnswerState> = { uploading: false, file_id: r?.fileId ?? '', file_name: r?.fileName ?? file.name, file_mime_type: file.type }
      if (preview_url) patch.preview_url = preview_url
      setAnswer(qid, patch)
    } catch (err) {
      setAnswer(qid, { uploading: false, upload_error: err instanceof Error ? err.message : 'Upload failed.' })
    }
  }

  function clearFile(qid: number) {
    const prev = answers[qid]
    if (prev?.preview_url) URL.revokeObjectURL(prev.preview_url)
    setAnswers(a => { const n = { ...a }; delete n[qid]; return n })
  }

  function validate() {
    const errs: Record<string, string> = {}
    for (const q of questions) {
      if (!q.is_required) continue
      const ans = answers[q.id]
      if (q.question_type === 'open_text' && !ans?.text_answer?.trim()) errs[`q_${q.id}`] = 'Required.'
      else if (q.question_type === 'yes_no' && (ans?.bool_answer === undefined || ans?.bool_answer === null)) errs[`q_${q.id}`] = 'Please select Yes or No.'
      else if ((q.question_type === 'file_upload' || q.question_type === 'image_upload') && !ans?.file_id) errs[`q_${q.id}`] = 'Please upload the required file.'
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      await submitFn({
        assignment_id: assignment.id,
        answers: questions.map(q => {
          const ans = answers[q.id] ?? {}
          return {
            question_id: q.id, question_text: q.question_text, question_type: q.question_type,
            ...(ans.text_answer !== undefined ? { text_answer: ans.text_answer } : {}),
            ...(ans.bool_answer !== undefined && ans.bool_answer !== null ? { bool_answer: ans.bool_answer } : {}),
            ...(ans.file_id ? { file_id: ans.file_id } : {}),
            ...(ans.file_name ? { file_name: ans.file_name } : {}),
            ...(ans.file_mime_type ? { file_mime_type: ans.file_mime_type } : {}),
          }
        }),
      })
      onSubmitted()
    } catch (err) { setSubmitError(err instanceof Error ? err.message : 'Submission failed.') }
  }

  const typeIcon = (t: string) => ({ open_text: AlignLeft, yes_no: ToggleRight, file_upload: Paperclip, image_upload: Image }[t] ?? AlignLeft)

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-card rounded-2xl border shadow-xl my-8">
        <div className="sticky top-0 bg-card border-b rounded-t-2xl px-5 py-4 flex items-center gap-3">
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{assignment.question_set_title}</p>
            <p className="text-xs text-muted-foreground">{assignment.declaration_type}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {assignment.notes && (
            <div className="p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground italic">"{assignment.notes}"</div>
          )}
          {loading && <div className="text-center py-8 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading questions…</div>}
          {!loading && questions.map((q, i) => {
            const ans = answers[q.id] ?? {}
            const err = errors[`q_${q.id}`]
            const Icon = typeIcon(q.question_type)
            return (
              <div key={q.id} className={cn('p-4 rounded-xl border bg-background', err ? 'border-destructive/50' : '')}>
                <div className="flex items-start gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-start gap-1.5">
                      <p className="text-sm font-semibold text-foreground flex-1">{q.question_text}{q.is_required && <span className="text-destructive ml-1">*</span>}</p>
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    {q.help_text && <p className="text-xs text-muted-foreground mt-0.5">{q.help_text}</p>}
                  </div>
                </div>
                {q.question_type === 'open_text' && <textarea rows={3} placeholder="Your response…" value={ans.text_answer ?? ''} onChange={e => setAnswer(q.id, { text_answer: e.target.value })} className={cn('w-full resize-none text-sm rounded-md border px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring', err ? 'border-destructive' : 'border-input')} />}
                {q.question_type === 'yes_no' && <YesNoInput value={ans.bool_answer} onChange={v => setAnswer(q.id, { bool_answer: v })} />}
                {q.question_type === 'file_upload' && <FileInput answer={ans} accept=".pdf,.doc,.docx,.txt" onUpload={f => handleFileUpload(q.id, f)} onClear={() => clearFile(q.id)} />}
                {q.question_type === 'image_upload' && <FileInput answer={ans} imageMode accept="image/*" onUpload={f => handleFileUpload(q.id, f)} onClear={() => clearFile(q.id)} />}
                {err && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err}</p>}
              </div>
            )
          })}
          {submitError && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"><AlertCircle className="w-4 h-4" />{submitError}</div>}
          {!loading && <Button type="submit" disabled={submitting} className="w-full">{submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</> : 'Submit Answers'}</Button>}
        </form>
      </div>
    </div>
  )
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────────

export default function ClientDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { client, isAuthenticated, logout, ready } = useClientAuth()
  const { trigger: loadAssignments } = useGetMyAssignments()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null)
  const [justSubmitted, setJustSubmitted] = useState<number | null>(null)

  useEffect(() => {
    if (!ready) return
    if (!isAuthenticated) {
      navigate('/client-login', { state: { from: location.pathname }, replace: true })
      return
    }
    loadAssignments({}).then(r => {
      setAssignments((r as Assignment[] | undefined) ?? [])
      setLoading(false)
    })
  }, [isAuthenticated, ready, navigate, loadAssignments, location.pathname])

  function handleSubmitted() {
    if (activeAssignment) setJustSubmitted(activeAssignment.id)
    setActiveAssignment(null)
    loadAssignments({}, { skipCache: true }).then(r => setAssignments((r as Assignment[] | undefined) ?? []))
  }

  const pending = assignments.filter(a => a.status === 'pending')
  const submitted = assignments.filter(a => a.status === 'submitted')

  if (!ready || !isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-primary/10"><FileText className="w-4 h-4 text-primary" /></div>
            <span className="font-semibold text-sm text-foreground">Declaration Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <User className="w-3 h-3" />{client?.full_name}
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/new')} className="text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />New Declaration
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/') }} className="text-xs gap-1 text-muted-foreground">
              <LogOut className="w-3.5 h-3.5" />Sign out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {justSubmitted && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />Answers submitted successfully. Your administrator will review them shortly.
          </div>
        )}

        {/* Pending assignments */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <h2 className="font-semibold text-foreground">Pending Assignments</h2>
            {pending.length > 0 && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-white text-xs font-bold">{pending.length}</span>}
          </div>
          {loading && <div className="text-sm text-muted-foreground py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />Loading…</div>}
          {!loading && pending.length === 0 && (
            <div className="text-center py-8 rounded-xl border border-dashed text-muted-foreground">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-sm">No pending assignments.</p>
            </div>
          )}
          {pending.map(a => (
            <Card key={a.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setActiveAssignment(a)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0"><ClipboardList className="w-5 h-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{a.question_set_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.declaration_type} · {a.question_count} questions ({a.required_count} required)</p>
                  {a.due_date && <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-0.5">Due {new Date(a.due_date).toLocaleDateString()}</p>}
                  {a.notes && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{a.notes}"</p>}
                </div>
                <Button size="sm" className="gap-1.5 shrink-0">Fill in<ChevronRight className="w-3.5 h-3.5" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submitted */}
        {submitted.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <h2 className="font-semibold text-foreground">Submitted</h2>
              <span className="text-xs text-muted-foreground">({submitted.length})</span>
            </div>
            {submitted.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl border bg-card opacity-75">
                <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/20 shrink-0"><CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.question_set_title}</p>
                  <p className="text-xs text-muted-foreground">{a.declaration_type}</p>
                </div>
                <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Submitted</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeAssignment && (
        <AssignmentSurvey
          assignment={activeAssignment}
          onClose={() => setActiveAssignment(null)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  )
}
