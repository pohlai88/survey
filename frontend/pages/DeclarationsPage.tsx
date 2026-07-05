import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminNav from '../components/AdminNav'
import { useGetDeclarations } from '../hooks/backend/declarations'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Skeleton } from '../lib/shadcn/skeleton'
import { Tabs, TabsList, TabsTrigger } from '../lib/shadcn/tabs'
import { useClientAuth } from '../hooks/useClientAuth'
import {
  FileText,
  Search,
  Plus,
  ChevronRight,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  LogOut,
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
  feedback_count: number
  last_reviewed_at: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

const TYPE_COLORS: Record<string, string> = {
  'Financial Disclosure': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  'Identity Verification': 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  'Compliance Declaration': 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  'Inquiry Submission': 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
  'Questionnaire': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  'Statement Disclosure': 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-muted text-muted-foreground', icon: AlertCircle }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function DeclarationSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-64" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}

export default function DeclarationsPage() {
  const navigate = useNavigate()
  const { client, isAuthenticated, logout } = useClientAuth()
  const { data, loading, error, trigger } = useGetDeclarations()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    trigger({ status: activeTab, search: debouncedSearch })
  }, [activeTab, debouncedSearch])

  const declarations = (data as Declaration[] | undefined) ?? []

  const counts = {
    all: declarations.length,
    pending: declarations.filter(d => d.status === 'pending').length,
    approved: declarations.filter(d => d.status === 'approved').length,
    rejected: declarations.filter(d => d.status === 'rejected').length,
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-6 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Client Declarations</h1>
          <p className="text-sm text-muted-foreground">Review and manage client declaration submissions</p>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <User className="w-3.5 h-3.5" />
                {client?.full_name}
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
          <Button
            onClick={() => isAuthenticated ? navigate('/new') : navigate('/client-login', { state: { from: '/new' } })}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Declaration
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', count: declarations.length, icon: FileText, color: 'text-foreground' },
            { label: 'Pending', count: declarations.filter(d => d.status === 'pending').length, icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Approved', count: declarations.filter(d => d.status === 'approved').length, icon: CheckCircle, color: 'text-green-600 dark:text-green-400' },
            { label: 'Rejected', count: declarations.filter(d => d.status === 'rejected').length, icon: XCircle, color: 'text-red-600 dark:text-red-400' },
          ].map(({ label, count, icon: Icon, color }) => (
            <Card key={label} className="py-3">
              <CardContent className="px-4 py-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{loading ? '—' : count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, subject or type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* List */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {loading ? 'Loading...' : `${declarations.length} declaration${declarations.length !== 1 ? 's' : ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {error && (
              <div className="px-5 pb-4 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Failed to load declarations: {error}
              </div>
            )}

            {loading && (
              <div className="px-5 pb-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <DeclarationSkeleton key={i} />)}
              </div>
            )}

            {!loading && declarations.length === 0 && (
              <div className="px-5 pb-8 pt-4 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No declarations found</p>
              </div>
            )}

            {!loading && declarations.map((decl, idx) => (
              <button
                key={decl.id}
                onClick={() => navigate(`/declaration/${decl.id}`)}
                className={`w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-accent/50 transition-colors group ${idx < declarations.length - 1 ? 'border-b' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-foreground text-sm">{decl.client_name}</span>
                    <span className="text-xs text-muted-foreground">{decl.client_email}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[decl.declaration_type] ?? 'bg-muted text-muted-foreground'}`}>
                      {decl.declaration_type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground/80 mb-1 truncate">{decl.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{decl.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <StatusBadge status={decl.status} />
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="w-3 h-3" />
                      {decl.feedback_count} feedback
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(decl.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1 shrink-0" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
