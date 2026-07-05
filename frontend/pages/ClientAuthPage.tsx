import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLoginClient } from '../hooks/backend/clients'
import { useRegisterClient } from '../hooks/backend/clients'
import { useClientAuth } from '../hooks/useClientAuth'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../lib/shadcn/tabs'
import { FileText, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'

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

export default function ClientAuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useClientAuth()

  const { trigger: triggerLogin, loading: loggingIn } = useLoginClient()
  const { trigger: triggerRegister, loading: registering } = useRegisterClient()

  const from = (location.state as { from?: string } | null)?.from ?? '/new'

  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')

  // Register form
  const [regForm, setRegForm] = useState({ full_name: '', email: '', password: '', confirm_password: '' })
  const [regErrors, setRegErrors] = useState<Record<string, string>>({})
  const [regSuccess, setRegSuccess] = useState(false)

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [showRegPw, setShowRegPw] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    if (!loginForm.email || !loginForm.password) {
      setLoginError('Please enter your email and password.')
      return
    }
    try {
      const result = await triggerLogin({ email: loginForm.email, password: loginForm.password }) as ClientAuthSession
      login(result)
      navigate(result.client.onboarding_status === 'complete' ? from : '/onboarding', { replace: true })
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  function validateRegister() {
    const errs: Record<string, string> = {}
    if (!regForm.full_name.trim()) errs['full_name'] = 'Full name is required.'
    if (!regForm.email.trim()) errs['email'] = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) errs['email'] = 'Enter a valid email address.'
    if (!regForm.password) errs['password'] = 'Password is required.'
    else if (regForm.password.length < 8) errs['password'] = 'Password must be at least 8 characters.'
    if (regForm.confirm_password !== regForm.password) errs['confirm_password'] = 'Passwords do not match.'
    return errs
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegErrors({})
    const errs = validateRegister()
    if (Object.keys(errs).length > 0) { setRegErrors(errs); return }
    try {
      await triggerRegister({ full_name: regForm.full_name, email: regForm.email, password: regForm.password })
      setRegSuccess(true)
      setRegForm({ full_name: '', email: '', password: '', confirm_password: '' })
      // Auto-switch to login tab after short delay
      setTimeout(() => {
        setRegSuccess(false)
        setActiveTab('login')
      }, 2000)
    } catch (err) {
      setRegErrors({ submit: err instanceof Error ? err.message : 'Registration failed. Please try again.' })
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

      {/* Center card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Client Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in or create an account to submit a declaration
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'login' | 'register')}>
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Create Account</TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login" className="mt-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Welcome back</CardTitle>
                  <CardDescription>Enter your email and password to access the declaration form.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email">Email Address</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginForm.email}
                        onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPw ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginForm.password}
                          onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                          autoComplete="current-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                        >
                          {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {loginError && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {loginError}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loggingIn}>
                      {loggingIn ? 'Signing in…' : 'Sign In'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* REGISTER TAB */}
            <TabsContent value="register" className="mt-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Create your account</CardTitle>
                  <CardDescription>Register to submit and track your declarations.</CardDescription>
                </CardHeader>
                <CardContent>
                  {regSuccess ? (
                    <div className="flex flex-col items-center py-6 text-center gap-3">
                      <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Account created!</p>
                        <p className="text-sm text-muted-foreground mt-1">Switch to the Sign In tab to log in with your new credentials.</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-name">Full Name <span className="text-destructive">*</span></Label>
                        <Input
                          id="reg-name"
                          placeholder="e.g. James Rivera"
                          value={regForm.full_name}
                          onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))}
                        />
                        {regErrors['full_name'] && <FieldError msg={regErrors['full_name']} />}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="reg-email">Email Address <span className="text-destructive">*</span></Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="you@example.com"
                          value={regForm.email}
                          onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                          autoComplete="email"
                        />
                        {regErrors['email'] && <FieldError msg={regErrors['email']} />}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="reg-password">Password <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Input
                            id="reg-password"
                            type={showRegPw ? 'text' : 'password'}
                            placeholder="Min. 8 characters"
                            value={regForm.password}
                            onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                            autoComplete="new-password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showRegPw ? 'Hide password' : 'Show password'}
                          >
                            {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {regErrors['password'] && <FieldError msg={regErrors['password']} />}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="reg-confirm">Confirm Password <span className="text-destructive">*</span></Label>
                        <Input
                          id="reg-confirm"
                          type="password"
                          placeholder="Re-enter your password"
                          value={regForm.confirm_password}
                          onChange={e => setRegForm(f => ({ ...f, confirm_password: e.target.value }))}
                          autoComplete="new-password"
                        />
                        {regErrors['confirm_password'] && <FieldError msg={regErrors['confirm_password']} />}
                      </div>

                      {regErrors['submit'] && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {regErrors['submit']}
                        </div>
                      )}

                      <Button type="submit" className="w-full" disabled={registering}>
                        {registering ? 'Creating account…' : 'Create Account'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground">
            This portal is for submitting official client declarations only.
          </p>
        </div>
      </div>
    </div>
  )
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {msg}
    </p>
  )
}
