import { Card, Col, Row, Tag } from 'antd';
import AdminShell from './AdminShell';

const TASKS = [
  { title: 'Serving Counter', value: 'Queue Counter A', status: 'Ready' },
  { title: 'Current Transaction', value: 'Permits', status: 'Assigned' },
  { title: 'Queue Board', value: 'Public dashboard visible', status: 'Synced' },
];

export default function QueueOfficerServingDesk() {
  return (
    <AdminShell
      title="Queue Officer Menu"
      subtitle="Operational workspace for assigned SQMS queue officers."
    >
      <Row gutter={[16, 16]}>
        {TASKS.map((task) => (
          <Col xs={24} md={8} key={task.title}>
            <Card bordered={false} className="admin-data-table-card">
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{task.title}</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>{task.value}</div>
              <Tag color="blue">{task.status}</Tag>
            </Card>
          </Col>
        ))}
      </Row>
    </AdminShell>
  );
}
