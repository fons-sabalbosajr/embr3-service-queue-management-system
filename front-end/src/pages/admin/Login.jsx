import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Form, Input, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { persistSession } = useAuth();
  const navigate = useNavigate();

  const resolveLandingRoute = (sessionAdmin) => {
    const modules = sessionAdmin?.accessModules || [];
    const accountType = sessionAdmin?.accountType;

    // Admin/developer accounts always go to the main dashboard.
    if (accountType === 'admin') {
      return '/home';
    }

    if (modules.includes('queue-officer-portal')) {
      return '/home/queue-officer/my-queue-portal';
    }

    if (modules.includes('queue-officer-serving-desk')) {
      return '/home/queue-officer/serving-desk';
    }

    return '/home';
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', values);
      persistSession(data);
      message.success('Welcome back!');
      navigate(resolveLandingRoute(data.admin));
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to sign in. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="SQMS Sign In"
      subtitle="Access the EMB R3 SQMS console using your admin email or queue officer username."
      footer={
        <>
          Don&apos;t have an account? <Link to="/admin/signup">Create one</Link>
        </>
      }
    >
      <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="identifier"
          label="Email or Username"
          rules={[{ required: true, message: 'Please enter your email or username.' }]}
        >
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder="admin@example.com or officer.username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Please enter your password.' }]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="Enter your password"
          />
        </Form.Item>

        <div style={{ textAlign: 'right', marginBottom: 18 }}>
          <Link to="/admin/forgot-password">Forgot password?</Link>
        </div>

        <Button type="primary" htmlType="submit" block loading={loading}>
          Sign In
        </Button>
      </Form>
    </AuthLayout>
  );
}
