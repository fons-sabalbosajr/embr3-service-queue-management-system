import { Form, Select, Switch, Table, Typography } from 'antd'

const { Text } = Typography

const ROLE_OPTIONS = [
  { value: 'Super Admin/Developer', label: 'Super Admin/Developer' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Queue Officer', label: 'Queue Officer' },
  { value: 'Queue Number Officer', label: 'Queue Number Officer (QNO)' },
  { value: 'Secretariat', label: 'Secretariat' },
]

const ACCESS_ROWS = [
  { label: 'Dashboard Menu', value: 'dashboard', description: 'Allow access to the home dashboard.' },
  { label: 'Developer Menu', value: 'developer', description: 'Allow access to the developer tool menu.' },
  { label: 'Settings Menu', value: 'settings', description: 'Allow access to the settings section.' },
  { label: 'Queue Officer Menu', value: 'queue-officer', description: 'Allow queue-operations navigation.' },
  { label: 'Queue Portal', value: 'queue-officer-portal', description: 'Show the queue officer portal page.' },
  { label: 'Serving Desk', value: 'queue-officer-serving-desk', description: 'Show the serving desk page.' },
  { label: 'Queue Number Initialization', value: 'queue-number-initialization', description: 'Allow QNO ready-number generation and handoff.' },
  { label: 'Secretariat Menu', value: 'secretariat', description: 'Allow access to secretariat pages.' },
  { label: 'Queue Dashboard', value: 'queue-dashboard', description: 'Allow launching the public queue board.' },
]

export default function UserAccessContent({
  accessForm,
  handleAccessRoleChange,
  handleAccessSave,
  selectedAccessRole,
}) {
  const selectedModules = Form.useWatch('accessModules', accessForm) || []

  const accessColumns = [
    {
      title: 'Access Module',
      key: 'label',
      render: (_, record) => (
        <div>
          <Text strong>{record.label}</Text>
          <div style={{ color: '#64748b', fontSize: 12 }}>{record.description}</div>
        </div>
      ),
    },
    {
      title: 'Enabled',
      key: 'enabled',
      width: 120,
      render: (_, record) => (
        <Switch
          checked={selectedModules.includes(record.value)}
          onChange={(checked) => {
            const next = new Set(selectedModules)
            if (checked) next.add(record.value)
            else next.delete(record.value)
            accessForm.setFieldValue('accessModules', Array.from(next))
          }}
        />
      ),
    },
  ]

  return (
    <Form form={accessForm} layout="vertical" onFinish={handleAccessSave}>
      <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Please select a role.' }]}>
        <Select options={ROLE_OPTIONS} onChange={handleAccessRoleChange} />
      </Form.Item>
      {selectedAccessRole === 'Queue Number Officer' ? (
        <Text type="secondary" style={{ display: 'block', marginTop: -8, marginBottom: 12, fontSize: 12 }}>
          QNO effect: grants Dashboard, Queue Officer menu, Queue Number Initialization, and Queue Dashboard access.
        </Text>
      ) : null}
      <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select a status.' }]}>
        <Select
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
      </Form.Item>
      <Form.Item name="accessModules" rules={[{ required: true, message: 'Please enable at least one access module.' }]} hidden>
        <Select mode="multiple" />
      </Form.Item>
      <Table rowKey="value" columns={accessColumns} dataSource={ACCESS_ROWS} pagination={false} size="small" />
    </Form>
  )
}
