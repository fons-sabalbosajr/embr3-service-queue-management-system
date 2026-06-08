import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
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

export default function SettingsAssignedOfficers() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);

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
    form.setFieldsValue({ status: 'Available' });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingOfficer(record);
    form.setFieldsValue({
      name: record.name,
      position: record.position,
      designation: record.designation,
      assignedTransaction: [record.assignedTransaction],
      status: record.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        assignedTransaction: Array.isArray(values.assignedTransaction)
          ? values.assignedTransaction[0]
          : values.assignedTransaction,
      };

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
    </AdminShell>
  );
}