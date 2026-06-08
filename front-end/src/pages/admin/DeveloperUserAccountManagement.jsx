import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

const { Text } = Typography;

const ROLE_OPTIONS = ['Super Admin/Developer', 'Admin', 'Queue Officer', 'Secretariat'];
const ACCESS_OPTIONS = [
  { label: 'View Dashboard Menu', value: 'dashboard' },
  { label: 'View Developer Menu', value: 'developer' },
  { label: 'View Settings Menu', value: 'settings' },
  { label: 'View Queue Officer Menu', value: 'queue-officer' },
  { label: 'View Secretariat Menu', value: 'secretariat' },
  { label: 'View Queue Dashboard', value: 'queue-dashboard' },
];

export default function DeveloperUserAccountManagement() {
  const { message } = App.useApp();
  const { admin } = useAuth();
  const [form] = Form.useForm();
  const [accessForm] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin-users');
      setUsers(data.admins || []);
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to load user accounts.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((item) => item.status === 'Active').length,
      superAdmins: users.filter((item) => item.role === 'Super Admin/Developer').length,
    }),
    [users]
  );

  const openCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      role: 'Queue Officer',
      status: 'Active',
      accessModules: ['dashboard'],
    });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      role: record.role,
      status: record.status,
      accessModules: record.accessModules || ['dashboard'],
      password: '',
    });
    setModalOpen(true);
  };

  const openAccessModal = (record) => {
    setSelectedUser(record);
    accessForm.setFieldsValue({
      role: record.role,
      status: record.status,
      accessModules: record.accessModules || ['dashboard'],
    });
    setAccessModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        email: values.email,
        role: values.role,
        status: values.status,
        accessModules: values.accessModules,
      };

      if (values.password) {
        payload.password = values.password;
      }

      if (editingUser) {
        await apiClient.put(`/admin-users/${editingUser.id}`, payload);
        message.success('User account updated successfully.');
      } else {
        await apiClient.post('/admin-users', {
          ...payload,
          password: values.password,
        });
        message.success('User account created successfully.');
      }

      setModalOpen(false);
      form.resetFields();
      loadUsers();
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to save user account.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAccessSave = async (values) => {
    if (!selectedUser) {
      return;
    }

    setAccessSaving(true);
    try {
      await apiClient.patch(`/admin-users/${selectedUser.id}/access`, values);
      message.success('Access permissions updated successfully.');
      setAccessModalOpen(false);
      loadUsers();
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to update access permissions.'
      );
    } finally {
      setAccessSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await apiClient.delete(`/admin-users/${record.id}`);
      message.success('User account deleted successfully.');
      loadUsers();
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to delete user account.'
      );
    }
  };

  const columns = [
    {
      title: 'Administrator',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div className="admin-table-name">
          <span className="admin-pill-icon">
            <UserOutlined />
          </span>
          <div>
            <strong>{record.name}</strong>
            <span className="admin-table-subtext">{record.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => (
        <Tag
          color={
            value === 'Active' ? 'green' : value === 'Pending' ? 'gold' : 'red'
          }
        >
          {value}
        </Tag>
      ),
    },
    {
      title: 'Access',
      dataIndex: 'accessModules',
      key: 'accessModules',
      render: (value = []) =>
        value.slice(0, 2).map((item) => (
          <Tag key={item} color="purple">
            {item}
          </Tag>
        )),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Button
            icon={<SafetyCertificateOutlined />}
            onClick={() => openAccessModal(record)}
          >
            Manage Access
          </Button>
          <Popconfirm
            title="Delete this user account?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record)}
            disabled={record.id === admin?.id}
          >
            <Button danger icon={<DeleteOutlined />} disabled={record.id === admin?.id}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminShell
      title="User Account Management"
      subtitle="Manage administrator accounts, access levels, and activation state from MongoDB."
      extra={
        <div className="admin-data-toolbar">
          <Text type="secondary">
            Create administrators, update their profile, and manage system access per user.
          </Text>
          <Space wrap>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Add Administrator
            </Button>
          </Space>
        </div>
      }
    >
      <div className="admin-data-stat-grid" style={{ marginBottom: 20 }}>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Total Users" value={stats.total} prefix={<TeamOutlined />} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Active Users" value={stats.active} prefix={<SafetyCertificateOutlined />} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Super Admins" value={stats.superAdmins} prefix={<UserOutlined />} />
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card bordered={false} className="admin-data-table-card">
            <Table
              className="admin-data-table"
              columns={columns}
              dataSource={users}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingUser ? 'Edit User Account' : 'Create User Account'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editingUser ? 'Save Changes' : 'Create User'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a name.' }]}>
            <Input placeholder="Maria Administrator" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter an email.' },
              { type: 'email', message: 'Enter a valid email.' },
            ]}
          >
            <Input placeholder="admin@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingUser ? 'Password (optional)' : 'Password'}
            rules={editingUser ? [] : [{ required: true, message: 'Please enter a password.' }]}
          >
            <Input.Password placeholder="At least 8 characters" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Please select a role.' }]}>
                <Select options={ROLE_OPTIONS.map((value) => ({ value, label: value }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select a status.' }]}>
                <Select
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Inactive', label: 'Inactive' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="accessModules" label="Initial Access" rules={[{ required: true, message: 'Please select at least one access module.' }]}>
            <Checkbox.Group options={ACCESS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Manage Access${selectedUser ? `: ${selectedUser.name}` : ''}`}
        open={accessModalOpen}
        onCancel={() => setAccessModalOpen(false)}
        onOk={() => accessForm.submit()}
        confirmLoading={accessSaving}
        okText="Save Access"
      >
        <Form form={accessForm} layout="vertical" onFinish={handleAccessSave}>
          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Please select a role.' }]}>
            <Select options={ROLE_OPTIONS.map((value) => ({ value, label: value }))} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select a status.' }]}>
            <Select
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </Form.Item>
          <Form.Item name="accessModules" label="Access Modules" rules={[{ required: true, message: 'Please select at least one access module.' }]}>
            <Checkbox.Group options={ACCESS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  );
}