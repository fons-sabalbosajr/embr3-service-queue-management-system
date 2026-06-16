import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
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

const LOG_EXPORT_COLS = [
  { title: 'Timestamp', dataIndex: 'timestamp', exportValue: (value) => (value ? new Date(value).toLocaleString([], { hour12: true }) : '') },
  { title: 'Actor', dataIndex: 'actor' },
  { title: 'Action', dataIndex: 'action' },
  { title: 'Scope', dataIndex: 'scope' },
  { title: 'Severity', dataIndex: 'severity' },
  { title: 'Source', dataIndex: 'source' },
  { title: 'Details', dataIndex: 'details' },
]

async function getSwal() {
  const mod = await import('sweetalert2')
  return mod.default
}

export default function SettingsActivityLogMaintenance() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [backingUp, setBackingUp] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [latestBackup, setLatestBackup] = useState(null)
  const [liveLogCount, setLiveLogCount] = useState(0)
  const [archives, setArchives] = useState([])
  const [reportExported, setReportExported] = useState(false)
  const [viewingArchive, setViewingArchive] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const [{ data: statusData }, { data: archiveData }] = await Promise.all([
        apiClient.get('/app-logs/maintenance/status'),
        apiClient.get('/app-logs/maintenance/archives'),
      ])
      setLatestBackup(statusData.latestBackup || null)
      setLiveLogCount(statusData.liveLogCount || 0)
      setArchives(archiveData.archives || [])
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load activity log maintenance status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleBackup = async () => {
    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: 'Create secured activity-log backup?',
      text: 'This will archive the current Recent Activity log data for export and safekeeping.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Create backup',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1d4ed8',
    })
    if (!confirmed.isConfirmed) return

    setBackingUp(true)
    try {
      const { data } = await apiClient.post('/app-logs/maintenance/backup')
      setLatestBackup(data.backup || null)
      setReportExported(false)
      message.success('Activity logs backed up successfully.')
      await loadStatus()
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to back up activity logs.')
    } finally {
      setBackingUp(false)
    }
  }

  const handleExport = async (archive = latestBackup) => {
    if (!archive?._id) {
      message.warning('Create a backup first before exporting the activity log report.')
      return
    }

    try {
      const { data } = await apiClient.get(`/app-logs/maintenance/report/${archive._id}`)
      exportToExcel(LOG_EXPORT_COLS, data.reportRows || [], data.reportFilename || `activity-logs-${archive.reportDate || 'archive'}`)
      if (archive._id === latestBackup?._id) setReportExported(true)
      message.success('Activity log Excel report downloaded successfully.')
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to export activity log report.')
    }
  }

  const handleClear = async () => {
    if (!latestBackup?._id) {
      message.warning('Create a backup first before clearing activity logs.')
      return
    }
    if (!reportExported) {
      message.warning('Export the activity log report first before clearing Recent Activity logs.')
      return
    }

    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: 'Clear Recent Activity logs?',
      text: 'This removes the live Recent Activity data after the secured backup has been created.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Clear logs',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    })
    if (!confirmed.isConfirmed) return

    setClearing(true)
    try {
      await apiClient.post('/app-logs/maintenance/clear', { backupId: latestBackup._id })
      message.success('Recent Activity logs cleared successfully.')
      setReportExported(false)
      await loadStatus()
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to clear activity logs.')
    } finally {
      setClearing(false)
    }
  }

  const handleViewArchive = async (record) => {
    setDetailLoading(true)
    try {
      const { data } = await apiClient.get(`/app-logs/maintenance/archive/${record._id}`)
      setViewingArchive(data.archive || null)
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load archive detail.')
    } finally {
      setDetailLoading(false)
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
    { title: 'Report Date', dataIndex: 'reportDate', key: 'reportDate' },
    { title: 'Prepared By', dataIndex: 'createdBy', key: 'createdBy' },
    {
      title: 'Summary',
      key: 'summary',
      render: (_, record) => (
        <Space wrap>
          <Tag color="blue">Total {record.archiveSummary?.totalTransactions || 0}</Tag>
          <Tag color="green">Info/Notice {record.archiveSummary?.completedTransactions || 0}</Tag>
          <Tag color="gold">Warnings/Critical {record.archiveSummary?.activeTransactions || 0}</Tag>
        </Space>
      ),
    },
    {
      title: 'Clear Status',
      key: 'clearStatus',
      render: (_, record) =>
        record.clearedAt ? (
          <Space direction="vertical" size={0}>
            <Tag color="green">Cleared</Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {new Date(record.clearedAt).toLocaleString()} · {record.clearedCount || 0} removed
            </Text>
          </Space>
        ) : (
          <Tag color="gold">Backed up only</Tag>
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
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport(record)}>
            Download
          </Button>
        </Space>
      ),
    },
  ]

  const clearLocked = !latestBackup?._id || !reportExported || Boolean(latestBackup?.clearedAt)

  return (
    <AdminShell
      title="Activity Log Maintenance"
      subtitle="Back up, export, review, and clear the Recent Activity logs from the admin side."
      extra={
        <Space wrap>
          <Button size="small" icon={<ReloadOutlined />} onClick={loadStatus} loading={loading}>
            Refresh Status
          </Button>
          <Button type="primary" size="small" icon={<SafetyCertificateOutlined />} onClick={handleBackup} loading={backingUp || clearing}>
            Back Up Activity Logs
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport()} disabled={!latestBackup?._id}>
            Export Excel Report
          </Button>
          <Button danger size="small" icon={<DeleteOutlined />} onClick={handleClear} disabled={clearLocked} loading={clearing}>
            Clear Recent Activity
          </Button>
        </Space>
      }
    >
      {(loading || backingUp || clearing) && !archives.length ? (
        <LoadingScreen compact title="Preparing activity logs" description="Loading backup status, archive history, and clear workflow." />
      ) : (
        <>
          <Card bordered={false} className="admin-data-table-card" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Text strong>Required workflow</Text>
              <Space wrap>
                <Tag color="blue">1. Back up activity logs</Tag>
                <Tag color="purple">2. Export Excel report</Tag>
                <Tag color={clearLocked ? 'default' : 'red'}>3. Clear Recent Activity</Tag>
              </Space>
              <Text type="secondary">
                Live Recent Activity count: <strong>{liveLogCount}</strong>
                {reportExported ? ' · Excel report exported for the latest backup.' : ' · Export the Excel report before clearing is enabled.'}
              </Text>
            </Space>
          </Card>

          <Card bordered={false} className="admin-data-table-card">
            <Table
              className="admin-data-table"
              rowKey="_id"
              columns={columns}
              dataSource={archives}
              pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: ['8', '15', '30'] }}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: 'No activity log backups found yet.' }}
            />
          </Card>
        </>
      )}

      <Modal
        title={viewingArchive ? `Activity Log Archive: ${viewingArchive.label}` : 'Activity Log Archive'}
        open={!!viewingArchive || detailLoading}
        onCancel={() => !detailLoading && setViewingArchive(null)}
        footer={
          <Space>
            {viewingArchive ? (
              <Button icon={<DownloadOutlined />} onClick={() => handleExport(viewingArchive)}>
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
          <LoadingScreen compact title="Loading archive detail" description="Preparing backed-up Recent Activity records for viewing." />
        ) : (
          <Table
            className="admin-data-table"
            rowKey={(record) => record._id || `${record.actor}-${record.timestamp}`}
            columns={LOG_EXPORT_COLS.map((col) => ({
              title: col.title,
              dataIndex: col.dataIndex,
              key: col.dataIndex || col.title,
              render: (value) => col.dataIndex === 'timestamp' && value ? new Date(value).toLocaleString([], { hour12: true }) : value || '—',
            }))}
            dataSource={detailRows}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'No backed-up activity logs found in this archive.' }}
          />
        )}
      </Modal>
    </AdminShell>
  )
}