import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Form, Input, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const { token } = useParams();
  const { persistSession } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post(
        `/auth/reset-password/${token}`,
        { password: values.password }
      );
      persistSession(data);
      message.success('Password updated successfully.');
      navigate('/home');
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Reset link is invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set a New Password"
      subtitle="Choose a strong password for your admin account."
      footer={
        <>
          Back to <Link to="/admin">Sign in</Link>
        </>
      }
    >
      <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="password"
          label="New Password"
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
          Update Password
        </Button>
      </Form>
    </AuthLayout>
  );
}
