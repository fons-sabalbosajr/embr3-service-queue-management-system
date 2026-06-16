import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return <LoadingScreen title="Checking access" description="Validating your session and page permissions." />;
  }

  if (!admin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
