import { Form, Input, Select } from 'antd'

export default function OfficerFormContent({
  editingOfficer,
  form,
  handleSubmit,
  transactionOptions,
}) {
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{ status: 'Available' }}
    >
      <Form.Item
        name="name"
        label="Name"
        rules={[{ required: true, message: 'Please enter a name.' }]}
      >
        <Input placeholder="Juan Officer" />
      </Form.Item>
      <Form.Item
        name="username"
        label="Username"
        rules={[{ required: true, message: 'Please enter a username.' }]}
      >
        <Input placeholder="juan.officer" />
      </Form.Item>
      <Form.Item
        name="password"
        label={editingOfficer ? 'Password (optional)' : 'Password'}
        rules={editingOfficer ? [] : [{ required: true, message: 'Please enter a password.' }]}
      >
        <Input.Password placeholder="At least 8 characters" />
      </Form.Item>
      <Form.Item
        name="position"
        label="Position"
        rules={[{ required: true, message: 'Please enter a position.' }]}
      >
        <Select
          showSearch
          mode="tags"
          maxCount={1}
          placeholder="Queue Officer / Queue Number Officer"
          options={[
            { value: 'Queue Officer', label: 'Queue Officer' },
            { value: 'Queue Number Officer', label: 'Queue Number Officer' },
            { value: 'Queue Supervisor', label: 'Queue Supervisor' },
          ]}
        />
      </Form.Item>
      <Form.Item
        name="designation"
        label="Designation"
        rules={[{ required: true, message: 'Please enter a designation.' }]}
      >
        <Input placeholder="Environmental Management Specialist" />
      </Form.Item>
      <Form.Item
        name="assignedTransaction"
        label="Assigned Transaction"
        rules={[{ required: true, message: 'Please select a transaction.' }]}
      >
        <Select
          mode="tags"
          maxCount={1}
          options={transactionOptions}
          placeholder="Select or type a custom transaction"
        />
      </Form.Item>
      <Form.Item
        name="status"
        label="Status"
        rules={[{ required: true, message: 'Please select a status.' }]}
      >
        <Select
          options={[
            { value: 'Available', label: 'Available' },
            { value: 'Not Available', label: 'Not Available' },
          ]}
        />
      </Form.Item>
    </Form>
  )
}
