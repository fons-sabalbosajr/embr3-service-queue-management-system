import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  FireOutlined,
  HeartOutlined,
  LikeOutlined,
  NotificationOutlined,
  ReloadOutlined,
  RiseOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Row,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AdminShell from './AdminShell';
import LoadingScreen from '../../components/LoadingScreen';

const HomeDetailedPanels = lazy(() => import('./home/HomeDetailedPanels'))

const { Text } = Typography;

const REFRESH_MS = 5000;

function extractNum(cardNo) {
  const str = String(cardNo || '').trim();
  if (!str) return '--';
  const groups = str.match(/(\d+)/g);
  if (!groups?.length) return str;
  return groups[groups.length - 1].slice(-2).padStart(2, '0');
}

function isPriority(status) {
  return ['priority', 'senior', 'pwd'].some((kw) =>
    String(status || '').toLowerCase().includes(kw)
  );
}

function normText(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sortByStatus(items) {
  const rank = { CALL: 0, 'Waiting to Call': 1, Queued: 2, 'CLIENT MISSING': 3 };
  return [...items].sort((a, b) => {
    const d = (rank[a.clientCallStatus] ?? 9) - (rank[b.clientCallStatus] ?? 9);
    return d !== 0 ? d : new Date(a.createdAt) - new Date(b.createdAt);
  });
}

export default function Home() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [queueItems, setQueueItems] = useState([]);
  const [counterCards, setCounterCards] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [assistedItems, setAssistedItems] = useState([]);
  const [qnoNumbers, setQnoNumbers] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilterMode, setDateFilterMode] = useState('all');
  const [singleDate, setSingleDate] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const canUseQno = (admin?.accessModules || []).includes('queue-number-initialization');

  const matchesDateFilter = (value) => {
    if (dateFilterMode === 'all') return true
    const date = dayjs(value)
    if (!date.isValid()) return false
    if (dateFilterMode === 'single') return singleDate ? date.isSame(singleDate, 'day') : true
    if (!dateRange || !dateRange[0] || !dateRange[1]) return true
    return date.isAfter(dateRange[0].startOf('day').subtract(1, 'millisecond')) && date.isBefore(dateRange[1].endOf('day').add(1, 'millisecond'))
  }

  const filteredQueueItems = useMemo(() => queueItems.filter((item) => matchesDateFilter(item.createdAt)), [queueItems, dateFilterMode, singleDate, dateRange])
  const filteredRecentLogs = useMemo(() => recentLogs.filter((log) => matchesDateFilter(log.timestamp || log.createdAt)), [recentLogs, dateFilterMode, singleDate, dateRange])
  const filteredAssistedItems = useMemo(() => assistedItems.filter((item) => matchesDateFilter(item.updatedAt || item.createdAt)), [assistedItems, dateFilterMode, singleDate, dateRange])
  const filteredQnoNumbers = useMemo(() => qnoNumbers.filter((item) => matchesDateFilter(item.createdAt)), [qnoNumbers, dateFilterMode, singleDate, dateRange])

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const [displayRes, summaryRes] = await Promise.all([
        apiClient.get('/queue-display'),
        apiClient.get('/transaction-monitoring/public-summary'),
      ]);
      setCounterCards(
        (displayRes.data.config?.counterCards || [])
          .filter((c) => c.active)
          .sort((a, b) => a.order - b.order)
      );
      setQueueItems(summaryRes.data.queueItems || []);
      setLastUpdated(new Date());

      if (canUseQno) {
        try {
          const { data: qnoData } = await apiClient.get('/queue-officers/qno/numbers');
          setQnoNumbers(qnoData.numbers || []);
        } catch {
          setQnoNumbers([]);
        }
      }

      try {
        const [officersRes, logsRes, txnRes] = await Promise.all([
          apiClient.get('/queue-officers'),
          apiClient.get('/app-logs'),
          apiClient.get('/transaction-monitoring'),
        ]);
        setOfficers(officersRes.data.officers || []);
        setRecentLogs((logsRes.data.logs || []).slice(0, 20));
        setAssistedItems((txnRes.data.transactions || []).filter((t) => t.clientCallStatus === 'Assisted'));
      } catch {
        // Non-admin path — officers / logs not accessible
      }
    } catch {
      // Network error — silently skip
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDashboard();
    const id = setInterval(() => loadDashboard({ silent: true }), REFRESH_MS);
    return () => clearInterval(id);
  }, [canUseQno]);

  const stats = useMemo(() => ({
    serving: filteredQueueItems.filter((i) => i.clientCallStatus === 'CALL').length,
    waiting: filteredQueueItems.filter((i) => ['Waiting to Call', 'Queued'].includes(i.clientCallStatus)).length,
    missing: filteredQueueItems.filter((i) => i.clientCallStatus === 'CLIENT MISSING').length,
    total: filteredQueueItems.length,
    priority: filteredQueueItems.filter((i) => isPriority(i.clientStatus)).length,
    regular: filteredQueueItems.filter((i) => !isPriority(i.clientStatus)).length,
    availableOfficers: officers.filter((o) => o.status === 'Available').length,
  }), [filteredQueueItems, officers]);

  const qnoStats = useMemo(() => ({
    ready: filteredQnoNumbers.filter((item) => !item.thrown).length,
    thrown: filteredQnoNumbers.filter((item) => item.thrown).length,
    priority: filteredQnoNumbers.filter((item) => isPriority(item.clientStatus) && !item.thrown).length,
  }), [filteredQnoNumbers]);

  const qnoRecent = useMemo(
    () => [...filteredQnoNumbers].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)).slice(0, 6),
    [filteredQnoNumbers]
  );

  const cardData = useMemo(() => counterCards.map((card) => {
    const t = normText(card.transactionName);
    const matching = filteredQueueItems.filter((item) => {
      const e = normText(item.eccCnc);
      return e === t || e.includes(t) || t.includes(e);
    });
    const regular = sortByStatus(matching.filter((i) => !isPriority(i.clientStatus)));
    const priority = sortByStatus(matching.filter((i) => isPriority(i.clientStatus)));
    return {
      ...card,
      servingReg: regular.find((i) => i.clientCallStatus === 'CALL') || null,
      nextReg: regular.find((i) => i.clientCallStatus !== 'CALL') || null,
      servingPri: priority.find((i) => i.clientCallStatus === 'CALL') || null,
      nextPri: priority.find((i) => i.clientCallStatus !== 'CALL') || null,
      waiting: matching.filter((i) => ['Waiting to Call', 'Queued'].includes(i.clientCallStatus)).length,
      activeCount: matching.filter((i) => ['CALL', 'Waiting to Call', 'Queued', 'CLIENT MISSING'].includes(i.clientCallStatus)).length,
      cardOfficers: officers.filter(
        (o) => normText(o.assignedTransaction) === t
      ),
    };
  }), [counterCards, filteredQueueItems, officers]);

  // Log severity counts for chart
  const logSeverityCounts = useMemo(() => {
    const counts = { Info: 0, Notice: 0, Warning: 0, Critical: 0 };
    filteredRecentLogs.forEach((log) => { counts[log.severity] = (counts[log.severity] || 0) + 1; });
    return counts;
  }, [filteredRecentLogs]);

  // Assisted clients grouped by officer
  const assistedByOfficer = useMemo(() => {
    const counts = {};
    filteredAssistedItems.forEach((item) => {
      const officer = item.screeningOfficer || 'Unknown';
      counts[officer] = (counts[officer] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredAssistedItems]);

  if (loading && !lastUpdated) {
    return (
      <AdminShell
        title={`Queue Dashboard — ${admin?.name?.split(' ')[0] || 'Admin'}`}
        subtitle="Real-time monitoring of all active service counters and queuing activity."
      >
        <LoadingScreen
          compact
          title="Loading dashboard"
          description="Preparing counters, queue activity, officer readiness, and QNO metrics."
        />
      </AdminShell>
    )
  }

  return (
    <AdminShell
      title={`Queue Dashboard — ${admin?.name?.split(' ')[0] || 'Admin'}`}
      // subtitle="Real-time monitoring of active service counters, queue readiness, and Queue Number Officer flow."
      titleExtra={
        <Space wrap align="center">
          {lastUpdated && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
          <Button size="small" icon={<ReloadOutlined />} onClick={loadDashboard} loading={loading}>
            Refresh
          </Button>
          <Tag color="blue">{dateFilterMode === 'all' ? 'All dates' : dateFilterMode === 'single' ? 'Single date' : 'Date range'}</Tag>
          {canUseQno ? (
            <Button size="small" icon={<FireOutlined className="anim-icon-pulse" />} onClick={() => navigate('/home/queue-officer/queue-number-initialization')}>
              QNO Console
            </Button>
          ) : null}
          <Button type="primary" size="small" icon={<DesktopOutlined />} onClick={() => navigate('/queue-dashboard')}>
            Launch Public Board
          </Button>
        </Space>
      }
      extra={
        <Space wrap>
          <Button size="small" type={dateFilterMode === 'all' ? 'primary' : 'default'} onClick={() => { setDateFilterMode('all'); setSingleDate(null); setDateRange(null); }}>
            All Dates
          </Button>
          <Button size="small" type={dateFilterMode === 'single' ? 'primary' : 'default'} onClick={() => { setDateFilterMode('single'); setDateRange(null); }}>
            Single Date
          </Button>
          <Button size="small" type={dateFilterMode === 'range' ? 'primary' : 'default'} onClick={() => { setDateFilterMode('range'); setSingleDate(null); }}>
            Date Range
          </Button>
          {dateFilterMode === 'single' ? <DatePicker value={singleDate} onChange={setSingleDate} /> : null}
          {dateFilterMode === 'range' ? <DatePicker.RangePicker value={dateRange} onChange={setDateRange} /> : null}
        </Space>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} xl={canUseQno ? 15 : 24}>
          <Card
            bordered={false}
            className="admin-data-table-card"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 58%, #0ea5e9 100%)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ maxWidth: 620 }}>
                <Tag style={{ marginBottom: 10, background: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.22)', color: '#e0f2fe' }}>
                  Live Command Center
                </Tag>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 28, lineHeight: 1.1, marginBottom: 8 }}>
                  Queue Dashboard
                </div>
                <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>
                  Track active counters, ready numbers, queue pressure, and officer readiness from one screen.
                </Text>
                <Space wrap style={{ marginTop: 14 }}>
                  <Button type="primary" ghost icon={<NotificationOutlined className="anim-icon-ring" />} onClick={() => navigate('/home/queue-officer/my-queue-portal')}>
                    Open Queue Portal
                  </Button>
                  {canUseQno ? (
                    <Button style={{ background: '#fff', color: '#1d4ed8', borderColor: '#fff' }} icon={<FireOutlined className="anim-icon-pulse" />} onClick={() => navigate('/home/queue-officer/queue-number-initialization')}>
                      Generate Ready Numbers
                    </Button>
                  ) : null}
                </Space>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: 10, minWidth: 260, flex: '1 1 260px' }}>
                {[
                  { label: 'Serving', value: stats.serving, color: '#6ee7b7', icon: <NotificationOutlined className="anim-icon-ring" /> },
                  { label: 'Waiting', value: stats.waiting, color: '#fde68a', icon: <ClockCircleOutlined className="anim-icon-pulse" /> },
                  { label: 'Ready QNO', value: qnoStats.ready, color: '#bfdbfe', icon: <FireOutlined className="anim-icon-pop" /> },
                  { label: 'Officers Ready', value: stats.availableOfficers, color: '#c4b5fd', icon: <TeamOutlined className="anim-icon-wiggle" /> },
                ].map((item) => (
                  <div key={item.label} style={{ borderRadius: 16, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.label}</Text>
                      <span style={{ color: item.color, fontSize: 16 }}>{item.icon}</span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        {canUseQno ? (
          <Col xs={24} xl={9}>
            <Card
              bordered={false}
              className="admin-data-table-card"
              title={
                <Space>
                  <FireOutlined className="anim-icon-pulse" style={{ color: '#f97316' }} />
                  <span style={{ fontWeight: 700 }}>QNO Launchpad</span>
                </Space>
              }
              extra={<Tag color="blue">{qnoRecent.length} recent</Tag>}
              style={{ height: '100%' }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <Tag color="default">Ready {qnoStats.ready}</Tag>
                <Tag color="processing">Thrown {qnoStats.thrown}</Tag>
                <Tag color="orange">Priority {qnoStats.priority}</Tag>
              </div>

              {qnoRecent.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No initialized numbers yet." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {qnoRecent.map((item) => (
                    <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: item.thrown ? '#eff6ff' : '#f8fafc', border: `1px solid ${item.thrown ? '#bfdbfe' : '#e2e8f0'}` }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Tag className={item.thrown ? '' : 'qno-ready-number'} color={item.thrown ? 'processing' : 'default'} style={{ margin: 0, fontWeight: 800 }}>
                            {extractNum(item.clientCardNo)}
                          </Tag>
                          <Text strong style={{ fontSize: 12 }}>{item.eccCnc}</Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.clientStatus || 'Regular'} · {item.thrown ? 'Thrown to queue officer' : 'Waiting for handoff'}
                        </Text>
                      </div>
                      <span style={{ color: item.thrown ? '#1d4ed8' : '#64748b', fontSize: 18 }}>
                        {item.thrown ? <CheckCircleOutlined className="anim-icon-pop" /> : <FireOutlined className="anim-icon-pulse" />}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>
        ) : null}
      </Row>

      {canUseQno ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Tag color="blue">Ready {qnoStats.ready}</Tag>
          <Tag color="processing">Thrown {qnoStats.thrown}</Tag>
          <Tag color="orange">Priority {qnoStats.priority}</Tag>
        </div>
      ) : null}

      <Suspense
        fallback={
          <LoadingScreen
            compact
            title="Loading dashboard panels"
            description="Fetching analytics, counter cards, and recent activity widgets."
          />
        }
      >
        <HomeDetailedPanels
          assistedByOfficer={assistedByOfficer}
          assistedItems={filteredAssistedItems}
          cardData={cardData}
          counterCards={counterCards}
          loading={loading}
          logSeverityCounts={logSeverityCounts}
          recentLogs={filteredRecentLogs}
          stats={stats}
        />
      </Suspense>
    </AdminShell>
  );
}
