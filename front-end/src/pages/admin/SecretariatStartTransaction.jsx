import { Button, Card, Form, Input, Select } from 'antd';
import AdminShell from './AdminShell';

export default function SecretariatStartTransaction() {
  return (
    <AdminShell
      title="Secretariat Menu"
      subtitle="Start-of-transaction intake for clients before queue processing begins."
    >
      <Card bordered={false} className="admin-data-table-card">
        <Form layout="vertical">
          <Form.Item label="Client Name">
            <Input placeholder="Enter client name" />
          </Form.Item>
          <Form.Item label="Transaction Type">
            <Select
              options={[
                { value: 'Permits', label: 'Permits' },
                { value: 'Clearance', label: 'Clearance' },
                { value: 'Inspection', label: 'Inspection' },
              ]}
            />
          </Form.Item>
          <Button type="primary">Start Transaction</Button>
        </Form>
      </Card>
    </AdminShell>
  );
}
