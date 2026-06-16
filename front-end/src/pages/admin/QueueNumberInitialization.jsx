import {
  DeleteOutlined,
  PlusOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Segmented,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

const { Text } = Typography;

const DEFAULT_TABS = ['ECC/CNC', 'PTO/DP', 'PCO', 'HAZ'];

async function getSwal() {
  const mod = await import('sweetalert2')
  return mod.default
}

async function qnoToast(options) {
  const Swal = await getSwal()
  const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  })
  return toast.fire(options)
}

function formatQueueNumber(value) {
  const raw = String(value || '').trim();
  const matches = raw.match(/(\d+)/g);
  return matches?.length ? matches[matches.length - 1].slice(-2).padStart(2, '0') : raw || '--';
}

function isPriority(clientStatus) {
  return ['priority', 'senior', 'pwd'].some((kw) =>
    String(clientStatus || '').toLowerCase().includes(kw)
  );
}

export default function QueueNumberInitialization() {
  const { message } = App.useApp();
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabOptions, setTabOptions] = useState(DEFAULT_TABS);
  const [activeTab, setActiveTab] = useState(DEFAULT_TABS[0]);
  const [clientType, setClientType] = useState('Regular');
  const [generating, setGenerating] = useState(false);
  const [actingId, setActingId] = useState(null);

  const loadNumbers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [{ data: numberData }, { data: displayData }] = await Promise.all([
        apiClient.get('/queue-officers/qno/numbers'),
        apiClient.get('/queue-display/public'),
      ]);
      setNumbers(numberData.numbers || []);

      const displayTabs = (displayData.config?.counterCards || [])
        .filter((item) => item.active)
        .sort((left, right) => left.order - right.order)
        .map((item) => item.transactionName)
        .filter(Boolean);

      const nextTabs = Array.from(new Set([...DEFAULT_TABS, ...displayTabs]));
      setTabOptions(nextTabs.length ? nextTabs : DEFAULT_TABS);
    } catch (error) {
      if (!silent) {
        message.error(error.response?.data?.message || 'Unable to load ready numbers.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadNumbers();
  }, [loadNumbers]);

  // Realtime refresh so thrown numbers and counts stay in sync with the portal.
  useEffect(() => {
    const id = setInterval(() => loadNumbers(true), 5000);
    return () => clearInterval(id);
  }, [loadNumbers]);

  useEffect(() => {
    if (!tabOptions.includes(activeTab)) {
      setActiveTab(tabOptions[0] || DEFAULT_TABS[0]);
    }
  }, [activeTab, tabOptions]);

  const handleGenerate = async () => {
    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: `Generate ${clientType.toLowerCase()} number for ${activeTab}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Generate',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1d4ed8',
    });
    if (!confirmed.isConfirmed) return;

    setGenerating(true);
    try {
      await apiClient.post('/queue-officers/qno/numbers', {
        inquiryType: activeTab,
        clientStatus: clientType,
      });
      await qnoToast({ icon: 'success', title: `Ready ${clientType.toLowerCase()} number generated for ${activeTab}.` });
      loadNumbers();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to generate number', text: error.response?.data?.message || 'Please try again.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleThrow = async (record) => {
    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: `Throw queue no. ${formatQueueNumber(record.clientCardNo)}?`,
      text: `This sends the number to the ${record.eccCnc} queue officer.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Throw',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1d4ed8',
    });
    if (!confirmed.isConfirmed) return;

    setActingId(record._id);
    try {
      await apiClient.patch(`/queue-officers/qno/numbers/${record._id}/throw`);
      await qnoToast({ icon: 'success', title: `Number ${formatQueueNumber(record.clientCardNo)} thrown to ${record.eccCnc}.` });
      loadNumbers();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to throw number', text: error.response?.data?.message || 'Please try again.' });
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (record) => {
    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: `Remove ready no. ${formatQueueNumber(record.clientCardNo)}?`,
      text: 'This permanently deletes the initialized queue number.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmed.isConfirmed) return;

    try {
      await apiClient.delete(`/queue-officers/qno/numbers/${record._id}`);
      await qnoToast({ icon: 'success', title: `Ready number ${formatQueueNumber(record.clientCardNo)} removed.` });
      loadNumbers();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to remove number', text: error.response?.data?.message || 'Please try again.' });
    }
  };

  const numbersForTab = useMemo(
    () => numbers.filter((item) => item.eccCnc === activeTab),
    [numbers, activeTab]
  );

  const tabStats = useMemo(() => {
    const ready = numbersForTab.filter((item) => !item.thrown).length;
    const thrown = numbersForTab.filter((item) => item.thrown).length;
    return { ready, thrown, total: numbersForTab.length };
  }, [numbersForTab]);

  const columns = [
    {
      title: 'Queue No.',
      dataIndex: 'clientCardNo',
      key: 'clientCardNo',
      width: 110,
      render: (value, record) => (
        <Tag
          className={record.thrown ? '' : 'qno-ready-number'}
          color={record.thrown ? (isPriority(record.clientStatus) ? 'blue' : 'green') : 'default'}
          style={{
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: 1,
            padding: '2px 12px',
            color: record.thrown ? undefined : '#64748b',
            background: record.thrown ? undefined : '#f1f5f9',
            borderColor: record.thrown ? undefined : '#cbd5e1',
          }}
        >
          {formatQueueNumber(value)}
        </Tag>
      ),
    },
    {
      title: 'Client Type',
      dataIndex: 'clientStatus',
      key: 'clientStatus',
      width: 120,
      render: (value) => (
        <Tag color={isPriority(value) ? 'blue' : 'green'}>{value || 'Regular'}</Tag>
      ),
    },
    {
      title: 'Generated',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (value) =>
        value ? <Text type="secondary" style={{ fontSize: 12 }}>{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text> : '—',
    },
    {
      title: 'State',
      key: 'state',
      width: 120,
      render: (_, record) =>
        record.thrown ? (
          <Tag icon={<CheckCircleOutlined />} color="processing">Thrown</Tag>
        ) : (
          <Tag icon={<ClockCircleOutlined />} color="default">Ready</Tag>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title={record.thrown ? 'Already thrown to the queue officer' : 'Throw this number to the queue officer'}>
            <Button
              type="primary"
              size="small"
              className="qno-throw-btn"
              icon={<SendOutlined className="anim-icon-throw" />}
              disabled={record.thrown}
              loading={actingId === record._id}
              onClick={() => handleThrow(record)}
            >
              Throw
            </Button>
          </Tooltip>
          <Tooltip title="Remove">
            <Button size="small" type="text" danger icon={<DeleteOutlined className="anim-icon-shake" />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <AdminShell
      title="Queue No. Initialization"
      subtitle="Generate ready queue numbers per inquiry type and throw them to the assigned Queue Officer."
      extra={
        <Space wrap align="center">
          <Text strong>Client Type</Text>
          <Segmented
            value={clientType}
            onChange={setClientType}
            options={['Regular', 'Priority']}
          />
          <Button type="primary" icon={<PlusOutlined />} loading={generating} onClick={handleGenerate}>
            Generate {activeTab} Number
          </Button>
        </Space>
      }
    >
      <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
        <Tag color="default">Ready {tabStats.ready}</Tag>
        <Tag color="processing">Thrown {tabStats.thrown}</Tag>
        <Tag color="blue">Total {tabStats.total}</Tag>
      </Space>

      <Card bordered={false} className="admin-data-table-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabOptions.map((tab) => ({
            key: tab,
            label: tab,
            children: (
              <Table
                className="admin-data-table"
                rowKey="_id"
                loading={loading}
                columns={columns}
                dataSource={numbersForTab}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                scroll={{ x: 'max-content' }}
                size="small"
                rowClassName={(record) => (record.thrown ? '' : 'qno-row-ready')}
              />
            ),
          }))}
        />
      </Card>
    </AdminShell>
  );
}
