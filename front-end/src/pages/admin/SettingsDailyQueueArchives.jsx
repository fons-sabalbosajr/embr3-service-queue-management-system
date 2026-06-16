import {
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import apiClient from '../../api/client'
import LoadingScreen from '../../components/LoadingScreen'
import { exportToExcel } from '../../utils/exportData'
import AdminShell from './AdminShell'

const { Text } = Typography

const ARCHIVE_EXPORT_COLS = [
  { title: 'Queue No.', dataIndex: 'clientCardNo' },
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
  {
    title: 'Created At',
    dataIndex: 'createdAt',
    exportValue: (value) => (value ? new Date(value).toLocaleString([], { hour12: true }) : ''),
  },
  {
    title: 'Updated At',
    dataIndex: 'updatedAt',
    exportValue: (value) => (value ? new Date(value).toLocaleString([], { hour12: true }) : ''),
  },
]

export default function SettingsDailyQueueArchives() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [archives, setArchives] = useState([])
  const [viewingArchive, setViewingArchive] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadArchives = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/transaction-monitoring/daily-reset/archives')
      setArchives(data.archives || [])
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load daily queue archives.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArchives()
  }, [])

  const handleViewArchive = async (record) => {
    setDetailLoading(true)
    try {
      const { data } = await apiClient.get(`/transaction-monitoring/daily-reset/archive/${record._id}`)
      setViewingArchive(data.archive || null)
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load archive detail.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleExportArchive = async (record) => {
    try {
      const { data } = await apiClient.get(`/transaction-monitoring/daily-reset/report/${record._id}`)
      exportToExcel(
        ARCHIVE_EXPORT_COLS,
        data.reportRows || [],
        data.reportFilename || `daily-queue-report-${record.reportDate || 'archive'}`
      )
      message.success('Archive Excel report downloaded successfully.')
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to export archive report.')
    }
  }

  const detailRows = useMemo(() => viewingArchive?.archivedTransactions || [], [viewingArchive])

  const columns = [
    {
      title: 'Archive Label',
      dataIndex: 'label',
      key: 'label',
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: 'Report Date',
      dataIndex: 'reportDate',
      key: 'reportDate',
    },
    {
      title: 'Prepared By',
      dataIndex: 'createdBy',
      key: 'createdBy',
    },
    {
      title: 'Summary',
      key: 'summary',
      render: (_, record) => (
        <Space wrap>
          <Tag color="blue">Total {record.archiveSummary?.totalTransactions || 0}</Tag>
          <Tag color="green">Completed {record.archiveSummary?.completedTransactions || 0}</Tag>
          <Tag color="gold">Active {record.archiveSummary?.activeTransactions || 0}</Tag>
        </Space>
      ),
    },
    {
      title: 'Reset Status',
      key: 'resetStatus',
      render: (_, record) =>
        record.resetExecutedAt ? (
          <Space direction="vertical" size={0}>
            <Tag color="green">Executed</Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {new Date(record.resetExecutedAt).toLocaleString()} · {record.resetDeletedCount || 0} deleted
            </Text>
          </Space>
        ) : (
          <Tag color="gold">Prepared only</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewArchive(record)}>
            View
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExportArchive(record)}>
            Download
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <AdminShell
      title="Daily Queue Archives"
      subtitle="Review, inspect, and download secured daily reset archives stored in BackupSnapshot."
      extra={
        <Space wrap>
          <Button size="small" icon={<ReloadOutlined />} onClick={loadArchives} loading={loading}>
            Refresh Archives
          </Button>
        </Space>
      }
    >
      {loading && !archives.length ? (
        <LoadingScreen compact title="Loading daily archives" description="Fetching secured daily reset snapshots and report metadata." />
      ) : (
        <Card bordered={false} className="admin-data-table-card">
          <Table
            className="admin-data-table"
            rowKey="_id"
            columns={columns}
            dataSource={archives}
            pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: ['8', '15', '30'] }}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'No daily queue archives found yet.' }}
          />
        </Card>
      )}

      <Modal
        title={viewingArchive ? `Archive Detail: ${viewingArchive.label}` : 'Archive Detail'}
        open={!!viewingArchive || detailLoading}
        onCancel={() => !detailLoading && setViewingArchive(null)}
        footer={
          <Space>
            {viewingArchive ? (
              <Button icon={<DownloadOutlined />} onClick={() => handleExportArchive(viewingArchive)}>
                Download Excel
              </Button>
            ) : null}
            <Button onClick={() => setViewingArchive(null)} disabled={detailLoading}>
              Close
            </Button>
          </Space>
        }
        width={1100}
        destroyOnClose
      >
        {detailLoading || !viewingArchive ? (
          <LoadingScreen compact title="Loading archive detail" description="Preparing archived queue records for viewing." />
        ) : (
          <Table
            className="admin-data-table"
            rowKey={(record) => record._id || `${record.clientCardNo}-${record.createdAt}`}
            columns={ARCHIVE_EXPORT_COLS.filter((col) => !['Created At', 'Updated At'].includes(col.title)).map((col) => ({
              title: col.title,
              dataIndex: col.dataIndex,
              key: col.dataIndex || col.title,
            }))}
            dataSource={detailRows}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'No archived transactions available in this backup.' }}
          />
        )}
      </Modal>
    </AdminShell>
  )
}