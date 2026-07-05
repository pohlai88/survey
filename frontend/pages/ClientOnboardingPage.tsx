import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGetOnboardingFields } from '../hooks/backend/client'
import { useSaveClientProfile } from '../hooks/backend/client'
import { useClientAuth } from '../hooks/useClientAuth'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { Textarea } from '../lib/shadcn/textarea'
import { Label } from '../lib/shadcn/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import { Progress } from '../lib/shadcn/progress'
import { cn } from '../lib/shadcn/utils'
import {
  CheckCircle, AlertCircle, Loader2, ShieldCheck, User, ChevronRight,
} from 'lucide-react'

type FieldDef = {
  id: number
  field_key: string
  field_label: string
  field_type: string
  is_required: boolean
  placeholder: string | null
  help_text: string | null
  options: Array<{ label: string; value: string }> | null
}

export default function ClientOnboardingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { client, isAuthenticated, ready } = useClientAuth()

  const { trigger: loadFields, loading: loadingFields } = useGetOnboardingFields()
  const { trigger: saveProfile, loading: saving } = useSaveClientProfile()

  const [fields, setFields] = useState<FieldDef[]>([])
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!ready) return
    if (!isAuthenticated) {
      navigate('/client-login', { state: { from: location.pathname }, replace: true })
      return
    }
    loadFields({}).then(result => {
      const r = result as { client: { onboarding_status: string; profile_data: Record<string, string> } | null; fields: FieldDef[] } | undefined
      if (r?.client?.onboarding_status === 'complete') { navigate('/client-dashboard', { replace: true }); return }
      setFields(r?.fields ?? [])
      setFormData(r?.client?.profile_data ?? {})
    }).catch(() => {})
  }, [isAuthenticated, ready, navigate, loadFields, location.pathname])

  const requiredCount = fields.filter(f => f.is_required).length
  const filledRequired = fields.filter(f => f.is_required && formData[f.field_key]?.trim()).length
  const progress = requiredCount > 0 ? Math.round((filledRequired / requiredCount) * 100) : 100

  function validate() {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      if (f.is_required && !formData[f.field_key]?.trim()) {
        errs[f.field_key] = `${f.field_label} is required.`
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
    try {
      await saveProfile({ profile_data: formData })
      setSuccess(true)
      setTimeout(() => navigate('/client-dashboard'), 1800)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save profile.')
    }
  }

  function renderField(f: FieldDef) {
    const value = formData[f.field_key] ?? ''
    const error = fieldErrors[f.field_key]
    const onChange = (val: string) => setFormData(d => ({ ...d, [f.field_key]: val }))
    const baseClass = cn('text-sm', error ? 'border-destructive' : '')

    return (
      <div key={f.id} className="space-y-1.5">
        <Label htmlFor={f.field_key}>
          {f.field_label}
          {f.is_required && <span className="text-destructive ml-1">*</span>}
        </Label>

        {(f.field_type === 'text' || f.field_type === 'email' || f.field_type === 'phone' || f.field_type === 'number') && (
          <Input id={f.field_key} type={f.field_type === 'number' ? 'number' : f.field_type === 'email' ? 'email' : 'text'}
            placeholder={f.placeholder ?? ''} value={value} onChange={e => onChange(e.target.value)} className={baseClass} />
        )}
        {f.field_type === 'date' && (
          <Input id={f.field_key} type="date" value={value} onChange={e => onChange(e.target.value)} className={baseClass} />
        )}
        {f.field_type === 'textarea' && (
          <Textarea id={f.field_key} rows={3} placeholder={f.placeholder ?? ''} value={value}
            onChange={e => onChange(e.target.value)} className={cn('resize-none', baseClass)} />
        )}
        {f.field_type === 'select' && f.options && (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id={f.field_key} className={baseClass}>
              <SelectValue placeholder="Select an option…" />
            </SelectTrigger>
            <SelectContent>
              {f.options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {f.field_type === 'yes_no' && (
          <div className="flex gap-3">
            {(['Yes', 'No'] as const).map(opt => (
              <button key={opt} type="button" onClick={() => onChange(opt)}
                className={cn('flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all',
                  value === opt
                    ? opt === 'Yes' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                )}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {f.help_text && !error && <p className="text-xs text-muted-foreground">{f.help_text}</p>}
        {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
      </div>
    )
  }

  if (!ready || !isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">Identity Onboarding</span>
            <p className="text-xs text-muted-foreground">Client Declaration Portal</p>
          </div>
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Profile Complete!</h2>
          <p className="text-sm text-muted-foreground mt-1">Taking you to your dashboard…</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
          {/* Welcome */}
          <div className="flex items-start gap-3 p-4 rounded-xl border bg-primary/5">
            <User className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Welcome, {client?.full_name}!</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Before you can submit declarations, please complete your identity profile. This information is required for compliance purposes.
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Required fields completed</span>
              <span className="font-semibold text-foreground">{filledRequired} / {requiredCount}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {loadingFields && (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading profile fields…
            </div>
          )}

          {!loadingFields && fields.length > 0 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Group fields by sections */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Identity Information</CardTitle>
                  <CardDescription>Fields marked with * are required to complete onboarding.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map(f => renderField(f))}
                </CardContent>
              </Card>

              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" /> {submitError}
                </div>
              )}

              <Button type="submit" disabled={saving} className="w-full gap-2">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Saving profile…</>
                  : <><CheckCircle className="w-4 h-4" />Complete Onboarding<ChevronRight className="w-4 h-4" /></>
                }
              </Button>
            </form>
          )}

          {!loadingFields && fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border rounded-xl border-dashed">
              <p className="text-sm">No profile fields configured by your administrator.</p>
              <Button className="mt-4 gap-2" onClick={() => navigate('/client-dashboard')}>
                Continue to Dashboard <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
