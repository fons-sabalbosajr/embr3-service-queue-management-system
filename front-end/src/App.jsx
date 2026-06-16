import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoadingScreen from './components/LoadingScreen'
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
const QueueNumberInitialization = lazy(() =>
  import('./pages/admin/QueueNumberInitialization')
)
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
const SettingsActivityLogMaintenance = lazy(() =>
  import('./pages/admin/SettingsActivityLogMaintenance')
)
const SettingsDailyQueueReset = lazy(() =>
  import('./pages/admin/SettingsDailyQueueReset')
)
const SettingsDailyQueueArchives = lazy(() =>
  import('./pages/admin/SettingsDailyQueueArchives')
)
const QueueDashboard = lazy(() => import('./pages/queue/QueueDashboard'))
const CheckMyQueue = lazy(() => import('./pages/queue/CheckMyQueue'))

function RouteLoader() {
  return <LoadingScreen title="Loading page" description="Fetching the route bundle, validations, and screen data." />
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
          path="/home/settings/activity-log-maintenance"
          element={
            <ProtectedRoute>
              <SettingsActivityLogMaintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/settings/daily-queue-reset"
          element={
            <ProtectedRoute>
              <SettingsDailyQueueReset />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/settings/daily-queue-archives"
          element={
            <ProtectedRoute>
              <SettingsDailyQueueArchives />
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
          path="/home/queue-officer/queue-number-initialization"
          element={
            <ProtectedRoute>
              <QueueNumberInitialization />
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
          element={<QueueDashboard />}
        />
        <Route
          path="/check-my-queue"
          element={<CheckMyQueue />}
        />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App

