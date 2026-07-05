import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSubmitDeclarationWithAnswers } from '../hooks/backend/declarations'
import { useGetQuestionsForType } from '../hooks/backend/questions'
import { useUploadDeclarationFile } from '../hooks/backend/declarations'
import { useClientAuth } from '../hooks/useClientAuth'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { Textarea } from '../lib/shadcn/textarea'
import { Label } from '../lib/shadcn/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import { Separator } from '../lib/shadcn/separator'
import { Progress } from '../lib/shadcn/progress'
import { cn } from '../lib/shadcn/utils'
import {
  ArrowLeft, FileText, AlertCircle, CheckCircle, LogOut, User, Lock,
  AlignLeft, ToggleRight, Paperclip, Image, Upload, X, Loader2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Question = {
  id: number
  question_text: string
  question_type: string
  is_required: boolean
  help_text: string | null
  sort_order: number
}

type AnswerState = {
  text_answer?: string
  bool_answer?: boolean | null
  file_id?: string
  file_name?: string
  file_mime_type?: string
  preview_url?: string
  uploading?: boolean
  upload_error?: string
}

const DECLARATION_TYPES = [
  'Financial Disclosure', 'Identity Verification', 'Compliance Declaration',
  'Inquiry Submission', 'Questionnaire', 'Statement Disclosure',
]

// ─── Yes/No Question ──────────────────────────────────────────────────────────

function YesNoInput({ value, onChange }: { value: boolean | null | undefined; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3 mt-1">
      {[true, false].map(option => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2',
            value === option
              ? option
                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600'
                : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600'
              : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
          )}
        >
          <span className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
            value === option ? 'border-current' : 'border-muted-foreground/40'
          )}>
            {value === option && <span className="w-2.5 h-2.5 rounded-full bg-current" />}
          </span>
          {option ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

// ─── File Upload Input ─────────────────────────────────────────────────────────

function FileUploadInput({
  accept, imageMode, answer, onUpload, onClear,
}: {
  accept?: string
  imageMode?: boolean
  answer: AnswerState
  onUpload: (file: File) => void
  onClear: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const hasFile = !!answer.file_id
  const isUploading = !!answer.uploading

  return (
    <div className="mt-1">
      {!hasFile && !isUploading && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-xl py-8 px-4 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
        >
          <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">Click to choose {imageMode ? 'an image' : 'a file'}</span>
          {accept && <span className="text-xs">{accept}</span>}
        </button>
      )}

      {isUploading && (
        <div className="border rounded-xl p-4 flex items-center gap-3 bg-muted/30">
          <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{answer.file_name ?? 'Uploading…'}</p>
            <Progress value={null} className="mt-1.5 h-1" />
          </div>
        </div>
      )}

      {hasFile && !isUploading && (
        <div className="border rounded-xl overflow-hidden">
          {imageMode && answer.preview_url && (
            <div className="bg-muted/40 flex items-center justify-center p-4">
              <img
                src={answer.preview_url}
                alt="Preview"
                className="max-h-48 max-w-full rounded-lg object-contain shadow-sm"
              />
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            <span className="flex-1 text-sm text-foreground font-medium truncate">{answer.file_name}</span>
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {answer.upload_error && (
        <p className="text-xs text-destructive flex items-center gap-1 mt-1.5">
          <AlertCircle className="w-3 h-3" /> {answer.upload_error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }}
      />
    </div>
  )
}

// ─── Single Survey Question ────────────────────────────────────────────────────

function SurveyQuestion({
  q, index, answer, onAnswerChange, onFileUpload, onFileClear, error,
}: {
  q: Question
  index: number
  answer: AnswerState
  onAnswerChange: (patch: Partial<AnswerState>) => void
  onFileUpload: (file: File) => void
  onFileClear: () => void
  error?: string
}) {
  const typeIcon = {
    open_text: <AlignLeft className="w-4 h-4 text-blue-500" />,
    yes_no: <ToggleRight className="w-4 h-4 text-purple-500" />,
    file_upload: <Paperclip className="w-4 h-4 text-orange-500" />,
    image_upload: <Image className="w-4 h-4 text-teal-500" />,
  }[q.question_type] ?? <AlignLeft className="w-4 h-4" />

  return (
    <Card className={cn('transition-shadow', error ? 'border-destructive/50' : '')}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <p className="text-sm font-semibold text-foreground leading-snug flex-1">
                {q.question_text}
                {q.is_required && <span className="text-destructive ml-1">*</span>}
              </p>
              <span className="shrink-0 mt-0.5">{typeIcon}</span>
            </div>
            {q.help_text && (
              <p className="text-xs text-muted-foreground mt-1">{q.help_text}</p>
            )}
          </div>
        </div>

        {/* Response input by type */}
        {q.question_type === 'open_text' && (
          <Textarea
            rows={3}
            placeholder="Your response…"
            value={answer.text_answer ?? ''}
            onChange={e => onAnswerChange({ text_answer: e.target.value })}
            className={cn('resize-none text-sm ml-10', error ? 'border-destructive' : '')}
          />
        )}

        {q.question_type === 'yes_no' && (
          <div className="ml-10">
            <YesNoInput
              value={answer.bool_answer}
              onChange={v => onAnswerChange({ bool_answer: v })}
            />
          </div>
        )}

        {q.question_type === 'file_upload' && (
          <div className="ml-10">
            <FileUploadInput
              accept=".pdf,.doc,.docx,.txt,.xlsx,.csv"
              answer={answer}
              onUpload={onFileUpload}
              onClear={onFileClear}
            />
          </div>
        )}

        {q.question_type === 'image_upload' && (
          <div className="ml-10">
            <FileUploadInput
              imageMode
              accept="image/*"
              answer={answer}
              onUpload={onFileUpload}
              onClear={onFileClear}
            />
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-2 ml-10">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NewDeclarationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { client, isAuthenticated, logout, ready } = useClientAuth()
  const { trigger: triggerSubmit, loading: submitting } = useSubmitDeclarationWithAnswers()
  const { trigger: triggerGetQuestions, loading: loadingQuestions } = useGetQuestionsForType()
  const { trigger: triggerUpload } = useUploadDeclarationFile()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!ready) return
    if (!isAuthenticated) navigate('/client-login', { state: { from: location.pathname }, replace: true })
  }, [isAuthenticated, navigate, ready, location.pathname])

  const [declarationType, setDeclarationType] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  // Load questions when declaration type changes
  useEffect(() => {
    if (!declarationType) { setQuestions([]); return }
    triggerGetQuestions({ declaration_type: declarationType }).then(result => {
      const r = result as { questions: Question[] } | undefined
      setQuestions(r?.questions ?? [])
      setAnswers({})
    }).catch(() => setQuestions([]))
  }, [declarationType])

  function setAnswer(qid: number, patch: Partial<AnswerState>) {
    setAnswers(a => ({ ...a, [qid]: { ...(a[qid] ?? {}), ...patch } }))
  }

  async function handleFileUpload(qid: number, file: File) {
    setAnswer(qid, { uploading: true, file_name: file.name })
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Strip the data:mime;base64, prefix
          const b64 = result.split(',')[1]
          if (b64) resolve(b64)
          else reject(new Error('Failed to read file'))
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })

      // Generate preview for images
      let preview_url: string | undefined
      if (file.type.startsWith('image/')) {
        preview_url = URL.createObjectURL(file)
      }

      const result = await triggerUpload({
        fileName: file.name,
        base64Data: base64,
        mimeType: file.type || 'application/octet-stream',
      })
      const r = result as { fileId?: string; fileName?: string } | undefined
      const patch: Partial<AnswerState> = {
        uploading: false,
        file_id: r?.fileId ?? '',
        file_name: r?.fileName ?? file.name,
        file_mime_type: file.type,
      }
      if (preview_url) patch.preview_url = preview_url
      setAnswer(qid, patch)
    } catch (err) {
      setAnswer(qid, { uploading: false, upload_error: err instanceof Error ? err.message : 'Upload failed.' })
    }
  }

  function clearFile(qid: number) {
    const prev = answers[qid]
    if (prev?.preview_url) URL.revokeObjectURL(prev.preview_url)
    setAnswers(a => {
      const next = { ...a }
      delete next[qid]
      return next
    })
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!declarationType) errs['declaration_type'] = 'Please select a declaration type.'
    if (!subject.trim()) errs['subject'] = 'Subject is required.'
    if (!content.trim()) errs['content'] = 'Please provide a brief declaration statement.'
    // Validate question answers
    for (const q of questions) {
      if (!q.is_required) continue
      const ans = answers[q.id]
      if (q.question_type === 'open_text' && !ans?.text_answer?.trim()) {
        errs[`q_${q.id}`] = 'This field is required.'
      } else if (q.question_type === 'yes_no' && (ans?.bool_answer === undefined || ans?.bool_answer === null)) {
        errs[`q_${q.id}`] = 'Please select Yes or No.'
      } else if ((q.question_type === 'file_upload' || q.question_type === 'image_upload') && !ans?.file_id) {
        errs[`q_${q.id}`] = 'Please upload the required file.'
      }
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    const answerPayload = questions.map(q => {
      const ans = answers[q.id] ?? {}
      return {
        question_id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        ...(ans.text_answer !== undefined ? { text_answer: ans.text_answer } : {}),
        ...(ans.bool_answer !== undefined && ans.bool_answer !== null ? { bool_answer: ans.bool_answer } : {}),
        ...(ans.file_id ? { file_id: ans.file_id } : {}),
        ...(ans.file_name ? { file_name: ans.file_name } : {}),
        ...(ans.file_mime_type ? { file_mime_type: ans.file_mime_type } : {}),
      }
    })

    try {
      const result = await triggerSubmit({
        declaration_type: declarationType,
        subject,
        content,
        answers: answerPayload,
      })
      setSuccess(true)
      setTimeout(() => {
        const id = (result as { id?: number } | undefined)?.id
        navigate(id ? `/declaration/${id}` : '/')
      }, 1500)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    }
  }

  if (!ready || !isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-primary/10">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">New Declaration</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <User className="w-3 h-3" />
              {client?.full_name}
            </div>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/') }} className="gap-1 text-muted-foreground hover:text-foreground text-xs">
              <LogOut className="w-3 h-3" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Declaration Submitted!</h2>
          <p className="text-sm text-muted-foreground mt-1">Redirecting to your submission…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
            {/* Identity notice */}
            <div className="flex items-center gap-2.5 p-3 rounded-lg border bg-muted/40 text-sm text-muted-foreground">
              <Lock className="w-4 h-4 text-primary shrink-0" />
              <span>
                Submitting as <span className="font-semibold text-foreground">{client?.full_name}</span> ({client?.email})
              </span>
            </div>

            {/* Section 1: Declaration info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Declaration Details</CardTitle>
                <CardDescription>Choose the type and provide a summary of your declaration.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Declaration Type <span className="text-destructive">*</span></Label>
                  <Select value={declarationType} onValueChange={setDeclarationType}>
                    <SelectTrigger className={fieldErrors['declaration_type'] ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select a type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {DECLARATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldErrors['declaration_type'] && <p className="text-xs text-destructive">{fieldErrors['declaration_type']}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Annual Income & Assets Declaration"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className={fieldErrors['subject'] ? 'border-destructive' : ''}
                  />
                  {fieldErrors['subject'] && <p className="text-xs text-destructive">{fieldErrors['subject']}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Declaration Statement <span className="text-destructive">*</span></Label>
                  <Textarea
                    rows={4}
                    placeholder="Provide your declaration statement here…"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className={cn('resize-none', fieldErrors['content'] ? 'border-destructive' : '')}
                  />
                  {fieldErrors['content'] && <p className="text-xs text-destructive">{fieldErrors['content']}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Dynamic questions */}
            {loadingQuestions && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading questions…
              </div>
            )}

            {!loadingQuestions && questions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
                    {questions.length} Additional Question{questions.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {questions.map((q, i) => (
                  <SurveyQuestion
                    key={q.id}
                    q={q}
                    index={i}
                    answer={answers[q.id] ?? {}}
                    onAnswerChange={patch => setAnswer(q.id, patch)}
                    onFileUpload={file => handleFileUpload(q.id, file)}
                    onFileClear={() => clearFile(q.id)}
                    {...(fieldErrors[`q_${q.id}`] ? { error: fieldErrors[`q_${q.id}`] } : {})}
                  />
                ))}
              </div>
            )}

            {!loadingQuestions && declarationType && questions.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground border">
                <AlertCircle className="w-4 h-4 shrink-0" />
                No additional questions configured for this declaration type.
              </div>
            )}

            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" /> {submitError}
              </div>
            )}

            <div className="flex gap-3 pb-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</> : 'Submit Declaration'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancel</Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
