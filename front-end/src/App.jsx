import { Suspense, lazy } from 'react'
import { Spin } from 'antd'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

const Login = lazy(() => import('./pages/admin/Login'))
const Signup = lazy(() => import('./pages/admin/Signup'))
const ForgotPassword = lazy(() => import('./pages/admin/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/admin/ResetPassword'))
const Home = lazy(() => import('./pages/admin/Home'))
const DeveloperUserAccountManagement = lazy(() =>
  import('./pages/admin/DeveloperUserAccountManagement')
)
const DeveloperDatabaseStatusConnections = lazy(() =>
  import('./pages/admin/DeveloperDatabaseStatusConnections')
)
const DeveloperAppLogs = lazy(() => import('./pages/admin/DeveloperAppLogs'))
const QueueOfficerServingDesk = lazy(() =>
  import('./pages/admin/QueueOfficerServingDesk')
)
const MyQueuePortal = lazy(() => import('./pages/admin/MyQueuePortal'))
const SecretariatStartTransaction = lazy(() =>
  import('./pages/admin/SecretariatStartTransaction')
)
const SettingsAssignedOfficers = lazy(() =>
  import('./pages/admin/SettingsAssignedOfficers')
)
const SettingsTransactionMonitoring = lazy(() =>
  import('./pages/admin/SettingsTransactionMonitoring')
)
const SettingsDashboardDisplay = lazy(() =>
  import('./pages/admin/SettingsDashboardDisplay')
)
const QueueDashboard = lazy(() => import('./pages/queue/QueueDashboard'))

function RouteLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f1f5f9',
      }}
    >
      <Spin size="large" />
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />

        <Route path="/admin" element={<Login />} />
        <Route path="/admin/signup" element={<Signup />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/developer/user-account-management"
          element={
            <ProtectedRoute>
              <DeveloperUserAccountManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/developer/database-status-connections"
          element={
            <ProtectedRoute>
              <DeveloperDatabaseStatusConnections />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/developer/app-logs"
          element={
            <ProtectedRoute>
              <DeveloperAppLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/settings/queue-assigned-officers"
          element={
            <ProtectedRoute>
              <SettingsAssignedOfficers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/settings/transaction-monitoring"
          element={
            <ProtectedRoute>
              <SettingsTransactionMonitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/settings/dashboard-display"
          element={
            <ProtectedRoute>
              <SettingsDashboardDisplay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/queue-officer/serving-desk"
          element={
            <ProtectedRoute>
              <QueueOfficerServingDesk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/queue-officer/my-queue-portal"
          element={
            <ProtectedRoute>
              <MyQueuePortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/secretariat/start-transaction"
          element={
            <ProtectedRoute>
              <SecretariatStartTransaction />
            </ProtectedRoute>
          }
        />
        <Route
          path="/queue-dashboard"
          element={
            <ProtectedRoute>
              <QueueDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App

