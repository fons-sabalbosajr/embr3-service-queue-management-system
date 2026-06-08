import { App, Button, Card, Col, Form, InputNumber, Row, Switch } from 'antd';
import AdminShell from './AdminShell';

export default function SettingsTimeQueueManagement() {
  const { message } = App.useApp();

  return (
    <AdminShell
      title="Time Queue Management"
      subtitle="Configure timing rules that control queue pacing and service SLAs."
    >
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card bordered={false}>
            <Form
              layout="vertical"
              onFinish={() => message.success('Time queue settings saved.')}
              initialValues={{ maxWait: 15, serviceWindow: 7, autoEscalate: true }}
            >
              <Form.Item label="Maximum Wait Threshold (minutes)" name="maxWait">
                <InputNumber min={1} max={120} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Average Service Window (minutes)" name="serviceWindow">
                <InputNumber min={1} max={60} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Auto-escalate delayed tickets" name="autoEscalate" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Button htmlType="submit" type="primary">
                Save Time Rules
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </AdminShell>
  );
}