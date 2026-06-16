import { Col, DatePicker, Form, Input, Row, Select } from 'antd'

export default function TransactionMonitoringForm({ form, onFinish }) {
  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
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
            { value: 'Initialized', label: 'Initialized' },
            { value: 'CALL', label: 'CALL' },
            { value: 'CLIENT MISSING', label: 'CLIENT MISSING' },
            { value: 'Done', label: 'Done' },
            { value: 'Assisted', label: 'Assisted' },
          ]}
        />
      </Form.Item>
    </Form>
  )
}
