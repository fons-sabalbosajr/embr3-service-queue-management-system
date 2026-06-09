import {
  BarChartOutlined,
  CloseOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MenuOutlined,
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
  Drawer,
  Dropdown,
  Layout,
  Menu,
  Space,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import emblogo from '../../assets/emblogo.svg';
import { useAuth } from '../../context/AuthContext';
import { BRAND_SHORT } from '../../theme';
import './AdminDataTables.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

function canView(admin, moduleKey) {
  return (admin?.accessModules || []).includes(moduleKey);
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function SidebarContent({ menuItems, selectedKeys, navigate, collapsed }) {
  return (
    <>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', flexShrink: 0 }}>
        <img src={emblogo} alt="EMB" style={{ height: 32, width: 'auto', flexShrink: 0 }} />
        {!collapsed ? (
          <span style={{ color: '#fcd34d', fontWeight: 700, fontSize: 12, letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {BRAND_SHORT}
          </span>
        ) : null}
      </div>
      <Menu
        className="admin-shell-menu"
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        defaultOpenKeys={['developer-menu', 'settings-menu', 'queue-officer-menu']}
        items={menuItems}
        onClick={({ key }) => {
          if (String(key).startsWith('/')) {
            navigate(String(key));
          }
        }}
      />
    </>
  );
}

export default function AdminShell({ title, subtitle, children, extra, titleExtra }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const now = useClock();

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
    const isDeveloperAccount = admin?.accountType === 'admin' && canView(admin, 'developer');
    const isQueueOfficerAccount = admin?.accountType === 'queue-officer';

    if (canView(admin, 'dashboard')) {
      items.push({ key: '/home', icon: <DashboardOutlined />, label: 'Dashboard' });
    }

    if (canView(admin, 'settings')) {
      items.push({
        key: 'settings-menu',
        icon: <SettingOutlined />,
        label: 'Settings',
        children: [
          { key: '/home/settings/queue-assigned-officers', icon: <TeamOutlined />, label: 'Queue Officers' },
          { key: '/home/settings/transaction-monitoring', icon: <BarChartOutlined />, label: 'Transactions' },
          { key: '/home/settings/dashboard-display', icon: <MonitorOutlined />, label: 'Queue Display' },
        ],
      });
    }

    if (isDeveloperAccount) {
      items.push({
        key: 'developer-menu',
        icon: <ToolOutlined />,
        label: 'Developer',
        className: 'developer-menu-theme',
        children: [
          { key: '/home/developer/user-account-management', icon: <UserOutlined />, label: 'User Accounts' },
          { key: '/home/developer/database-status-connections', icon: <DatabaseOutlined />, label: 'DB Status' },
          { key: '/home/developer/app-logs', icon: <FileTextOutlined />, label: 'App Logs' },
          { key: '/home/queue-officer/my-queue-portal', icon: <IdcardOutlined />, label: 'Queue Portal' },
        ],
      });
    }

    // Queue officers get flat direct links — no submenu wrapper
    if (isQueueOfficerAccount) {
      // if (canView(admin, 'queue-officer-serving-desk') || canView(admin, 'queue-officer')) {
      //   items.push({ key: '/home/queue-officer/serving-desk', icon: <TeamOutlined />, label: 'Serving Desk' });
      // }
      if (canView(admin, 'queue-officer-portal')) {
        items.push({ key: '/home/queue-officer/my-queue-portal', icon: <IdcardOutlined />, label: 'My Queue Portal' });
      }
    }

    return items;
  }, [admin]);

  const selectedKeys = useMemo(() => [pathname], [pathname]);

  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <ConfigProvider componentSize="small">
      {/*
        Outer Layout — Ant Design detects the <Sider> child and automatically
        applies .ant-layout-has-sider which sets flex-direction: row.
        DO NOT add flexDirection: 'column' here — it would override that and
        stack the sidebar above the content instead of beside it.
      */}
      <Layout style={{ minHeight: '100vh' }}>

        {/* ── Desktop sidebar ──────────────────────────────────────── */}
        <Sider
          className="admin-sider-desktop"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="dark"
          width={220}
          collapsedWidth={60}
          breakpoint="lg"
          onBreakpoint={(broken) => { if (broken) setCollapsed(true); }}
        >
          <SidebarContent
            menuItems={menuItems}
            selectedKeys={selectedKeys}
            navigate={(path) => navigate(path)}
            collapsed={collapsed}
          />
        </Sider>

        {/* ── Mobile drawer — renders to a portal, no flex impact ──── */}
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          width={240}
          styles={{ body: { padding: 0, background: '#001529' }, header: { display: 'none' } }}
          className="admin-mobile-drawer"
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px' }}>
            <Button type="text" icon={<CloseOutlined />} style={{ color: '#94a3b8' }} onClick={() => setMobileDrawerOpen(false)} />
          </div>
          <SidebarContent
            menuItems={menuItems}
            selectedKeys={selectedKeys}
            navigate={(path) => { navigate(path); setMobileDrawerOpen(false); }}
            collapsed={false}
          />
        </Drawer>

        {/*
          Inner Layout — no Sider child, so Ant Design makes this column
          automatically. flex: 1 makes it fill the width left by the Sider.
          minHeight: 100vh + flex column ensures the footer always stays at
          the bottom of the viewport.
        */}
        <Layout style={{ flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header className="admin-header">
            {/* Mobile hamburger — shown only on small screens via CSS */}
            <Button
              className="admin-header-hamburger"
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileDrawerOpen(true)}
              style={{ color: '#e2e8f0', fontSize: 18, flexShrink: 0 }}
            />

            {/* Spacer so user block always stays right-aligned */}
            <div style={{ flex: 1 }} />

            {/* Right side: clock + user */}
            <Space size={14} align="center">
              <div className="admin-header-clock">
                <Text style={{ color: '#cbd5e1', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                  {dateStr}
                </Text>
                <Text style={{ color: '#93c5fd', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
                  {timeStr}
                </Text>
              </div>

              <Dropdown menu={userMenu} placement="bottomRight">
                <div className="admin-header-user">
                  <Avatar size="small" style={{ background: '#1d4ed8', flexShrink: 0 }} icon={<UserOutlined />}>
                    {admin?.name?.[0]?.toUpperCase() || 'A'}
                  </Avatar>
                  <Text className="admin-header-username">{admin?.name}</Text>
                </div>
              </Dropdown>
            </Space>
          </Header>

          <Content className="admin-content" style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
            <div className="admin-page-header">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <Title level={4} style={{ marginBottom: 2 }}>{title}</Title>
                  {subtitle ? <Text type="secondary" style={{ fontSize: 13 }}>{subtitle}</Text> : null}
                </div>
                {titleExtra ? <div style={{ flexShrink: 0 }}>{titleExtra}</div> : null}
              </div>
            </div>

            {extra ? <div className="admin-page-extra">{extra}</div> : null}

            {children}
          </Content>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <footer className="admin-footer">
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>
              © {new Date().getFullYear()} EMB R3 Service Queue Management System &nbsp;·&nbsp; All rights reserved
            </Text>
          </footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
