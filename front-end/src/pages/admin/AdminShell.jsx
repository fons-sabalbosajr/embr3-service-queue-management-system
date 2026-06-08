import {
  BarChartOutlined,
  BgColorsOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MonitorOutlined,
  NotificationOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  ConfigProvider,
  Dropdown,
  Layout,
  Menu,
  Space,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import emblogo from '../../assets/emblogo.svg';
import bagongPilipinas from '../../assets/bagongpilipinaslogo.png';
import { useAuth } from '../../context/AuthContext';
import { BRAND_SHORT } from '../../theme';
import './AdminDataTables.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

function canView(admin, moduleKey) {
  return (admin?.accessModules || []).includes(moduleKey);
}

export default function AdminShell({ title, subtitle, children, extra }) {
  const [collapsed, setCollapsed] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Sign out',
        onClick: handleLogout,
      },
    ],
  };

  const menuItems = useMemo(() => {
    const items = [];

    if (canView(admin, 'dashboard')) {
      items.push({
        key: '/home',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      });
    }

    if (canView(admin, 'settings')) {
      items.push({
        key: 'settings-menu',
        icon: <SettingOutlined />,
        label: 'Settings',
        children: [
          {
            key: '/home/settings/queue-assigned-officers',
            icon: <TeamOutlined />,
            label: 'Queue Officers',
          },
          {
            key: '/home/settings/time-queue-management',
            icon: <ClockCircleOutlined />,
            label: 'Time Queue Management',
          },
          {
            key: '/home/settings/transaction-monitoring',
            icon: <BarChartOutlined />,
            label: 'Transactions',
          },
          {
            key: '/home/settings/dashboard-display',
            icon: <MonitorOutlined />,
            label: 'Queue Display',
          },
        ],
      });
    }

    if (canView(admin, 'developer')) {
      items.push({
        key: 'developer-menu',
        icon: <ToolOutlined />,
        label: 'Developer',
        className: 'developer-menu-theme',
        children: [
          {
            key: '/home/developer/user-account-management',
            icon: <UserOutlined />,
            label: 'User Accounts',
          },
          {
            key: '/home/developer/database-status-connections',
            icon: <DatabaseOutlined />,
            label: 'DB Status',
          },
          {
            key: '/home/developer/app-logs',
            icon: <FileTextOutlined />,
            label: 'App Logs',
          },
          {
            key: '/home/developer/display-config',
            icon: <BgColorsOutlined />,
            label: 'Display Config',
          },
        ],
      });
    }

    if (canView(admin, 'queue-officer')) {
      items.push({
        key: 'queue-officer-menu',
        icon: <NotificationOutlined />,
        label: 'Queue Officer',
        children: [
          {
            key: '/home/queue-officer/serving-desk',
            icon: <TeamOutlined />,
            label: 'Serving Desk',
          },
        ],
      });
    }

    if (canView(admin, 'secretariat')) {
      items.push({
        key: 'secretariat-menu',
        icon: <UserOutlined />,
        label: 'Secretariat',
        children: [
          {
            key: '/home/secretariat/start-transaction',
            icon: <UserOutlined />,
            label: 'Start Transaction',
          },
        ],
      });
    }

    return items;
  }, [admin]);

  const selectedKeys = useMemo(() => {
    return [pathname];
  }, [pathname]);

  return (
    <ConfigProvider componentSize="small">
      <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
        breakpoint="lg"
      >
        <div
          style={{
            height: 72,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 18px',
          }}
        >
          <img src={emblogo} alt="EMB" style={{ height: 36, width: 'auto' }} />
          {!collapsed ? (
            <span
              style={{
                color: '#fcd34d',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 0.5,
              }}
            >
              {BRAND_SHORT}
            </span>
          ) : null}
        </div>

        <Menu
          className="admin-shell-menu"
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={['developer-menu', 'settings-menu', 'queue-officer-menu', 'secretariat-menu']}
          items={menuItems}
          onClick={({ key }) => {
            if (String(key).startsWith('/')) {
              navigate(String(key));
            }
          }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <Space size={14} align="center">
            <Text style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>
              Administration Console
            </Text>
          </Space>

          <Space size={12} wrap>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <Avatar style={{ background: '#1d4ed8' }} icon={<UserOutlined />}>
                  {admin?.name?.[0]?.toUpperCase() || 'A'}
                </Avatar>
                <Text style={{ color: '#e2e8f0' }}>{admin?.name}</Text>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <Title level={3} style={{ marginBottom: 4 }}>
              {title}
            </Title>
            {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
          </div>

          {extra ? <div style={{ marginBottom: 20 }}>{extra}</div> : null}

          {children}
        </Content>
      </Layout>
      </Layout>
    </ConfigProvider>
  );
}