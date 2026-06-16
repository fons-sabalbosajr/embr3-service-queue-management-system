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
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import LoadingScreen from '../../components/LoadingScreen';
import { exportToCSV, exportToExcel } from '../../utils/exportData';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

const TransactionMonitoringForm = lazy(() => import('./transaction-monitoring/TransactionMonitoringForm'))

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
  { title: 'Transaction Date Completed', dataIndex: 'transactionDateCompleted' },
  { title: 'Created At', dataIndex: 'createdAt', exportValue: (v) => v ? new Date(v).toLocaleString([], { hour12: true }) : '' },
  { title: 'Updated At', dataIndex: 'updatedAt', exportValue: (v) => v ? new Date(v).toLocaleString([], { hour12: true }) : '' },
];

function normalizePermitTab(value) {
  const raw = String(value || '').trim();
  const normalized = raw.toUpperCase();

  if (normalized.includes('ECC') || normalized.includes('CNC')) return 'ECC/CNC';
  if (normalized === 'PTO/DP' || (normalized.includes('PTO') && normalized.includes('DP'))) return 'PTO/DP';
  if (normalized === 'PCO' || normalized.includes('POLLUTION CONTROL OFFICER')) return 'PCO';
  if (normalized.includes('HWG') || normalized.includes('HAZ')) return 'HAZ';
  return raw || 'Other Permits';
}

function normalizeStatus(value) {
  if (value === 'Done' || value === 'Assisted' || value === 'Done/Assisted') {
    return 'Done/Assisted';
  }
  return value;
}

function normalizeLegacyTime(value) {
  const raw = String(value || '');
  if (!raw) return '';
  if (/AM|PM/i.test(raw)) return raw;
  const [h, m] = raw.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return raw;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function buildTransactionDateCompleted(record) {
  const normalizedStatus = normalizeStatus(record.clientCallStatus);
  if (record.receiptDate) {
    const time = normalizeLegacyTime(record.receiptTime);
    return time ? `${record.receiptDate} ${time}` : record.receiptDate;
  }

  // Older records may not have completion receipt fields; fall back to updatedAt
  // only for completed terminal states so the new UI still shows a sensible date.
  if (normalizedStatus === 'Done/Assisted' && record.updatedAt) {
    return new Date(record.updatedAt).toLocaleString([], { hour12: true });
  }

  return '—';
}

function resolveTransactionDate(record) {
  if (record.receiptDate) {
    const parsed = dayjs(record.receiptDate, ['YYYY-MM-DD', 'MM/DD/YYYY', 'M/D/YYYY'], true)
    if (parsed.isValid()) return parsed
  }
  if (record.updatedAt) {
    const parsed = dayjs(record.updatedAt)
    if (parsed.isValid()) return parsed
  }
  if (record.createdAt) {
    const parsed = dayjs(record.createdAt)
    if (parsed.isValid()) return parsed
  }
  return null
}

function StatusBadge({ value }) {
  const map = {
    CALL:              { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: <span className="status-dot-call" style={{ marginRight: 5 }} />, label: 'Now Serving' },
    Initialized:       { color: '#475569', bg: '#f8fafc', border: '#cbd5e1', icon: <SyncOutlined spin style={{ fontSize: 11, marginRight: 4 }} />, label: 'Initialized' },
    'Waiting to Call': { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: <SyncOutlined style={{ fontSize: 10, marginRight: 4 }} />, label: 'Waiting' },
    Queued:            { color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', icon: <SyncOutlined style={{ fontSize: 10, marginRight: 4 }} />, label: 'Queued' },
    'Done/Assisted':   { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: '✓ ', label: 'Done/Assisted' },
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
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);

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

  const preparedTransactions = useMemo(() => transactions.map((item) => ({
    ...item,
    clientCallStatus: normalizeStatus(item.clientCallStatus),
    permitTab: normalizePermitTab(item.eccCnc),
    transactionDateCompleted: buildTransactionDateCompleted(item),
  })), [transactions]);

  const permitTabs = useMemo(() => {
    const tabs = Array.from(new Set(preparedTransactions.map((item) => item.permitTab).filter(Boolean)));
    return ['all', ...tabs];
  }, [preparedTransactions]);

  useEffect(() => {
    if (!permitTabs.includes(activeTab)) {
      setActiveTab('all');
    }
  }, [activeTab, permitTabs]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return preparedTransactions.filter((item) => {
      const matchesTab = activeTab === 'all' || item.permitTab === activeTab;
      const matchesStatus = statusFilter === 'all' || item.clientCallStatus === statusFilter;
      const transactionDate = resolveTransactionDate(item);
      const matchesDate = !dateRange || !dateRange[0] || !dateRange[1]
        ? true
        : (transactionDate && transactionDate.isAfter(dateRange[0].startOf('day').subtract(1, 'millisecond')) && transactionDate.isBefore(dateRange[1].endOf('day').add(1, 'millisecond')));
      if (!matchesTab) return false;
      if (!matchesStatus) return false;
      if (!matchesDate) return false;
      if (!query) return true;

      return [
        item.clientCardNo,
        item.clientStatus,
        item.screeningOfficer,
        item.eccCnc,
        item.transactionStatus,
        item.companyOrApplicationNo,
        item.clientCallStatus,
        item.transactionDateCompleted,
        item.permitTab,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeTab, dateRange, preparedTransactions, search, statusFilter]);

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
      title: <Space size={4}><CalendarOutlined /><span>Transaction Date Completed</span></Space>,
      key: 'datetime',
      width: 180,
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 11 }}>{r.transactionDateCompleted || '—'}</Text>
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
      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card bordered={false} className="admin-data-table-card">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={permitTabs.map((tab) => ({
                key: tab,
                label: tab === 'all' ? 'All Transactions' : tab,
              }))}
              style={{ marginBottom: 12 }}
            />
            <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ minWidth: 180 }}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'Initialized', label: 'Initialized' },
                  { value: 'Queued', label: 'Queued' },
                  { value: 'Waiting to Call', label: 'Waiting to Call' },
                  { value: 'CALL', label: 'CALL' },
                  { value: 'On Hold', label: 'On Hold' },
                  { value: 'Skipped', label: 'Skipped' },
                  { value: 'CLIENT MISSING', label: 'Client Missing' },
                  { value: 'Done/Assisted', label: 'Done/Assisted' },
                ]}
              />
              <DatePicker.RangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder={['Start date', 'End date']}
              />
              <Button onClick={() => { setStatusFilter('all'); setDateRange(null); setSearch(''); }}>
                Reset Filters
              </Button>
            </Space>
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
                if (s === 'Initialized') return 'txn-row-initialized';
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
        onCancel={() => !saving && setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        closable={!saving}
        maskClosable={!saving}
        width={760}
      >
        {saving ? (
          <LoadingScreen compact title="Saving transaction" description="Validating permit fields and updating transaction monitoring." />
        ) : (
        <Suspense fallback={<LoadingScreen compact title="Loading transaction form" description="Preparing the transaction editor fields." />}>
          <TransactionMonitoringForm form={form} onFinish={handleSubmit} />
        </Suspense>
        )}
      </Modal>
    </AdminShell>
  );
}