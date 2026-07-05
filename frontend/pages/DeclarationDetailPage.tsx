import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetDeclarationById } from '../hooks/backend/declarations'
import { useGetEvidenceFileAccess } from '../hooks/backend/declarations'
import { useSubmitFeedback } from '../hooks/backend/declarations'
import AdminNav from '../components/AdminNav'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { Textarea } from '../lib/shadcn/textarea'
import { Label } from '../lib/shadcn/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import { Skeleton } from '../lib/shadcn/skeleton'
import { Separator } from '../lib/shadcn/separator'
import {
  User,
  Mail,
  Calendar,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Plus,
  AlignLeft,
  ToggleRight,
  Paperclip,
  Image,
  ClipboardList,
  ChevronRight,
} from 'lucide-react'

type Declaration = {
  id: number
  client_name: string
  client_email: string
  declaration_type: string
  subject: string
  content: string
  status: string
  submitted_at: string
  updated_at: string
}

type Answer = {
  id: number
  question_id: number
  question_text: string
  question_type: string
  text_answer: string | null
  bool_answer: boolean | null
  file_id: string | null
  file_name: string | null
  file_mime_type: string | null
  created_at: string
}

type Feedback = {
  id: number
  declaration_id: number
  reviewer_name: string
  reviewer_email: string | null
  feedback_type: string
  verification_status: string
  comments: string | null
  reviewed_at: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800', icon: Clock },
  approved: { label: 'Approved', bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800', icon: XCircle },
}

const VERIFICATION_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  verified: { label: 'Verified', color: 'text-green-600 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-600 dark:text-red-400', icon: XCircle },
  needs_review: { label: 'Needs Review', color: 'text-yellow-600 dark:text-yellow-400', icon: AlertCircle },
  unverified: { label: 'Unverified', color: 'text-muted-foreground', icon: Clock },
}

function FeedbackCard({ fb }: { fb: Feedback }) {
  const vcfg = VERIFICATION_CONFIG[fb.verification_status] ?? VERIFICATION_CONFIG['unverified']!
  const VIcon = vcfg.icon
  return (
    <div className="p-4 rounded-lg border bg-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">{fb.reviewer_name}</span>
            {fb.reviewer_email && (
              <span className="text-xs text-muted-foreground">{fb.reviewer_email}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {fb.feedback_type}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 text-sm font-medium ${vcfg.color}`}>
            <VIcon className="w-4 h-4" />
            {vcfg.label}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(fb.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      {fb.comments && (
        <p className="text-sm text-foreground/80 border-t pt-2 mt-2">{fb.comments}</p>
      )}
    </div>
  )
}

export default function DeclarationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, loading, error, trigger } = useGetDeclarationById()
  const { trigger: getEvidenceFileAccessTrigger } = useGetEvidenceFileAccess()
  const { trigger: submitFeedbackTrigger, loading: submitting } = useSubmitFeedback()

  const [showForm, setShowForm] = useState(false)
  const [evidenceError, setEvidenceError] = useState('')
  const [form, setForm] = useState({
    reviewer_name: '',
    reviewer_email: '',
    feedback_type: '',
    verification_status: '',
    comments: '',
    update_declaration_status: '',
  })
  const [formError, setFormError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    if (id) trigger({ id: Number(id) })
  }, [id])

  const result = data as { declaration: Declaration; feedback: Feedback[]; answers: Answer[] } | undefined
  const declaration = result?.declaration ?? null
  const answers = result?.answers ?? []
  const feedback = result?.feedback ?? []

  const statusCfg = declaration ? (STATUS_CONFIG[declaration.status] ?? STATUS_CONFIG['pending']!) : null
  const StatusIcon = statusCfg?.icon ?? Clock

  async function handleOpenEvidence(answer: Answer) {
    if (!answer.file_id || !id) return
    setEvidenceError('')

    try {
      const result = await getEvidenceFileAccessTrigger({
        declaration_id: Number(id),
        file_id: answer.file_id,
      }) as { url?: string } | undefined

      if (!result?.url) {
        throw new Error('Evidence file is not available.')
      }

      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (caughtError) {
      setEvidenceError(caughtError instanceof Error ? caughtError.message : 'Failed to open evidence file.')
    }
  }

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.feedback_type || !form.verification_status) {
      setFormError('Please fill in all required fields.')
      return
    }
    try {
      await submitFeedbackTrigger({
        declaration_id: Number(id),
        reviewer_name: form.reviewer_name,
        ...(form.reviewer_email ? { reviewer_email: form.reviewer_email } : {}),
        feedback_type: form.feedback_type,
        verification_status: form.verification_status,
        ...(form.comments ? { comments: form.comments } : {}),
        ...(form.update_declaration_status ? { update_declaration_status: form.update_declaration_status } : {}),
      })
      setSubmitSuccess(true)
      setShowForm(false)
      setForm({ reviewer_name: '', reviewer_email: '', feedback_type: '', verification_status: '', comments: '', update_declaration_status: '' })
      // Refresh data
      if (id) trigger({ id: Number(id) })
      setTimeout(() => setSubmitSuccess(false), 4000)
    } catch {
      setFormError('Failed to submit feedback. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      {/* Breadcrumb */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center gap-2 text-sm">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            Declarations
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-foreground font-medium truncate max-w-xs">
            {declaration?.subject ?? 'Declaration Detail'}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {evidenceError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {evidenceError}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!loading && declaration && (
          <>
            {/* Status Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${statusCfg?.bg}`}>
              <StatusIcon className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Status: {statusCfg?.label}</p>
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(declaration.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Declaration Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{declaration.subject}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-foreground">{declaration.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>{declaration.client_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="w-4 h-4 shrink-0" />
                    <span>{declaration.declaration_type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{new Date(declaration.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Declaration Content</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-lg p-4">
                    {declaration.content}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Client Answers Section */}
            {answers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold text-foreground">Survey Responses</h2>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{answers.length}</span>
                </div>
                {answers.map((ans, i) => {
                  const typeIcon = {
                    open_text: <AlignLeft className="w-3.5 h-3.5 text-blue-500" />,
                    yes_no: <ToggleRight className="w-3.5 h-3.5 text-purple-500" />,
                    file_upload: <Paperclip className="w-3.5 h-3.5 text-orange-500" />,
                    image_upload: <Image className="w-3.5 h-3.5 text-teal-500" />,
                  }[ans.question_type] ?? <AlignLeft className="w-3.5 h-3.5" />
                  return (
                    <div key={ans.id} className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            {typeIcon}
                            <p className="text-sm font-medium text-foreground">{ans.question_text}</p>
                          </div>
                          {ans.question_type === 'open_text' && (
                            <p className="text-sm text-foreground/80 bg-muted/40 rounded-md px-3 py-2 whitespace-pre-wrap">{ans.text_answer ?? <span className="italic text-muted-foreground">No response</span>}</p>
                          )}
                          {ans.question_type === 'yes_no' && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                              ans.bool_answer === true ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : ans.bool_answer === false ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                            }`}>
                              {ans.bool_answer === true ? <CheckCircle className="w-3.5 h-3.5" /> : ans.bool_answer === false ? <XCircle className="w-3.5 h-3.5" /> : null}
                              {ans.bool_answer === true ? 'Yes' : ans.bool_answer === false ? 'No' : 'No response'}
                            </span>
                          )}
                          {(ans.question_type === 'file_upload' || ans.question_type === 'image_upload') && (
                            ans.file_name
                              ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEvidence(ans)}
                                  className="inline-flex items-center gap-1.5 text-sm text-foreground bg-muted/60 px-3 py-1.5 rounded-md hover:bg-muted transition-colors underline-offset-2 hover:underline"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                                  {ans.file_name}
                                </button>
                              )
                              : <span className="text-sm italic text-muted-foreground">No file uploaded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Feedback Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold text-foreground">Reviewer Feedback</h2>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{feedback.length}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Add Feedback
                </Button>
              </div>

              {submitSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Feedback submitted successfully.
                </div>
              )}

              {/* Feedback Form */}
              {showForm && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Submit Reviewer Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitFeedback} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="reviewer_name">Reviewer Name</Label>
                          <Input
                            id="reviewer_name"
                            placeholder="Leave blank to use your signed-in admin identity"
                            value={form.reviewer_name}
                            onChange={e => setForm(f => ({ ...f, reviewer_name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="reviewer_email">Reviewer Email</Label>
                          <Input
                            id="reviewer_email"
                            type="email"
                            placeholder="reviewer@company.com"
                            value={form.reviewer_email}
                            onChange={e => setForm(f => ({ ...f, reviewer_email: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Feedback Type <span className="text-destructive">*</span></Label>
                          <Select value={form.feedback_type} onValueChange={v => setForm(f => ({ ...f, feedback_type: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Information Verification">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Information Verification
                                </div>
                              </SelectItem>
                              <SelectItem value="Identity Verification">
                                <div className="flex items-center gap-2">
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Identity Verification
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Verification Status <span className="text-destructive">*</span></Label>
                          <Select value={form.verification_status} onValueChange={v => setForm(f => ({ ...f, verification_status: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="unverified">Unverified</SelectItem>
                              <SelectItem value="needs_review">Needs Further Review</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Update Declaration Status</Label>
                        <Select value={form.update_declaration_status} onValueChange={v => setForm(f => ({ ...f, update_declaration_status: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Keep current status (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Set to Pending</SelectItem>
                            <SelectItem value="approved">Set to Approved</SelectItem>
                            <SelectItem value="rejected">Set to Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="comments">Comments</Label>
                        <Textarea
                          id="comments"
                          placeholder="Add your review notes, verification details, or reasons for decision..."
                          rows={3}
                          value={form.comments}
                          onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
                        />
                      </div>

                      {formError && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertCircle className="w-4 h-4" />
                          {formError}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <Button type="submit" disabled={submitting}>
                          {submitting ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Feedback History */}
              {feedback.length === 0 && !showForm && (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No feedback submitted yet.</p>
                  <p className="text-xs mt-1">Click "Add Feedback" to review this declaration.</p>
                </div>
              )}

              {feedback.length > 0 && (
                <div className="space-y-3">
                  {feedback.map(fb => <FeedbackCard key={fb.id} fb={fb} />)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
