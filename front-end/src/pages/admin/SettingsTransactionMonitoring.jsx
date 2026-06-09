import {
  BankOutlined,
  CalendarOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  HeartOutlined,
  PlusOutlined,
  SearchOutlined,
  SolutionOutlined,
  SyncOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
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
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import { exportToCSV, exportToExcel } from '../../utils/exportData';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

const { Text } = Typography;

const TXN_EXPORT_COLS = [
  { title: 'Queue No.', dataIndex: 'clientCardNo', exportValue: (v) => String(v || '').replace(/\D/g, '').slice(-2).padStart(2, '0') },
  { title: 'Client Name', dataIndex: 'clientName' },
  { title: 'Client Type', dataIndex: 'clientStatus' },
  { title: 'Counter / General Inquiry', dataIndex: 'eccCnc' },
  { title: 'Transaction / Inquiry', dataIndex: 'transactionStatus' },
  { title: 'Specific Inquiry', dataIndex: 'specificInquiry' },
  { title: 'Company / App No.', dataIndex: 'companyOrApplicationNo' },
  { title: 'Screening Officer', dataIndex: 'screeningOfficer' },
  { title: 'Queue Status', dataIndex: 'clientCallStatus' },
  { title: 'Receipt Date', dataIndex: 'receiptDate' },
  { title: 'Receipt Time', dataIndex: 'receiptTime' },
  { title: 'Created At', dataIndex: 'createdAt', exportValue: (v) => v ? new Date(v).toLocaleString([], { hour12: true }) : '' },
  { title: 'Updated At', dataIndex: 'updatedAt', exportValue: (v) => v ? new Date(v).toLocaleString([], { hour12: true }) : '' },
];
  const map = {
    CALL:              { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: <span className="status-dot-call" style={{ marginRight: 5 }} />, label: 'Now Serving' },
    'Waiting to Call': { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: <SyncOutlined style={{ fontSize: 10, marginRight: 4 }} />, label: 'Waiting' },
    Queued:            { color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', icon: <SyncOutlined style={{ fontSize: 10, marginRight: 4 }} />, label: 'Queued' },
    Done:              { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: '✓ ', label: 'Done' },
    Assisted:          { color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', icon: '❤ ', label: 'Assisted' },
    'CLIENT MISSING':  { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', icon: <span className="status-dot-missing" style={{ marginRight: 5 }} />, label: 'Missing' },
    'On Hold':         { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '⏸ ', label: 'On Hold' },
    Skipped:           { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '⏭ ', label: 'Skipped' },
  };
  const s = map[value] || { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: null, label: value };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 999,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 11, fontWeight: 600,
    }}>
      {s.icon}{s.label}
    </span>
  );
}

export default function SettingsTransactionMonitoring() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [search, setSearch] = useState('');

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/transaction-monitoring');
      setTransactions(data.transactions || []);
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to load transactions.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const openCreateModal = () => {
    setEditingTransaction(null);
    form.resetFields();
    form.setFieldsValue({ clientCallStatus: 'CALL' });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingTransaction(record);
    form.setFieldsValue({
      ...record,
      receiptDate: record.receiptDate ? dayjs(record.receiptDate) : null,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        receiptDate: values.receiptDate ? values.receiptDate.format('YYYY-MM-DD') : '',
      };

      if (editingTransaction) {
        await apiClient.put(`/transaction-monitoring/${editingTransaction._id}`, payload);
        message.success('Transaction updated successfully.');
      } else {
        await apiClient.post('/transaction-monitoring', payload);
        message.success('Transaction created successfully.');
      }

      setModalOpen(false);
      form.resetFields();
      loadTransactions();
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to save transaction.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await apiClient.delete(`/transaction-monitoring/${record._id}`);
      message.success('Transaction deleted successfully.');
      loadTransactions();
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Unable to delete transaction.'
      );
    }
  };

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return transactions;
    }

    return transactions.filter((item) =>
      [
        item.clientCardNo,
        item.clientStatus,
        item.screeningOfficer,
        item.eccCnc,
        item.transactionStatus,
        item.companyOrApplicationNo,
        item.clientCallStatus,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [search, transactions]);

  const stats = useMemo(
    () => ({
      total: transactions.length,
      call: transactions.filter((item) => item.clientCallStatus === 'CALL').length,
      done: transactions.filter((item) => item.clientCallStatus === 'Done').length,
    }),
    [transactions]
  );

  const columns = [
    {
      title: <Tooltip title="Queue Number"><UserOutlined /></Tooltip>,
      dataIndex: 'clientCardNo',
      key: 'clientCardNo',
      width: 64,
      render: (v, r) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: r.clientStatus?.toLowerCase().includes('priority') ? '#1d4ed8' : '#15803d', lineHeight: 1 }}>{String(v || '--').replace(/\D/g, '').slice(-2).padStart(2, '0')}</div>
          {r.clientStatus?.toLowerCase().includes('priority')
            ? <HeartOutlined style={{ color: '#1d4ed8', fontSize: 9 }} />
            : <UserOutlined style={{ color: '#15803d', fontSize: 9 }} />}
        </div>
      ),
    },
    {
      title: <Space size={4}><UserOutlined /><span>Client</span></Space>,
      key: 'client',
      width: 140,
      render: (_, r) => (
        <div>
          <Text style={{ fontWeight: 600, fontSize: 12 }}>{r.clientName || '—'}</Text>
          <br />
          <Tag style={{ marginTop: 2, fontSize: 10 }} color={r.clientStatus?.toLowerCase().includes('priority') ? 'blue' : 'green'}>
            {r.clientStatus || '—'}
          </Tag>
        </div>
      ),
    },
    {
      title: <Space size={4}><SolutionOutlined /><span>Counter / Inquiry</span></Space>,
      key: 'inquiry',
      width: 155,
      render: (_, r) => (
        <div>
          <Tag color="cyan" style={{ fontSize: 11, marginBottom: 2 }}>{r.eccCnc || '—'}</Tag>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{r.transactionStatus || '—'}</Text>
          {r.specificInquiry ? <Tag style={{ fontSize: 10, marginTop: 2 }} color="geekblue">{r.specificInquiry}</Tag> : null}
        </div>
      ),
    },
    {
      title: <Space size={4}><TeamOutlined /><span>Officer</span></Space>,
      dataIndex: 'screeningOfficer',
      key: 'screeningOfficer',
      width: 120,
      render: (v) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
            {String(v || '?')[0]?.toUpperCase()}
          </div>
          <Text style={{ fontSize: 11 }}>{v || '—'}</Text>
        </div>
      ),
    },
    {
      title: <Space size={4}><BankOutlined /><span>Company / App No.</span></Space>,
      dataIndex: 'companyOrApplicationNo',
      key: 'companyOrApplicationNo',
      width: 155,
      render: (v) => <Text style={{ fontSize: 11 }} type="secondary">{v || '—'}</Text>,
    },
    {
      title: <Space size={4}><CalendarOutlined /><span>Date &amp; Time</span></Space>,
      key: 'datetime',
      width: 120,
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 11 }}>{r.receiptDate || '—'}</Text>
          {r.receiptTime ? (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 10 }}>
                {/* Normalise stored 24-h or 12-h string to 12-h AM/PM */}
                {(() => {
                  const raw = String(r.receiptTime || '');
                  if (/AM|PM/i.test(raw)) return raw;
                  const [h, m] = raw.split(':').map(Number);
                  if (isNaN(h) || isNaN(m)) return raw;
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  const h12 = h % 12 || 12;
                  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
                })()}
              </Text>
            </>
          ) : null}
        </div>
      ),
    },
    {
      title: <Space size={4}><FileTextOutlined /><span>Status</span></Space>,
      dataIndex: 'clientCallStatus',
      key: 'clientCallStatus',
      width: 130,
      render: (v) => <StatusBadge value={v} />,
    },
    {
      title: '',
      key: 'actions',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete this transaction?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record)}
          >
            <Tooltip title="Delete">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminShell
      title="Transaction Monitoring Config"
      subtitle="Manage public dashboard transaction entries and track client progress through the queue flow."
      extra={
        <Space wrap>
          <Input
            placeholder="Search transactions"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 260 }}
          />
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => exportToCSV(TXN_EXPORT_COLS, filteredTransactions, `transactions-${new Date().toISOString().slice(0,10)}`)}
          >
            CSV
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => exportToExcel(TXN_EXPORT_COLS, filteredTransactions, `transactions-${new Date().toISOString().slice(0,10)}`)}
            style={{ color: '#15803d', borderColor: '#15803d' }}
          >
            Excel
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add Transaction
          </Button>
        </Space>
      }
    >
      <div className="admin-data-stat-grid" style={{ marginBottom: 20 }}>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Total Transactions" value={stats.total} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Awaiting Call" value={stats.call} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Completed" value={stats.done} />
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card bordered={false} className="admin-data-table-card">
            <Table
              className="admin-data-table"
              rowKey="_id"
              columns={columns}
              dataSource={filteredTransactions}
              loading={loading}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
              }}
              scroll={{ x: 950 }}
              size="small"
              style={{ background: '#ffffff' }}
              rowClassName={(record) => {
                const s = record.clientCallStatus;
                if (s === 'CALL') return 'txn-row-call';
                if (s === 'CLIENT MISSING') return 'txn-row-missing';
                if (s === 'Done') return 'txn-row-done';
                if (s === 'Assisted') return 'txn-row-assisted';
                return '';
              }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingTransaction ? 'Edit Transaction' : 'Create Transaction'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        width={760}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="clientCardNo" label="CLIENT CARD NO." rules={[{ required: true, message: 'Please enter client card number.' }]}>
                <Input placeholder="EMB-QMS2026-TRX-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientStatus" label="Client Status" rules={[{ required: true, message: 'Please enter client status.' }]}>
                <Input placeholder="Waiting for screening" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="screeningOfficer" label="Screening Officer" rules={[{ required: true, message: 'Please enter screening officer.' }]}>
                <Input placeholder="Juan Dela Cruz" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="eccCnc" label="ECC/CNC" rules={[{ required: true, message: 'Please enter ECC/CNC value.' }]}>
                <Input placeholder="ECC" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="transactionStatus" label="Transaction Status" rules={[{ required: true, message: 'Please enter transaction status.' }]}>
            <Input placeholder="Screening in progress" />
          </Form.Item>
          <Form.Item name="companyOrApplicationNo" label="Company Name or Clearance/Permit App. No.">
            <Input placeholder="ACME Corp. / APP-2026-001" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="receiptDate" label="Date of Receipt Uploaded">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receiptTime" label="Time of Receipt Uploaded">
                <Input placeholder="09:45 AM" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="clientCallStatus" label="Client Status (CALL/CLIENT MISSING/Done/Assisted)" rules={[{ required: true, message: 'Please select client call status.' }]}>
            <Select
              options={[
                { value: 'CALL', label: 'CALL' },
                { value: 'CLIENT MISSING', label: 'CLIENT MISSING' },
                { value: 'Done', label: 'Done' },
                { value: 'Assisted', label: 'Assisted' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  );
}