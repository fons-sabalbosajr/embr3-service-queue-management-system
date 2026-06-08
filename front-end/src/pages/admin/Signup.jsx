import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Form, Input, Select, message } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

const ROLE_OPTIONS = [
  { value: 'Super Admin/Developer', label: 'Super Admin/Developer' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Queue Officer', label: 'Queue Officer' },
  { value: 'Secretariat', label: 'Secretariat' },
];

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const { persistSession } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = values;
      const { data } = await apiClient.post('/auth/signup', payload);
      persistSession(data);
      message.success('Account created. Welcome aboard!');
      navigate('/home');
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to create account.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Admin Account"
      subtitle="Register a new administrator for the SQMS console."
      footer={
        <>
          Already have an account? <Link to="/admin">Sign in</Link>
        </>
      }
    >
      <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="name"
          label="Full Name"
          rules={[{ required: true, message: 'Please enter your name.' }]}
        >
          <Input
            size="large"
            prefix={<UserOutlined />}
            placeholder="Jane Administrator"
          />
        </Form.Item>

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
          name="role"
          label="User Level"
          initialValue="Admin"
          rules={[{ required: true, message: 'Please select a user level.' }]}
        >
          <Select
            size="large"
            options={ROLE_OPTIONS}
            suffixIcon={<SafetyCertificateOutlined />}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Please enter a password.' },
            { min: 8, message: 'Password must be at least 8 characters.' },
          ]}
          hasFeedback
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="At least 8 characters"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={['password']}
          hasFeedback
          rules={[
            { required: true, message: 'Please confirm your password.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match.'));
              },
            }),
          ]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="Re-enter your password"
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" block loading={loading}>
          Create Account
        </Button>
      </Form>
    </AuthLayout>
  );
}
