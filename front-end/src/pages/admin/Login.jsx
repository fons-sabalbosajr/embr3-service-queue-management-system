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

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', values);
      persistSession(data);
      message.success('Welcome back!');
      navigate('/home');
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
      title="Admin Sign In"
      subtitle="Access the EMB R3 SQMS administration console."
      footer={
        <>
          Don&apos;t have an account? <Link to="/admin/signup">Create one</Link>
        </>
      }
    >
      <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please enter your email.' },
            { type: 'email', message: 'Enter a valid email.' },
          ]}
        >
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder="admin@example.com"
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
