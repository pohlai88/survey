import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetInvitations } from '../hooks/backend/admin'
import { useGetClients } from '../hooks/backend/admin'
import { useInviteClient } from '../hooks/backend/admin'
import { useRevokeInvitation } from '../hooks/backend/admin'
import { useResendInvitation } from '../hooks/backend/admin'
import AdminNav from '../components/AdminNav'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../lib/shadcn/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../lib/shadcn/tabs'
import {
  UserPlus, Users, Mail, Clock, CheckCircle, XCircle, AlertCircle,
  MoreHorizontal, RefreshCw, Ban, FileText, ChevronRight,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../lib/shadcn/dropdown-menu'

type Invitation = {
  id: number
  email: string
  full_name: string
  token: string
  status: string
  display_status: string
  invited_by: string | null
  created_at: string
  expires_at: string
  accepted_at: string | null
  client_id: number | null
  registered_at: string | null
}

type Client = {
  id: number
  full_name: string
  email: string
  created_at: string
  declaration_count: number
  last_declaration_at: string | null
  was_invited: boolean
  onboarding_status?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: 'Pending',  color: 'text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20',  icon: Clock },
  accepted: { label: 'Accepted', color: 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20',       icon: CheckCircle },
  expired:  { label: 'Expired',  color: 'text-muted-foreground bg-muted',                                            icon: AlertCircle },
  revoked:  { label: 'Revoked',  color: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20',               icon: XCircle },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['expired']!
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminClientsPage() {
  const navigate = useNavigate()
  const { data: inviteData, loading: loadingInvites, trigger: loadInvites } = useGetInvitations()
  const { data: clientData, loading: loadingClients, trigger: loadClients } = useGetClients()
  const { trigger: triggerInvite, loading: inviting } = useInviteClient()
  const { trigger: triggerRevoke } = useRevokeInvitation()
  const { trigger: triggerResend } = useResendInvitation()

  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', message: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  const invitations = (inviteData as Invitation[] | undefined) ?? []
  const clients = (clientData as Client[] | undefined) ?? []

  useEffect(() => {
    loadInvites({}, { skipCache: true })
    loadClients({}, { skipCache: true })
  }, [])

  function refresh() {
    loadInvites({}, { skipCache: true })
    loadClients({}, { skipCache: true })
  }

  function validateForm() {
    const errs: Record<string, string> = {}
    if (!form.full_name.trim()) errs['full_name'] = 'Full name is required.'
    if (!form.email.trim()) errs['email'] = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs['email'] = 'Enter a valid email address.'
    return errs
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    const errs = validateForm()
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      await triggerInvite({
        full_name: form.full_name,
        email: form.email,
        app_url: window.location.origin,
        ...(form.message ? { message: form.message } : {}),
      })
      setInviteSuccess(`Invitation sent to ${form.email}`)
      setForm({ full_name: '', email: '', message: '' })
      setShowInviteDialog(false)
      refresh()
      setTimeout(() => setInviteSuccess(''), 5000)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation.')
    }
  }

  async function handleRevoke(inv: Invitation) {
    setActionError('')
    try {
      await triggerRevoke({ id: inv.id })
      refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to revoke invitation.')
    }
  }

  async function handleResend(inv: Invitation) {
    setActionError('')
    try {
      await triggerResend({ id: inv.id, app_url: window.location.origin })
      refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to resend invitation.')
    }
  }

  const pendingCount = invitations.filter(i => i.display_status === 'pending').length
  const acceptedCount = invitations.filter(i => i.display_status === 'accepted').length

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Client Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Invite clients and manage registered accounts</p>
          </div>
          <Button onClick={() => { setShowInviteDialog(true); setInviteError(''); setFormErrors({}) }} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Client
          </Button>
        </div>

        {/* Success / error toasts */}
        {inviteSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" /> {inviteSuccess}
          </div>
        )}
        {actionError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {actionError}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Registered Clients', value: clients.length, icon: Users, color: 'text-primary' },
            { label: 'Pending Invitations', value: pendingCount, icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Accepted Invitations', value: acceptedCount, icon: CheckCircle, color: 'text-green-600 dark:text-green-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-3xl font-bold mt-0.5 ${color}`}>{value}</p>
                </div>
                <Icon className={`w-8 h-8 opacity-20 ${color}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="invitations">
          <TabsList>
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="w-4 h-4" />
              Invitations
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-white text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              Registered Clients
            </TabsTrigger>
          </TabsList>

          {/* ── Invitations Tab ── */}
          <TabsContent value="invitations" className="mt-4">
            <Card>
              <CardHeader className="px-5 py-3.5 border-b">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {loadingInvites ? 'Loading…' : `${invitations.length} invitation${invitations.length !== 1 ? 's' : ''}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {invitations.length === 0 && !loadingInvites && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Mail className="w-10 h-10 mx-auto mb-2 opacity-25" />
                    <p className="text-sm">No invitations sent yet.</p>
                    <p className="text-xs mt-1">Click "Invite Client" to get started.</p>
                  </div>
                )}
                {invitations.map((inv, i) => (
                  <div key={inv.id} className={`flex items-center gap-4 px-5 py-4 ${i < invitations.length - 1 ? 'border-b' : ''}`}>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{inv.full_name.charAt(0).toUpperCase()}</span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{inv.full_name}</span>
                        <StatusBadge status={inv.display_status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.email}</p>
                    </div>
                    {/* Dates */}
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Sent {formatDate(inv.created_at)}</p>
                      {inv.display_status === 'pending' && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">Expires {formatDate(inv.expires_at)}</p>
                      )}
                      {inv.display_status === 'accepted' && inv.accepted_at && (
                        <p className="text-xs text-green-600 dark:text-green-400">Accepted {formatDate(inv.accepted_at)}</p>
                      )}
                      {inv.invited_by && (
                        <p className="text-xs text-muted-foreground">by {inv.invited_by}</p>
                      )}
                    </div>
                    {/* Actions */}
                    {(inv.display_status === 'pending' || inv.display_status === 'expired' || inv.display_status === 'revoked') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Actions">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResend(inv)} className="gap-2 cursor-pointer">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Resend Invitation
                          </DropdownMenuItem>
                          {inv.display_status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleRevoke(inv)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                              <Ban className="w-3.5 h-3.5" />
                              Revoke
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Clients Tab ── */}
          <TabsContent value="clients" className="mt-4">
            <Card>
              <CardHeader className="px-5 py-3.5 border-b">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {loadingClients ? 'Loading…' : `${clients.length} registered client${clients.length !== 1 ? 's' : ''}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {clients.length === 0 && !loadingClients && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-25" />
                    <p className="text-sm">No registered clients yet.</p>
                  </div>
                )}
                {clients.map((c, i) => (
                  <div key={c.id} className={`flex items-center gap-4 px-5 py-4 ${i < clients.length - 1 ? 'border-b' : ''}`}>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{c.full_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{c.full_name}</span>
                        {c.was_invited && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Invited</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.email}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        {c.declaration_count} declaration{c.declaration_count !== 1 ? 's' : ''}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Joined {formatDate(c.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/clients/${c.id}`)} className="gap-1.5 text-xs">
                        View <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Invite a Client
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. James Rivera"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className={formErrors['full_name'] ? 'border-destructive' : ''}
              />
              {formErrors['full_name'] && <p className="text-xs text-destructive">{formErrors['full_name']}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email Address <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={formErrors['email'] ? 'border-destructive' : ''}
              />
              {formErrors['email'] && <p className="text-xs text-destructive">{formErrors['email']}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Personal Message <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                rows={3}
                placeholder="Add a personal note to include in the invitation email…"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="resize-none text-sm"
              />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              An invitation email will be sent with a secure link valid for <strong className="text-foreground">7 days</strong>.
            </div>
            {inviteError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {inviteError}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={inviting} className="gap-2">
                <Mail className="w-3.5 h-3.5" />
                {inviting ? 'Sending…' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
