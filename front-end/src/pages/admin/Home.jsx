import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Row,
  Statistic,
  Typography,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminShell from './AdminShell';

const { Title, Text } = Typography;

const STATS = [
  { title: 'Active Counters', value: 6, icon: <TeamOutlined />, color: '#1d4ed8' },
  { title: 'Waiting in Queue', value: 42, icon: <ClockCircleOutlined />, color: '#f59e0b' },
  { title: 'Served Today', value: 318, icon: <CheckCircleOutlined />, color: '#15803d' },
  { title: 'Avg. Wait (min)', value: 7.4, icon: <BarChartOutlined />, color: '#b91c1c' },
];

export default function Home() {
  const { admin } = useAuth();
  const navigate = useNavigate();

  return (
    <AdminShell
      title={`Welcome back, ${admin?.name?.split(' ')[0] || 'Admin'}.`}
      subtitle="Here is the current overview of your service queue operations."
    >
      <Row gutter={[20, 20]}>
        {STATS.map((stat) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <Card
              bordered={false}
              style={{ boxShadow: '0 12px 30px -22px rgba(15,23,42,0.45)' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Statistic title={stat.title} value={stat.value} />
                <div
                  style={{
                    fontSize: 26,
                    color: stat.color,
                    background: `${stat.color}1a`,
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={16}>
          <Card title="Operations Summary" bordered={false}>
            <Text type="secondary">
              Monitor live queues, manage service counters, and review
              performance from this console. Launch the public-facing queue
              dashboard to display the live calling board.
            </Text>
            <div style={{ marginTop: 18 }}>
              <Button
                type="primary"
                size="large"
                icon={<DesktopOutlined />}
                onClick={() => navigate('/queue-dashboard')}
              >
                Launch Queue Dashboard
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Account" bordered={false}>
            <p style={{ margin: '0 0 8px' }}>
              <Text type="secondary">Name: </Text>
              <Text strong>{admin?.name}</Text>
            </p>
            <p style={{ margin: 0 }}>
              <Text type="secondary">Email: </Text>
              <Text strong>{admin?.email}</Text>
            </p>
          </Card>
        </Col>
      </Row>
    </AdminShell>
  );
}
