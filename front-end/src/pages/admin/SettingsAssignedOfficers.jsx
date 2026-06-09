import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

const { Text } = Typography;

const TRANSACTION_OPTIONS = [
  'Permits',
  'Clearance',
  'Inspection',
  'Payments',
  'Certification',
];

const DEFAULT_OFFICER_ACCESS = [
  'dashboard',
  'queue-dashboard',
  'queue-officer',
  'queue-officer-serving-desk',
  'queue-officer-portal',
];

const ACCESS_ROWS = [
  {
    key: 'dashboard',
    label: 'Dashboard Menu',
    description: 'Allow access to the home dashboard.',
  },
  {
    key: 'queue-dashboard',
    label: 'Public Queue Dashboard',
    description: 'Allow launching the public queue board.',
  },
  {
    key: 'queue-officer-serving-desk',
    label: 'Serving Desk',
    description: 'Show the serving desk menu page.',
  },
  {
    key: 'queue-officer-portal',
    label: 'My Queue Portal',
    description: 'Show the queue officer portal page.',
  },
];

export default function SettingsAssignedOfficers() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [selectedAccessModules, setSelectedAccessModules] = useState(DEFAULT_OFFICER_ACCESS);
  const [accountEnabled, setAccountEnabled] = useState(true);

  const loadOfficers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/queue-officers');
      setOfficers(data.officers || []);
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to load queue officers.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  const openCreateModal = () => {
    setEditingOfficer(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'Available',
      username: '',
      password: '',
      accountStatus: 'Active',
      accessModules: DEFAULT_OFFICER_ACCESS,
    });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingOfficer(record);
    form.setFieldsValue({
      name: record.name,
      username: record.username,
      position: record.position,
      designation: record.designation,
      assignedTransaction: [record.assignedTransaction],
      status: record.status,
      password: '',
    });
    setModalOpen(true);
  };

  const openAccessModal = (record) => {
    setSelectedOfficer(record);
    setSelectedAccessModules(record.accessModules || DEFAULT_OFFICER_ACCESS);
    setAccountEnabled(record.accountStatus !== 'Inactive');
    setAccessModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        assignedTransaction: Array.isArray(values.assignedTransaction)
          ? values.assignedTransaction[0]
          : values.assignedTransaction,
        accountStatus: values.accountStatus || 'Active',
        accessModules: values.accessModules || DEFAULT_OFFICER_ACCESS,
      };

      if (!payload.password) {
        delete payload.password;
      }

      if (editingOfficer) {
        await apiClient.put(`/queue-officers/${editingOfficer._id}`, payload);
        message.success('Queue officer updated successfully.');
      } else {
        await apiClient.post('/queue-officers', payload);
        message.success('Queue officer created successfully.');
      }

      setModalOpen(false);
      form.resetFields();
      loadOfficers();
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to save queue officer.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccess = async () => {
    if (!selectedOfficer) {
      return;
    }

    setAccessSaving(true);
    try {
      await apiClient.patch(`/queue-officers/${selectedOfficer._id}/access`, {
        accountStatus: accountEnabled ? 'Active' : 'Inactive',
        accessModules: selectedAccessModules,
      });
      message.success('Queue officer access updated successfully.');
      setAccessModalOpen(false);
      loadOfficers();
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to update queue officer access.'
      );
    } finally {
      setAccessSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await apiClient.delete(`/queue-officers/${record._id}`);
      message.success('Queue officer deleted successfully.');
      loadOfficers();
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to delete queue officer.'
      );
    }
  };

  const stats = useMemo(
    () => ({
      total: officers.length,
      available: officers.filter((item) => item.status === 'Available').length,
      activeTransactions: new Set(
        officers.map((item) => item.assignedTransaction)
      ).size,
    }),
    [officers]
  );

  const transactionOptions = useMemo(() => {
    const values = new Set([
      ...TRANSACTION_OPTIONS,
      ...officers.map((item) => item.assignedTransaction).filter(Boolean),
    ]);

    return Array.from(values).map((value) => ({ value, label: value }));
  }, [officers]);

  const columns = [
    {
      title: 'Officer',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div className="admin-table-name">
          <span className="admin-pill-icon">
            <TeamOutlined />
          </span>
          <div>
            <strong>{record.name}</strong>
            <span className="admin-table-subtext">{record.employeeId}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Credentials',
      key: 'credentials',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.username}</Text>
          <Text type="secondary">{record.accountStatus || 'Active'}</Text>
        </Space>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
    },
    {
      title: 'Assigned Transaction',
      dataIndex: 'assignedTransaction',
      key: 'assignedTransaction',
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: 'Menu Access',
      dataIndex: 'accessModules',
      key: 'accessModules',
      render: (value = []) =>
        value
          .filter((item) => item !== 'queue-officer')
          .slice(0, 3)
          .map((item) => (
            <Tag key={item} color="purple">
              {item}
            </Tag>
          )),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => (
        <Tag color={value === 'Available' ? 'green' : 'red'}>{value}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Button icon={<SafetyCertificateOutlined />} onClick={() => openAccessModal(record)}>
            Manage Access
          </Button>
          <Popconfirm
            title="Delete this queue officer?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record)}
          >
            <Button danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const accessColumns = [
    {
      title: 'Portal Access Item',
      dataIndex: 'label',
      key: 'label',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.label}</Text>
          <Text type="secondary">{record.description}</Text>
        </Space>
      ),
    },
    {
      title: 'Visible',
      key: 'visible',
      width: 120,
      render: (_, record) => (
        <Switch
          checked={selectedAccessModules.includes(record.key)}
          onChange={(checked) => {
            setSelectedAccessModules((current) => {
              const next = new Set(current.filter((item) => item !== 'queue-officer'));
              if (checked) {
                next.add(record.key);
              } else {
                next.delete(record.key);
              }
              if (next.has('queue-officer-serving-desk') || next.has('queue-officer-portal')) {
                next.add('queue-officer');
              }
              return Array.from(next);
            });
          }}
        />
      ),
    },
  ];

  return (
    <AdminShell
      title="Queue Assigned Officers Config"
      subtitle="Manage live queue officers, staffing status, and transaction assignments from MongoDB."
      extra={
        <div className="admin-data-toolbar">
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add Queue Officer
          </Button>
        </div>
      }
    >
      <div className="admin-data-stat-grid" style={{ marginBottom: 20 }}>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Total Officers" value={stats.total} prefix={<TeamOutlined />} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic
            title="Available Now"
            value={stats.available}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic
            title="Active Transactions"
            value={stats.activeTransactions}
            prefix={<UserSwitchOutlined />}
          />
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card bordered={false} className="admin-data-table-card">
            <Table
              className="admin-data-table"
              rowKey="_id"
              columns={columns}
              dataSource={officers}
              loading={loading}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingOfficer ? 'Edit Queue Officer' : 'Create Queue Officer'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editingOfficer ? 'Save Changes' : 'Create Officer'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: 'Available' }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a name.' }]}>
            <Input placeholder="Juan Officer" />
          </Form.Item>
          <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Please enter a username.' }]}>
            <Input placeholder="juan.officer" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingOfficer ? 'Password (optional)' : 'Password'}
            rules={editingOfficer ? [] : [{ required: true, message: 'Please enter a password.' }]}
          >
            <Input.Password placeholder="At least 8 characters" />
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true, message: 'Please enter a position.' }]}>
            <Input placeholder="Queue Supervisor" />
          </Form.Item>
          <Form.Item name="designation" label="Designation" rules={[{ required: true, message: 'Please enter a designation.' }]}>
            <Input placeholder="Environmental Management Specialist" />
          </Form.Item>
          <Form.Item
            name="assignedTransaction"
            label="Assigned Transaction"
            rules={[{ required: true, message: 'Please select a transaction.' }]}
          >
            <Select
              mode="tags"
              maxCount={1}
              options={transactionOptions}
              placeholder="Select or type a custom transaction"
            />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select a status.' }]}>
            <Select
              options={[
                { value: 'Available', label: 'Available' },
                { value: 'Not Available', label: 'Not Available' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Manage Access${selectedOfficer ? `: ${selectedOfficer.name}` : ''}`}
        open={accessModalOpen}
        onCancel={() => setAccessModalOpen(false)}
        onOk={handleSaveAccess}
        confirmLoading={accessSaving}
        okText="Save Access"
        width={760}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space direction="vertical" size={0}>
            <Text strong>Portal Account</Text>
            <Text type="secondary">Enable or disable sign-in for this queue officer.</Text>
          </Space>
          <Switch checked={accountEnabled} onChange={setAccountEnabled} />
        </div>

        <Table
          rowKey="key"
          pagination={false}
          columns={accessColumns}
          dataSource={ACCESS_ROWS}
          size="small"
        />
      </Modal>
    </AdminShell>
  );
}