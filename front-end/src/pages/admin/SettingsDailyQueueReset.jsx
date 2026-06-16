import {
  CheckCircleOutlined,
  DownloadOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Col,
  Row,
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
import './AdminDataTables.css'

const { Text } = Typography

const RESET_EXPORT_COLS = [
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

async function getSwal() {
  const mod = await import('sweetalert2')
  return mod.default
}

export default function SettingsDailyQueueReset() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [latestBackup, setLatestBackup] = useState(null)
  const [liveQueueCount, setLiveQueueCount] = useState(0)
  const [reportRows, setReportRows] = useState([])
  const [reportFilename, setReportFilename] = useState('daily-queue-report')
  const [reportExported, setReportExported] = useState(false)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/transaction-monitoring/daily-reset/status')
      setLatestBackup(data.latestBackup || null)
      setLiveQueueCount(data.liveQueueCount || 0)
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load daily reset status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const summaryRows = useMemo(() => {
    if (!latestBackup) return []

    return [
      {
        key: latestBackup._id,
        label: latestBackup.label,
        reportDate: latestBackup.reportDate || '—',
        createdBy: latestBackup.createdBy || 'System',
        totalTransactions: latestBackup.archiveSummary?.totalTransactions || 0,
        completedTransactions: latestBackup.archiveSummary?.completedTransactions || 0,
        activeTransactions: latestBackup.archiveSummary?.activeTransactions || 0,
        createdAt: latestBackup.createdAt,
        resetExecutedAt: latestBackup.resetExecutedAt,
        resetDeletedCount: latestBackup.resetDeletedCount || 0,
      },
    ]
  }, [latestBackup])

  const handlePrepareArchive = async () => {
    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: 'Prepare secured daily backup?',
      text: 'This will archive the current queue data and generate the report payload for Excel export.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Prepare backup',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1d4ed8',
    })

    if (!confirmed.isConfirmed) return

    setPreparing(true)
    try {
      const { data } = await apiClient.post('/transaction-monitoring/daily-reset/prepare')
      setLatestBackup(data.backup || null)
      setReportRows(data.reportRows || [])
      setReportFilename(data.reportFilename || 'daily-queue-report')
      setReportExported(false)
      message.success('Daily queue backup prepared successfully.')
      setLiveQueueCount(data.backup?.archiveSummary?.totalTransactions || liveQueueCount)
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.existingBackup) {
        const overridePrompt = await Swal.fire({
          title: 'Archive already exists for today',
          text: error.response?.data?.message || 'A same-day archive already exists. Do you want to prepare another secured archive anyway?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Prepare override archive',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#ea580c',
        })

        if (overridePrompt.isConfirmed) {
          try {
            const overrideRes = await apiClient.post('/transaction-monitoring/daily-reset/prepare', { override: true })
            const overrideData = overrideRes.data
            setLatestBackup(overrideData.backup || null)
            setReportRows(overrideData.reportRows || [])
            setReportFilename(overrideData.reportFilename || 'daily-queue-report')
            setReportExported(false)
            message.success('Override daily queue backup prepared successfully.')
            setLiveQueueCount(overrideData.backup?.archiveSummary?.totalTransactions || liveQueueCount)
          } catch (overrideError) {
            message.error(overrideError.response?.data?.message || 'Unable to prepare override daily queue backup.')
          }
        }
      } else {
        message.error(error.response?.data?.message || 'Unable to prepare daily queue backup.')
      }
    } finally {
      setPreparing(false)
    }
  }

  const handleExportReport = async () => {
    if (!latestBackup?._id) {
      message.warning('Prepare a backup first before exporting the Excel report.')
      return
    }

    try {
      let rows = reportRows
      let filename = reportFilename

      if (!rows.length) {
        const { data } = await apiClient.get(`/transaction-monitoring/daily-reset/report/${latestBackup._id}`)
        rows = data.reportRows || []
        filename = data.reportFilename || filename
        setReportRows(rows)
        setReportFilename(filename)
      }

      exportToExcel(RESET_EXPORT_COLS, rows, filename)
      setReportExported(true)
      message.success('Daily queue Excel report exported successfully.')
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to export the daily queue report.')
    }
  }

  const handleResetQueue = async () => {
    if (!latestBackup?._id) {
      message.warning('Prepare a backup first before resetting the queue.')
      return
    }

    if (!reportExported) {
      message.warning('Export the Excel report first before resetting the queue for the next day.')
      return
    }

    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: 'Reset live queue for the next day?',
      text: 'This will clear the live Transaction Monitoring records only after the secured archive has been created.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reset queue',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    })

    if (!confirmed.isConfirmed) return

    setResetting(true)
    try {
      await apiClient.post('/transaction-monitoring/daily-reset/execute', {
        backupId: latestBackup._id,
      })
      message.success('Queue reset completed for the next day.')
      setReportExported(false)
      setReportRows([])
      setReportFilename('daily-queue-report')
      await loadStatus()
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to reset queue for the next day.')
    } finally {
      setResetting(false)
    }
  }

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
          <Tag color="blue">Total {record.totalTransactions}</Tag>
          <Tag color="green">Completed {record.completedTransactions}</Tag>
          <Tag color="gold">Active {record.activeTransactions}</Tag>
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
              {new Date(record.resetExecutedAt).toLocaleString()} · {record.resetDeletedCount} deleted
            </Text>
          </Space>
        ) : (
          <Tag color="gold">Prepared only</Tag>
        ),
    },
  ]

  const resetLocked = !latestBackup?._id || !reportExported || Boolean(latestBackup?.resetExecutedAt)

  return (
    <AdminShell
      title="Daily Queue Reset"
      subtitle="Secure the previous day's queue data, export the Excel report, then reset the live queue for the next day."
      extra={
        <Space wrap>
          <Button size="small" icon={<ReloadOutlined />} onClick={loadStatus} loading={loading}>
            Refresh Status
          </Button>
          <Button type="primary" size="small" icon={<SafetyCertificateOutlined />} onClick={handlePrepareArchive} loading={preparing || resetting}>
            Prepare Secured Backup
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={handleExportReport} disabled={!latestBackup?._id} loading={preparing}>
            Export Excel Report
          </Button>
          <Button danger size="small" icon={<LockOutlined />} onClick={handleResetQueue} disabled={resetLocked} loading={resetting}>
            Reset for Next Day
          </Button>
        </Space>
      }
    >
      {(loading || preparing || resetting) && !summaryRows.length ? (
        <LoadingScreen compact title="Preparing daily reset" description="Loading the archive status, report workflow, and live queue counts." />
      ) : (
        <>
          <Card bordered={false} className="admin-data-table-card" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Text strong>Required workflow</Text>
              <Space wrap>
                <Tag color="blue">1. Prepare secured backup</Tag>
                <Tag color="purple">2. Export Excel report</Tag>
                <Tag color={resetLocked ? 'default' : 'red'}>3. Reset next-day queue</Tag>
              </Space>
              <Text type="secondary">
                Live queue count: <strong>{liveQueueCount}</strong>
                {reportExported ? ' · Excel report exported for the prepared backup.' : ' · Export the Excel report before reset is enabled.'}
              </Text>
            </Space>
          </Card>

          <Card bordered={false} className="admin-data-table-card">
            <Table
              className="admin-data-table"
              rowKey="key"
              columns={columns}
              dataSource={summaryRows}
              locale={{ emptyText: 'No daily backup prepared yet.' }}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </>
      )}
    </AdminShell>
  )
}
