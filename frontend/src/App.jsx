import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'

// ── Portal ────────────────────────────────────────────────────────────────────
const HomePage      = lazy(() => import('./pages/portal/HomePage'))
const MyTicketsPage = lazy(() => import('./pages/tickets/MyTicketsPage'))
const TicketsPage   = lazy(() => import('./pages/tickets/TicketsPage'))
const TicketDetail  = lazy(() => import('./pages/tickets/TicketDetailPage'))
const CreateTicket  = lazy(() => import('./pages/tickets/CreateTicketPage'))
const ProfilePage   = lazy(() => import('./pages/profile/ProfilePage'))

// ── Admin — Users ─────────────────────────────────────────────────────────────
const UsersPage      = lazy(() => import('./pages/admin/users/UsersPage'))
const CreateUserPage = lazy(() => import('./pages/admin/users/CreateUserPage'))
const EditUserPage   = lazy(() => import('./pages/admin/users/EditUserPage'))

// ── Admin — Groups ────────────────────────────────────────────────────────────
const GroupsPage    = lazy(() => import('./pages/admin/groups/GroupsPage'))
const GroupFormPage = lazy(() => import('./pages/admin/groups/GroupFormPage'))

// ── Admin — Config ────────────────────────────────────────────────────────────
const StatusManagePage    = lazy(() => import('./pages/admin/config/StatusManagePage'))
const PriorityManagePage  = lazy(() => import('./pages/admin/config/PriorityManagePage'))
const UrgencyManagePage   = lazy(() => import('./pages/admin/config/UrgencyManagePage'))
const WorkTypeManagePage  = lazy(() => import('./pages/admin/config/WorkTypeManagePage'))
const LabelManagePage     = lazy(() => import('./pages/admin/config/LabelManagePage'))
const ComponentManagePage = lazy(() => import('./pages/admin/config/ComponentManagePage'))

// ── Admin — Announcements ─────────────────────────────────────────────────────
const AnnouncementsPage = lazy(() => import('./pages/admin/announcements/AnnouncementsPage'))

// ── Admin — Analytics ─────────────────────────────────────────────────────────
const AnalyticsPage = lazy(() => import('./pages/admin/analytics/AnalyticsPage'))

// ── Admin — Home Page Management (superadmin only) ────────────────────────────
const HomePageManagePage = lazy(() => import('./pages/admin/homepage/HomePageManagePage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
})

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="spinner spinner-lg" />
    </div>
  )
}

function ProtectedLayout({ children, requiredRole }) {
  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* ── Public ── */}
            <Route path="/login" element={<LoginPage />} />

            {/* ── Portal ── */}
            <Route path="/" element={<ProtectedLayout><HomePage /></ProtectedLayout>} />
            <Route path="/my-tickets" element={<ProtectedLayout><MyTicketsPage /></ProtectedLayout>} />
            <Route path="/tickets" element={<ProtectedLayout><TicketsPage /></ProtectedLayout>} />
            <Route path="/tickets/create" element={<ProtectedLayout><CreateTicket /></ProtectedLayout>} />
            <Route path="/tickets/:id" element={<ProtectedLayout><TicketDetail /></ProtectedLayout>} />
            <Route path="/profile" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />

            {/* ── Analytics (manager+) ── */}
            <Route path="/analytics" element={<ProtectedLayout requiredRole="manager"><AnalyticsPage /></ProtectedLayout>} />
            <Route path="/dashboard" element={<ProtectedLayout requiredRole="manager"><AnalyticsPage /></ProtectedLayout>} />

            {/* ── User Management (admin+) ── */}
            <Route path="/admin/users"           element={<ProtectedLayout requiredRole="admin"><UsersPage /></ProtectedLayout>} />
            <Route path="/admin/users/create"    element={<ProtectedLayout requiredRole="admin"><CreateUserPage /></ProtectedLayout>} />
            <Route path="/admin/users/:id/edit"  element={<ProtectedLayout requiredRole="admin"><EditUserPage /></ProtectedLayout>} />

            {/* ── Group Management (admin+) ── */}
            <Route path="/admin/groups"          element={<ProtectedLayout requiredRole="admin"><GroupsPage /></ProtectedLayout>} />
            <Route path="/admin/groups/create"   element={<ProtectedLayout requiredRole="admin"><GroupFormPage /></ProtectedLayout>} />
            <Route path="/admin/groups/:id/edit" element={<ProtectedLayout requiredRole="admin"><GroupFormPage /></ProtectedLayout>} />

            {/* ── Status Management (admin+) ── */}
            <Route path="/admin/statuses"        element={<ProtectedLayout requiredRole="admin"><StatusManagePage /></ProtectedLayout>} />

            {/* ── Priority Management (admin+) ── */}
            <Route path="/admin/priority"        element={<ProtectedLayout requiredRole="admin"><PriorityManagePage /></ProtectedLayout>} />

            {/* ── Urgency Management (admin+) ── */}
            <Route path="/admin/urgency"         element={<ProtectedLayout requiredRole="admin"><UrgencyManagePage /></ProtectedLayout>} />

            {/* ── Work Type Management (manager+) ── */}
            <Route path="/admin/worktypes"       element={<ProtectedLayout requiredRole="manager"><WorkTypeManagePage /></ProtectedLayout>} />

            {/* ── Label Management (manager+) ── */}
            <Route path="/admin/labels"          element={<ProtectedLayout requiredRole="manager"><LabelManagePage /></ProtectedLayout>} />

            {/* ── Component Management (manager+) ── */}
            <Route path="/admin/components"      element={<ProtectedLayout requiredRole="manager"><ComponentManagePage /></ProtectedLayout>} />

            {/* ── Announcements (manager+) ── */}
            <Route path="/admin/announcements"   element={<ProtectedLayout requiredRole="manager"><AnnouncementsPage /></ProtectedLayout>} />

            {/* ── Home Page Management (superadmin only) ── */}
            <Route path="/admin/home-page"       element={<ProtectedLayout requiredRole="superadmin"><HomePageManagePage /></ProtectedLayout>} />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}