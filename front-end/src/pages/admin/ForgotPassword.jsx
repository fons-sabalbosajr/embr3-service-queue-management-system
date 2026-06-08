import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form, Input, Result, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import AuthLayout from './AuthLayout';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', values);
      setSent(true);
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to send recovery email.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check Your Inbox">
        <Result
          status="success"
          title="Recovery email sent"
          subTitle="If an account exists for that email, a password reset link is on its way. The link expires in 30 minutes."
          extra={
            <Link to="/admin">
              <Button type="primary">Back to Sign In</Button>
            </Link>
          }
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your admin email and we'll send a recovery link."
      footer={
        <>
          Remembered it? <Link to="/admin">Sign in</Link>
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

        <Button type="primary" htmlType="submit" block loading={loading}>
          Send Recovery Link
        </Button>
      </Form>
    </AuthLayout>
  );
}
