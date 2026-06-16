import {
  AuditOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  PlusOutlined,
  SearchOutlined,
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
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import { exportToCSV, exportToExcel } from '../../utils/exportData';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

const SEVERITY_COLORS = {
  Info: 'blue',
  Notice: 'gold',
  Warning: 'orange',
  Critical: 'red',
};

const LOGS_EXPORT_COLS = [
  { title: 'Timestamp', dataIndex: 'timestamp', exportValue: (v) => v ? new Date(v).toLocaleString([], { hour12: true }) : '' },
  { title: 'Actor', dataIndex: 'actor' },
  { title: 'Action', dataIndex: 'action' },
  { title: 'Scope', dataIndex: 'scope' },
  { title: 'Source', dataIndex: 'source' },
  { title: 'Severity', dataIndex: 'severity' },
  { title: 'Details', dataIndex: 'details' },
];

export default function DeveloperAppLogs() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, info: 0, notice: 0, warnings: 0, critical: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  const loadLogs = async (searchValue = '') => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/app-logs', {
        params: searchValue ? { search: searchValue } : undefined,
      });
      setLogs(data.logs || []);
      setSummary(data.summary || { total: 0, info: 0, notice: 0, warnings: 0, critical: 0 });
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load app logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => logs, [logs]);

  const openCreateModal = () => {
    setEditingLog(null);
    form.resetFields();
    form.setFieldsValue({ severity: 'Info', source: 'Admin Console' });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingLog(record);
    form.setFieldsValue({
      actor: record.actor,
      action: record.action,
      scope: record.scope,
      severity: record.severity,
      source: record.source,
      details: record.details,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editingLog) {
        await apiClient.put(`/app-logs/${editingLog._id}`, values);
        message.success('App log updated successfully.');
      } else {
        await apiClient.post('/app-logs', values);
        message.success('App log created successfully.');
      }

      setModalOpen(false);
      form.resetFields();
      loadLogs(search);
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to save app log.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await apiClient.delete(`/app-logs/${record._id}`);
      message.success('App log deleted successfully.');
      loadLogs(search);
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to delete app log.');
    }
  };

  const exportLogs = (format) => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'excel') {
      exportToExcel(LOGS_EXPORT_COLS, filteredLogs, `app-logs-${stamp}`);
    } else {
      exportToCSV(LOGS_EXPORT_COLS, filteredLogs, `app-logs-${stamp}`);
    }
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (value) => new Date(value).toLocaleString(),
    },
    { title: 'Actor', dataIndex: 'actor', key: 'actor' },
    { title: 'Action', dataIndex: 'action', key: 'action' },
    { title: 'Scope', dataIndex: 'scope', key: 'scope' },
    { title: 'Source', dataIndex: 'source', key: 'source' },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (value) => <Tag color={SEVERITY_COLORS[value] || 'blue'}>{value}</Tag>,
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
            title="Delete this app log?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record)}
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
      title="App Logs"
      subtitle="Review, manage, and summarize audit activity across the admin console and Queue Dashboard"
      extra={
        <Space wrap>
          <Input
            placeholder="Filter by actor or action"
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={() => loadLogs(search)}
          />
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add Log Entry
          </Button>
          <Button size="small" icon={<SearchOutlined />} onClick={() => loadLogs(search)}>
            Search
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => exportLogs('csv')}>
            CSV
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => exportLogs('excel')} style={{ color: '#15803d', borderColor: '#15803d' }}>
            Excel
          </Button>
        </Space>
      }
    >
      <div className="admin-data-stat-grid" style={{ marginBottom: 20 }}>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Total Logs" value={summary.total} prefix={<AuditOutlined />} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Info / Notice" value={`${summary.info} / ${summary.notice}`} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Warnings / Critical" value={`${summary.warnings} / ${summary.critical}`} />
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card bordered={false} className="admin-data-table-card">
            <Table
              className="admin-data-table admin-data-table-applogs"
              columns={columns}
              dataSource={filteredLogs}
              rowKey="_id"
              loading={loading}
              pagination={{
                defaultPageSize: 15,
                showSizeChanger: true,
                pageSizeOptions: ['10', '15', '25', '50', '100'],
                showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} logs`,
              }}
              scroll={{ x: 'max-content' }}
              expandable={{
                expandedRowRender: (record) => record.details || 'No additional details.',
              }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingLog ? 'Edit App Log' : 'Create App Log'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="actor" label="Actor" rules={[{ required: true, message: 'Please enter an actor.' }]}>
            <Input placeholder="Admin Console" />
          </Form.Item>
          <Form.Item name="action" label="Action" rules={[{ required: true, message: 'Please enter an action.' }]}>
            <Input placeholder="Created queue officer EMB-QMS2026-001" />
          </Form.Item>
          <Form.Item name="scope" label="Scope" rules={[{ required: true, message: 'Please enter a scope.' }]}>
            <Input placeholder="Queue Assigned Officers" />
          </Form.Item>
          <Form.Item name="source" label="Source" rules={[{ required: true, message: 'Please enter a source.' }]}>
            <Input placeholder="Settings" />
          </Form.Item>
          <Form.Item name="severity" label="Severity" rules={[{ required: true, message: 'Please select severity.' }]}>
            <Select
              options={['Info', 'Notice', 'Warning', 'Critical'].map((value) => ({ value, label: value }))}
            />
          </Form.Item>
          <Form.Item name="details" label="Details">
            <Input.TextArea rows={4} placeholder="Add optional details" />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  );
}