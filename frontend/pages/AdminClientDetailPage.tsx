import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGetClientDetail } from '../hooks/backend/admin'
import { useAssignQuestionSet } from '../hooks/backend/admin'
import { useRemoveAssignment } from '../hooks/backend/admin'
import { useGetQuestionSets } from '../hooks/backend/questions'
import AdminNav from '../components/AdminNav'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import { Input } from '../lib/shadcn/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../lib/shadcn/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../lib/shadcn/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import {
  User, Mail, Calendar, CheckCircle, Clock, ClipboardList,
  Plus, Trash2, AlertCircle, FileText, ChevronRight,
} from 'lucide-react'

type FieldDef = { id: number; field_key: string; field_label: string; field_type: string; is_required: boolean }
type Assignment = {
  id: number; question_set_id: number; question_set_title: string; declaration_type: string
  question_set_desc: string | null; question_count: number; assigned_at: string
  due_date: string | null; status: string; notes: string | null; assigned_by: string | null
}
type Declaration = { id: number; declaration_type: string; subject: string; status: string; submitted_at: string }
type Client = {
  id: number; full_name: string; email: string; onboarding_status: string
  profile_data: Record<string, string>; onboarding_completed_at: string | null; created_at: string
}
type QuestionSet = { id: number; title: string; declaration_type: string }

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  submitted: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  reviewed:  'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
}
const DECL_STATUS_COLORS: Record<string, string> = {
  pending:  'text-yellow-600 dark:text-yellow-400',
  approved: 'text-green-600 dark:text-green-400',
  rejected: 'text-red-600 dark:text-red-400',
}

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, trigger: load, loading, error } = useGetClientDetail()
  const { trigger: assign, loading: assigning } = useAssignQuestionSet()
  const { trigger: remove } = useRemoveAssignment()
  const { data: questionSetData, trigger: loadQuestionSets } = useGetQuestionSets()

  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [assignForm, setAssignForm] = useState({ question_set_id: '', due_date: '', notes: '' })
  const [assignError, setAssignError] = useState('')
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null)

  useEffect(() => { if (id) load({ client_id: Number(id) }, { skipCache: true }) }, [id])
  useEffect(() => { loadQuestionSets({}, { skipCache: true }) }, [])

  const result = data as {
    client: Client | null; profileFields: FieldDef[]; assignments: Assignment[]
    recentDeclarations: Declaration[]
  } | undefined

  const client = result?.client ?? null
  const profileFields = result?.profileFields ?? []
  const assignments = result?.assignments ?? []
  const declarations = result?.recentDeclarations ?? []
  const profileData = client?.profile_data ?? {}

  const assignedSetIds = new Set(assignments.map(a => a.question_set_id))
  const availableSets = ((questionSetData as Array<QuestionSet & { is_active?: boolean }> | undefined) ?? [])
    .filter(questionSet => !assignedSetIds.has(questionSet.id))

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setAssignError('')
    if (!assignForm.question_set_id) { setAssignError('Select a question set.'); return }
    try {
      await assign({
        client_id: Number(id),
        question_set_id: Number(assignForm.question_set_id),
        ...(assignForm.due_date ? { due_date: assignForm.due_date } : {}),
        ...(assignForm.notes ? { notes: assignForm.notes } : {}),
      })
      setShowAssignDialog(false)
      setAssignForm({ question_set_id: '', due_date: '', notes: '' })
      load({ client_id: Number(id) }, { skipCache: true })
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign.')
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    await remove({ assignment_id: removeTarget.id })
    setRemoveTarget(null)
    load({ client_id: Number(id) }, { skipCache: true })
  }

  if (loading) return (
    <div className="min-h-screen bg-background"><AdminNav />
      <div className="max-w-4xl mx-auto px-6 py-12 text-center text-sm text-muted-foreground">Loading client…</div>
    </div>
  )
  if (error || !client) return (
    <div className="min-h-screen bg-background"><AdminNav />
      <div className="max-w-4xl mx-auto px-6 py-12 text-center text-sm text-destructive">{error ?? 'Client not found.'}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      {/* Breadcrumb */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center gap-2 text-sm">
          <button onClick={() => navigate('/admin/clients')} className="text-muted-foreground hover:text-foreground">Clients</button>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-foreground font-medium">{client.full_name}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Client header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-primary">{client.full_name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{client.full_name}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                client.onboarding_status === 'complete'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}>
                {client.onboarding_status === 'complete' ? <><CheckCircle className="w-3 h-3" />Onboarding Complete</> : <><Clock className="w-3 h-3" />Onboarding Pending</>}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{client.email}</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="w-3.5 h-3.5" />Joined {new Date(client.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2"><User className="w-4 h-4" />Profile</TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <ClipboardList className="w-4 h-4" />Assignments
              {assignments.filter(a => a.status === 'pending').length > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-white text-xs font-bold">
                  {assignments.filter(a => a.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="declarations" className="gap-2"><FileText className="w-4 h-4" />Declarations</TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Identity Profile</CardTitle>
                {client.onboarding_completed_at && (
                  <span className="text-xs text-muted-foreground">Completed {new Date(client.onboarding_completed_at).toLocaleDateString()}</span>
                )}
              </CardHeader>
              <CardContent>
                {profileFields.length === 0 && <p className="text-sm text-muted-foreground">No profile fields configured. Add them in <button onClick={() => navigate('/admin/profile-fields')} className="text-primary underline-offset-2 hover:underline">Profile Fields</button>.</p>}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {profileFields.map(field => {
                    const val = profileData[field.field_key]
                    return (
                      <div key={field.id}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{field.field_label}</p>
                        <p className={`text-sm ${val ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
                          {val || '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
                {client.onboarding_status !== 'complete' && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Client has not completed onboarding yet. Profile data may be incomplete.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Assignments Tab ── */}
          <TabsContent value="assignments" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{assignments.length} question set{assignments.length !== 1 ? 's' : ''} assigned</p>
              <Button size="sm" onClick={() => { setShowAssignDialog(true); setAssignError('') }} className="gap-2">
                <Plus className="w-3.5 h-3.5" />Assign Question Set
              </Button>
            </div>
            {assignments.length === 0 && (
              <div className="text-center py-10 rounded-xl border border-dashed text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-25" />
                <p className="text-sm">No question sets assigned yet.</p>
                <p className="text-xs mt-1">Click "Assign Question Set" to create an assignment.</p>
              </div>
            )}
            {assignments.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm text-foreground">{a.question_set_title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[a.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{a.declaration_type}</span>
                      </div>
                      {a.question_set_desc && <p className="text-xs text-muted-foreground mb-1">{a.question_set_desc}</p>}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span>{a.question_count} questions</span>
                        <span>Assigned {new Date(a.assigned_at).toLocaleDateString()}</span>
                        {a.assigned_by && <span>by {a.assigned_by}</span>}
                        {a.due_date && <span className="text-orange-600 dark:text-orange-400 font-medium">Due {new Date(a.due_date).toLocaleDateString()}</span>}
                      </div>
                      {a.notes && <p className="text-xs text-muted-foreground italic mt-1">"{a.notes}"</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(a)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Declarations Tab ── */}
          <TabsContent value="declarations" className="mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Recent Declarations</CardTitle></CardHeader>
              <CardContent className="p-0">
                {declarations.length === 0 && <p className="px-5 pb-5 text-sm text-muted-foreground">No declarations submitted yet.</p>}
                {declarations.map((d, i) => (
                  <button key={d.id} onClick={() => navigate(`/declaration/${d.id}`)}
                    className={`w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-accent/50 transition-colors ${i < declarations.length - 1 ? 'border-b' : ''}`}>
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.subject}</p>
                      <p className="text-xs text-muted-foreground">{d.declaration_type} · {new Date(d.submitted_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold ${DECL_STATUS_COLORS[d.status] ?? 'text-muted-foreground'}`}>
                      {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" />Assign Question Set</DialogTitle></DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Question Set <span className="text-destructive">*</span></Label>
              <Select value={assignForm.question_set_id} onValueChange={value => setAssignForm(formState => ({ ...formState, question_set_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a question set" />
                </SelectTrigger>
                <SelectContent>
                  {availableSets.map(questionSet => (
                    <SelectItem key={questionSet.id} value={String(questionSet.id)}>
                      {questionSet.title} · {questionSet.declaration_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableSets.length === 0 && (
                <p className="text-xs text-muted-foreground">No unassigned question sets are currently available.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Due Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="date" value={assignForm.due_date} onChange={e => setAssignForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea rows={2} className="resize-none text-sm" placeholder="Any instructions for the client…"
                value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {assignError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{assignError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={assigning}>{assigning ? 'Assigning…' : 'Assign'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <Dialog open={!!removeTarget} onOpenChange={o => { if (!o) setRemoveTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Assignment?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Remove <strong className="text-foreground">"{removeTarget?.question_set_title}"</strong> from this client? They will no longer see it in their dashboard.</p>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
