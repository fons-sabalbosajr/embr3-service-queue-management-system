import {
  CloudServerOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Button, Card, Empty, Skeleton, Space, Table, Tabs, Tag, Typography } from 'antd'

const { Text } = Typography

function SummaryItem({ label, value, accent }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        background: '#fff',
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: accent || '#0f172a', lineHeight: 1.3 }}>
        {value}
      </div>
    </div>
  )
}

export default function DatabaseStatusTabs({ diagnostics, loading, onExportCollection }) {
  const overviewGroups = [
    {
      key: 'connection',
      title: 'Connection Health',
      items: [
        { label: 'API Status', value: <Tag color={diagnostics?.status === 'ok' ? 'green' : 'red'}>{diagnostics?.status || 'unknown'}</Tag>, accent: '#15803d' },
        { label: 'Database', value: <Tag color={diagnostics?.database === 'connected' ? 'green' : 'gold'}>{diagnostics?.database || 'unavailable'}</Tag>, accent: '#15803d' },
        { label: 'Database Name', value: diagnostics?.databaseName || 'Unavailable' },
        { label: 'Host / Port', value: `${diagnostics?.host || 'Unavailable'}:${diagnostics?.port || '—'}` },
      ],
    },
    {
      key: 'runtime',
      title: 'Runtime Signals',
      items: [
        { label: 'Server Time', value: diagnostics?.serverTime ? new Date(diagnostics.serverTime).toLocaleString() : 'Unavailable' },
        { label: 'Node Version', value: diagnostics?.nodeVersion || 'Unavailable' },
        { label: 'Mongo Version', value: diagnostics?.mongoVersion || 'Unavailable' },
        { label: 'Memory RSS', value: diagnostics?.memoryUsage?.rss ? `${Math.round(diagnostics.memoryUsage.rss / 1024 / 1024)} MB` : 'Unavailable' },
      ],
    },
    {
      key: 'storage',
      title: 'Storage & Security',
      items: [
        { label: 'Primary Database', value: <><CloudServerOutlined style={{ marginRight: 8 }} />MongoDB Atlas</> },
        { label: 'Connection Mode', value: <><LinkOutlined style={{ marginRight: 8 }} />TLS secured</> },
        { label: 'Observed State', value: diagnostics?.database === 'connected' ? 'Realtime connection established' : 'Waiting for status response' },
        { label: 'Connections', value: diagnostics?.connections ? `${diagnostics.connections.current || 0} current / ${diagnostics.connections.available || 0} available` : 'Unavailable' },
      ],
    },
  ]

  const collectionColumns = [
    {
      title: 'Collection',
      dataIndex: 'name',
      key: 'name',
      render: (value) => (
        <Space>
          <DatabaseOutlined />
          <strong>{value}</strong>
        </Space>
      ),
    },
    {
      title: 'Documents',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => onExportCollection(record.name)}>
          Export
        </Button>
      ),
    },
  ]

  const backupColumns = [
    { title: 'Label', dataIndex: 'label', key: 'label' },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy' },
    { title: 'Collections', dataIndex: 'collectionCount', key: 'collectionCount' },
    { title: 'Documents', dataIndex: 'documentCount', key: 'documentCount' },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => new Date(value).toLocaleString(),
    },
  ]

  return (
    <Tabs
      defaultActiveKey="overview"
      items={[
        {
          key: 'overview',
          label: (
            <Space size={6}>
              <SafetyCertificateOutlined />
              <span>Overview</span>
            </Space>
          ),
          children: loading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {overviewGroups.map((group) => (
                <div key={group.key}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    {group.title}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                    {group.items.map((item) => (
                      <SummaryItem key={item.label} label={item.label} value={item.value} accent={item.accent} />
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Operational Counts
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Tag color="blue">Collections {diagnostics?.collectionCount || 0}</Tag>
                  <Tag color="purple">Documents {diagnostics?.totalDocuments || 0}</Tag>
                  <Tag color="cyan">Logs {diagnostics?.logCount ?? 0}</Tag>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'collections',
          label: (
            <Space size={6}>
              <DatabaseOutlined />
              <span>Collections</span>
              <Tag color="blue" style={{ marginInlineStart: 0 }}>{diagnostics?.collections?.length || 0}</Tag>
            </Space>
          ),
          children: (
            <Table
              rowKey="name"
              columns={collectionColumns}
              dataSource={diagnostics?.collections || []}
              loading={loading}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 'max-content' }}
            />
          ),
        },
        {
          key: 'backups',
          label: (
            <Space size={6}>
              <CloudServerOutlined />
              <span>Backup Snapshots</span>
              <Tag color="purple" style={{ marginInlineStart: 0 }}>{diagnostics?.backups?.length || 0}</Tag>
            </Space>
          ),
          children: diagnostics?.backups?.length || loading ? (
            <Table
              rowKey="_id"
              columns={backupColumns}
              dataSource={diagnostics?.backups || []}
              loading={loading}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 'max-content' }}
            />
          ) : (
            <Card bordered={false} style={{ background: '#f8fafc' }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No backup snapshots yet." />
            </Card>
          ),
        },
      ]}
    />
  )
}
