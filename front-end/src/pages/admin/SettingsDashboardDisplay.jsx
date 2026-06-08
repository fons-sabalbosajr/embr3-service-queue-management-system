import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Switch
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

const { Text } = Typography;

export default function SettingsDashboardDisplay() {
  const { message } = App.useApp();
  const [cardForm] = Form.useForm();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingCard, setSavingCard] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/queue-display');
      setConfig(data.config);
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load queue display settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const openCreateModal = () => {
    setEditingCard(null);
    cardForm.resetFields();
    cardForm.setFieldsValue({ active: true });
    setModalOpen(true);
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    cardForm.setFieldsValue({
      transactionName: card.transactionName,
      active: card.active,
    });
    setModalOpen(true);
  };

  const handleSaveCard = async (values) => {
    setSavingCard(true);
    try {
      if (editingCard) {
        await apiClient.put(`/queue-display/cards/${editingCard._id}`, values);
        message.success('Counter card updated successfully.');
      } else {
        await apiClient.post('/queue-display/cards', values);
        message.success('Counter card created successfully.');
      }
      setModalOpen(false);
      cardForm.resetFields();
      loadConfig();
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to save counter card.');
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (card) => {
    try {
      await apiClient.delete(`/queue-display/cards/${card._id}`);
      message.success('Counter card deleted successfully.');
      loadConfig();
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to delete counter card.');
    }
  };

  const stats = useMemo(
    () => ({
      cards: config?.counterCards?.length || 0,
      active: config?.counterCards?.filter((item) => item.active).length || 0,
      hidden: config?.counterCards?.filter((item) => !item.active).length || 0,
    }),
    [config]
  );

  const cardColumns = [
    {
      title: 'Transaction',
      dataIndex: 'transactionName',
      key: 'transactionName',
    },
    {
      title: 'Label',
      key: 'label',
      render: () => <Tag color="blue">Serving</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Active' : 'Hidden'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this counter card?"
            description="The public dashboard will stop showing it."
            onConfirm={() => handleDeleteCard(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminShell
      title="Queue Dashboard Display Settings"
      subtitle="Manage the public dashboard refresh behavior and the transaction cards shown on the public board."
      extra={
        <div className="admin-data-toolbar">
          <Text type="secondary">
            Every active transaction card created here appears automatically on the queue dashboard.
          </Text>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add Counter Card
          </Button>
        </div>
      }
    >
      <div className="admin-data-stat-grid" style={{ marginBottom: 20 }}>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Counter Cards" value={stats.cards} prefix={<CheckCircleOutlined />} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Active Cards" value={stats.active} prefix={<CheckCircleOutlined />} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Hidden Cards" value={stats.hidden} prefix={<DeleteOutlined />} />
        </Card>
      </div>

      <Card bordered={false} className="admin-data-table-card">
        <Table
          className="admin-data-table"
          rowKey="_id"
          columns={cardColumns}
          dataSource={config?.counterCards || []}
          loading={loading}
          pagination={{ pageSize: 6 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingCard ? 'Edit Counter Card' : 'Create Counter Card'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => cardForm.submit()}
        confirmLoading={savingCard}
      >
        <Form form={cardForm} layout="vertical" onFinish={handleSaveCard} initialValues={{ active: true }}>
          <Form.Item
            name="transactionName"
            label="Transaction Name"
            rules={[{ required: true, message: 'Please enter a transaction name.' }]}
          >
            <Input placeholder="Permits" />
          </Form.Item>
          <Form.Item name="active" label="Show on public dashboard" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  );
}