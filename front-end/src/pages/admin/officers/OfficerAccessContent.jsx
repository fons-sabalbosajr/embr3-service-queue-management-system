import { Space, Switch, Table, Typography } from 'antd'

const { Text } = Typography

const ACCESS_ROWS = [
  {
    key: 'dashboard',
    label: 'Dashboard Menu',
    description: 'Allow access to the home dashboard.',
  },
  {
    key: 'queue-dashboard',
    label: 'Public Queue Dashboard',
    description: 'Allow launching the public queue board.',
  },
  {
    key: 'queue-officer-serving-desk',
    label: 'Serving Desk',
    description: 'Show the serving desk menu page.',
  },
  {
    key: 'queue-officer-portal',
    label: 'My Queue Portal',
    description: 'Show the queue officer portal page.',
  },
  {
    key: 'queue-number-initialization',
    label: 'Queue No. Initialization',
    description: 'Allow generating and throwing ready queue numbers (Queue Number Officer).',
  },
]

export default function OfficerAccessContent({
  accountEnabled,
  selectedAccessModules,
  selectedOfficer,
  setAccountEnabled,
  setSelectedAccessModules,
}) {
  const accessColumns = [
    {
      title: 'Portal Access Item',
      dataIndex: 'label',
      key: 'label',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.label}</Text>
          <Text type="secondary">{record.description}</Text>
        </Space>
      ),
    },
    {
      title: 'Visible',
      key: 'visible',
      width: 120,
      render: (_, record) => (
        <Switch
          checked={selectedAccessModules.includes(record.key)}
          onChange={(checked) => {
            setSelectedAccessModules((current) => {
              const next = new Set(current.filter((item) => item !== 'queue-officer'))
              if (checked) next.add(record.key)
              else next.delete(record.key)
              if (next.has('queue-officer-serving-desk') || next.has('queue-officer-portal')) {
                next.add('queue-officer')
              }
              return Array.from(next)
            })
          }}
        />
      ),
    },
  ]

  return (
    <>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space direction="vertical" size={0}>
          <Text strong>Portal Account</Text>
          <Text type="secondary">
            Enable or disable sign-in for this queue officer{selectedOfficer ? `: ${selectedOfficer.name}` : ''}.
          </Text>
        </Space>
        <Switch checked={accountEnabled} onChange={setAccountEnabled} />
      </div>

      <Table rowKey="key" pagination={false} columns={accessColumns} dataSource={ACCESS_ROWS} size="small" />
    </>
  )
}
