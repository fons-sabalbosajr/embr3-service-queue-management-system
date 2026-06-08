import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();

  if (loading) {
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
    );
  }

  if (!admin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
