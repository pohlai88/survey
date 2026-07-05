import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGetInvitationByToken } from '../hooks/backend/admin'
import { useAcceptInvitation } from '../hooks/backend/admin'
import { useClientAuth } from '../hooks/useClientAuth'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import {
  FileText, CheckCircle, AlertCircle, Eye, EyeOff, Loader2, ShieldCheck,
} from 'lucide-react'

type Invitation = {
  id: number
  email: string
  full_name: string
  status: string
  display_status: string
  invited_by: string | null
  expires_at: string
}

type ClientUser = {
  id: number
  full_name: string
  email: string
  created_at: string
  onboarding_status?: string | null
}

type ClientAuthSession = {
  session_token: string
  client: ClientUser
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { login } = useClientAuth()

  const { trigger: getToken, loading: checkingToken } = useGetInvitationByToken()
  const { trigger: acceptFn, loading: accepting } = useAcceptInvitation()

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [tokenError, setTokenError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) { setTokenError('Missing invitation token.'); return }
    getToken({ token }).then(result => {
      const inv = result as Invitation | null
      if (!inv) { setTokenError('This invitation link is invalid or does not exist.'); return }
      if (inv.display_status === 'expired') { setTokenError('This invitation has expired. Please contact your administrator for a new one.'); return }
      if (inv.display_status === 'revoked') { setTokenError('This invitation has been revoked. Please contact your administrator.'); return }
      if (inv.display_status === 'accepted') { setTokenError('This invitation has already been used. Please sign in to your account.'); return }
      setInvitation(inv)
    }).catch(() => {
      setTokenError('Failed to validate invitation. Please try again.')
    })
  }, [token])

  function validate() {
    const errs: Record<string, string> = {}
    if (!password) errs['password'] = 'Password is required.'
    else if (password.length < 8) errs['password'] = 'Password must be at least 8 characters.'
    if (password !== confirmPassword) errs['confirm'] = 'Passwords do not match.'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    const errs = validate()
    setFormErrors(errs)
    if (Object.keys(errs).length > 0 || !token) return

    try {
      const result = await acceptFn({ token, password }) as ClientAuthSession
      login(result)
      setSuccess(true)
      setTimeout(() => navigate('/onboarding'), 2000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to activate account. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-foreground">Client Declaration Portal</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">

          {/* Loading state */}
          {checkingToken && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Validating your invitation…</p>
            </div>
          )}

          {/* Token error state */}
          {!checkingToken && tokenError && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Invitation Invalid</h2>
                <p className="text-sm text-muted-foreground mb-6">{tokenError}</p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => navigate('/client-login')} variant="outline">
                    Go to Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success state */}
          {success && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 w-fit mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Account activated!</h2>
                <p className="text-sm text-muted-foreground mt-1">Redirecting you to submit a declaration…</p>
              </CardContent>
            </Card>
          )}

          {/* Main form */}
          {!checkingToken && !tokenError && !success && invitation && (
            <>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Accept Your Invitation</h1>
                <p className="text-sm text-muted-foreground mt-1">Set your password to activate your account</p>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Welcome, {invitation.full_name}</CardTitle>
                  <CardDescription>
                    You've been invited{invitation.invited_by ? ` by ${invitation.invited_by}` : ''} to the Client Declaration Portal.
                    Your account email is <strong className="text-foreground">{invitation.email}</strong>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Read-only fields */}
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input value={invitation.full_name} readOnly className="bg-muted/50 cursor-default" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email Address</Label>
                      <Input value={invitation.email} readOnly className="bg-muted/50 cursor-default" />
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="password">
                          Choose a Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPw ? 'text' : 'password'}
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={`pr-10 ${formErrors['password'] ? 'border-destructive' : ''}`}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showPw ? 'Hide password' : 'Show password'}
                          >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {formErrors['password'] && <p className="text-xs text-destructive">{formErrors['password']}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="confirm-password">
                          Confirm Password <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className={formErrors['confirm'] ? 'border-destructive' : ''}
                          autoComplete="new-password"
                        />
                        {formErrors['confirm'] && <p className="text-xs text-destructive">{formErrors['confirm']}</p>}
                      </div>
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {submitError}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={accepting}>
                      {accepting
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Activating account…</>
                        : 'Activate Account & Sign In'
                      }
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      Already have an account?{' '}
                      <button type="button" onClick={() => navigate('/client-login')} className="text-primary underline-offset-2 hover:underline">
                        Sign in here
                      </button>
                    </p>
                  </form>
                </CardContent>
              </Card>

              <p className="text-center text-xs text-muted-foreground">
                Invitation expires {new Date(invitation.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
