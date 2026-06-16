import { Checkbox, Col, Form, Input, Row, Select, Typography } from 'antd'

const { Text } = Typography

const ROLE_OPTIONS = [
  { value: 'Super Admin/Developer', label: 'Super Admin/Developer' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Queue Officer', label: 'Queue Officer' },
  { value: 'Queue Number Officer', label: 'Queue Number Officer (QNO)' },
  { value: 'Secretariat', label: 'Secretariat' },
]

const ACCESS_OPTIONS = [
  { label: 'View Dashboard Menu', value: 'dashboard' },
  { label: 'View Developer Menu', value: 'developer' },
  { label: 'View Settings Menu', value: 'settings' },
  { label: 'View Queue Officer Menu', value: 'queue-officer' },
  { label: 'View Queue Portal', value: 'queue-officer-portal' },
  { label: 'View Serving Desk', value: 'queue-officer-serving-desk' },
  { label: 'View Queue Number Initialization', value: 'queue-number-initialization' },
  { label: 'View Secretariat Menu', value: 'secretariat' },
  { label: 'View Queue Dashboard', value: 'queue-dashboard' },
]

export default function UserFormContent({
  editingUser,
  form,
  handleRoleChange,
  handleSubmit,
  selectedCreateRole,
}) {
  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a name.' }]}>
        <Input placeholder="Maria Administrator" />
      </Form.Item>
      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Please enter an email.' },
          { type: 'email', message: 'Enter a valid email.' },
        ]}
      >
        <Input placeholder="admin@example.com" />
      </Form.Item>
      <Form.Item
        name="password"
        label={editingUser ? 'Password (optional)' : 'Password'}
        rules={editingUser ? [] : [{ required: true, message: 'Please enter a password.' }]}
      >
        <Input.Password placeholder="At least 8 characters" />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Please select a role.' }]}>
            <Select options={ROLE_OPTIONS} onChange={handleRoleChange} />
          </Form.Item>
          {selectedCreateRole === 'Queue Number Officer' ? (
            <Text type="secondary" style={{ display: 'block', marginTop: -8, marginBottom: 8, fontSize: 12 }}>
              QNO effect: grants Dashboard, Queue Officer menu, Queue Number Initialization, and Queue Dashboard access.
            </Text>
          ) : null}
        </Col>
        <Col span={12}>
          <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select a status.' }]}>
            <Select
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="accessModules" label="Initial Access" rules={[{ required: true, message: 'Please select at least one access module.' }]}>
        <Checkbox.Group options={ACCESS_OPTIONS} />
      </Form.Item>
    </Form>
  )
}
