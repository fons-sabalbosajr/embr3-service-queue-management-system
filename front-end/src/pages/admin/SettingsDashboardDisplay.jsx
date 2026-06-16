import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  Switch
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import LoadingScreen from '../../components/LoadingScreen';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

const { Text } = Typography;

export default function SettingsDashboardDisplay() {
  const { message } = App.useApp();
  const [cardForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingCard, setSavingCard] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/queue-display');
      setConfig(data.config);
      settingsForm.setFieldsValue({
        boardTitle: data.config.boardTitle,
        boardTitleSize: data.config.boardTitleSize ?? 56,
        boardSubtitle: data.config.boardSubtitle,
        boardSubtitleSize: data.config.boardSubtitleSize ?? 36,
      });
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
    cardForm.setFieldsValue({ active: true, order: (config?.counterCards?.length || 0) + 1 });
    setModalOpen(true);
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    cardForm.setFieldsValue({
      transactionName: card.transactionName,
      active: card.active,
      order: (card.order || 0) + 1,
    });
    setModalOpen(true);
  };

  const handleSaveSettings = async (values) => {
    setSavingSettings(true);
    try {
      await apiClient.put('/queue-display/settings', values);
      message.success('Queue dashboard header settings updated successfully.');
      loadConfig();
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to save queue dashboard header settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveCard = async (values) => {
    setSavingCard(true);
    try {
      const payload = {
        ...values,
        order: Math.max((values.order || 1) - 1, 0),
      };

      if (editingCard) {
        await apiClient.put(`/queue-display/cards/${editingCard._id}`, payload);
        message.success('Counter card updated successfully.');
      } else {
        await apiClient.post('/queue-display/cards', payload);
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

  const cardColumns = [
    {
      title: 'Transaction',
      dataIndex: 'transactionName',
      key: 'transactionName',
    },
    {
      title: 'Display Order',
      dataIndex: 'order',
      key: 'order',
      render: (value) => <Tag color="purple">#{(value || 0) + 1}</Tag>,
    },
    {
      title: 'Number Cards',
      key: 'numberCards',
      render: () => (
        <Space wrap>
          <Tag color="blue">Regular</Tag>
          <Tag color="gold">Priority</Tag>
        </Space>
      ),
    },
    {
      title: 'Public Header',
      key: 'publicHeader',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{config?.boardTitle || 'Queue Dashboard'}</Text>
          <Text type="secondary">{record.transactionName}</Text>
        </Space>
      ),
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
            Every active transaction card created here appears automatically on the Queue Dashboard
          </Text>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add Counter Card
          </Button>
        </div>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} xl={12}>
          <Card bordered={false} className="admin-data-table-card" loading={loading}>
            <Form form={settingsForm} layout="vertical" onFinish={handleSaveSettings}>
              <Row gutter={[12, 0]}>
                <Col xs={24} md={16}>
                  <Form.Item
                    name="boardTitle"
                    label="Public Board Title"
                    rules={[{ required: true, message: 'Please enter the public board title.' }]}
                  >
                    <Input placeholder="Queue Dashboard" maxLength={60} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="boardTitleSize"
                    label="Title Font Size (px)"
                    rules={[{ required: true, message: 'Required.' }, { type: 'number', min: 20, max: 120, message: '20–120 px' }]}
                  >
                    <InputNumber min={20} max={120} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[12, 0]}>
                <Col xs={24} md={16}>
                  <Form.Item
                    name="boardSubtitle"
                    label="Public Board Subtitle"
                    rules={[{ required: true, message: 'Please enter the public board subtitle.' }]}
                  >
                    <Input placeholder="Now Serving" maxLength={60} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="boardSubtitleSize"
                    label="Subtitle Font Size (px)"
                    rules={[{ required: true, message: 'Required.' }, { type: 'number', min: 14, max: 80, message: '14–80 px' }]}
                  >
                    <InputNumber min={14} max={80} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={savingSettings} icon={<SaveOutlined />}>
                Save Header Settings
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="admin-data-table-card">
        <Table
          className="admin-data-table"
          rowKey="_id"
          columns={cardColumns}
          dataSource={config?.counterCards || []}
          loading={loading}
          pagination={{ pageSize: 6 }}
          scroll={{ x: 'max-content' }}
          size='small'
        />
      </Card>

      <Modal
        title={editingCard ? 'Edit Counter Card' : 'Create Counter Card'}
        open={modalOpen}
        onCancel={() => !savingCard && setModalOpen(false)}
        onOk={() => cardForm.submit()}
        confirmLoading={savingCard}
        closable={!savingCard}
        maskClosable={!savingCard}
        width={600}
      >
        {savingCard ? (
          <LoadingScreen compact title="Saving counter card" description="Validating the public dashboard card and display order." />
        ) : (
        <Form form={cardForm} layout="vertical" onFinish={handleSaveCard} initialValues={{ active: true }}>
          <Form.Item
            name="transactionName"
            label="Transaction Name"
            rules={[{ required: true, message: 'Please enter a transaction name.' }]}
          >
            <Input placeholder="Permits" />
          </Form.Item>
          <Form.Item
            name="order"
            label="Display Order"
            rules={[{ required: true, message: 'Please enter the display order.' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="active" label="Show on public dashboard" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
        )}
      </Modal>
    </AdminShell>
  );
}