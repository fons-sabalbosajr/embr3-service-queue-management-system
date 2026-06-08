import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
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
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

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
    { title: 'CLIENT CARD NO.', dataIndex: 'clientCardNo', key: 'clientCardNo', width: 170 },
    { title: 'Client Status', dataIndex: 'clientStatus', key: 'clientStatus', width: 150 },
    { title: 'Screening Officer', dataIndex: 'screeningOfficer', key: 'screeningOfficer', width: 170 },
    { title: 'ECC/CNC', dataIndex: 'eccCnc', key: 'eccCnc', width: 140 },
    { title: 'Transaction Status', dataIndex: 'transactionStatus', key: 'transactionStatus', width: 170 },
    {
      title: 'Company Name or Clearance/Permit App. No.',
      dataIndex: 'companyOrApplicationNo',
      key: 'companyOrApplicationNo',
      width: 240,
    },
    {
      title: 'Date of Receipt Uploaded',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 170,
      render: (value) => value || '-',
    },
    {
      title: 'Time of Receipt Uploaded',
      dataIndex: 'receiptTime',
      key: 'receiptTime',
      width: 170,
      render: (value) => value || '-',
    },
    {
      title: 'Client Status (CALL/CLIENT MISSING/Done/Assisted)',
      dataIndex: 'clientCallStatus',
      key: 'clientCallStatus',
      width: 250,
      render: (value) => (
        <Tag
          color={
            value === 'CALL'
              ? 'blue'
              : value === 'Done'
                ? 'green'
                : value === 'Assisted'
                  ? 'purple'
                  : 'red'
          }
        >
          {value}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this transaction?"
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
              pagination={{ pageSize: 7 }}
              scroll={{ x: 1800 }}
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