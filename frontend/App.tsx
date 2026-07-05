import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ClientAuthProvider } from './hooks/useClientAuth'

const DeclarationsPage = lazy(() => import('./pages/DeclarationsPage'))
const DeclarationDetailPage = lazy(() => import('./pages/DeclarationDetailPage'))
const QuestionsPage = lazy(() => import('./pages/QuestionsPage'))
const QuestionSetEditorPage = lazy(() => import('./pages/QuestionSetEditorPage'))
const AdminClientsPage = lazy(() => import('./pages/AdminClientsPage'))
const AdminClientDetailPage = lazy(() => import('./pages/AdminClientDetailPage'))
const AdminProfileFieldsPage = lazy(() => import('./pages/AdminProfileFieldsPage'))
const ClientAuthPage = lazy(() => import('./pages/ClientAuthPage'))
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'))
const ClientOnboardingPage = lazy(() => import('./pages/ClientOnboardingPage'))
const ClientDashboardPage = lazy(() => import('./pages/ClientDashboardPage'))
const NewDeclarationPage = lazy(() => import('./pages/NewDeclarationPage'))

export default function App() {
  return (
    <ClientAuthProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading portal…</div>}>
        <Routes>
          {/* Admin */}
          <Route path="/" element={<DeclarationsPage />} />
          <Route path="/declaration/:id" element={<DeclarationDetailPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/questions/:id" element={<QuestionSetEditorPage />} />
          <Route path="/admin/clients" element={<AdminClientsPage />} />
          <Route path="/admin/clients/:id" element={<AdminClientDetailPage />} />
          <Route path="/admin/profile-fields" element={<AdminProfileFieldsPage />} />

          {/* Client */}
          <Route path="/client-login" element={<ClientAuthPage />} />
          <Route path="/invite/:token" element={<AcceptInvitePage />} />
          <Route path="/onboarding" element={<ClientOnboardingPage />} />
          <Route path="/client-dashboard" element={<ClientDashboardPage />} />
          <Route path="/new" element={<NewDeclarationPage />} />
        </Routes>
      </Suspense>
    </ClientAuthProvider>
  )
}
