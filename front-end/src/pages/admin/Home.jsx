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
  Row,
  Space,
  Statistic,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AdminShell from './AdminShell';

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

// SVG donut chart — pure React, no library needed
function QueueDonut({ segments, size = 130, label, sublabel }) {
  const r = 42;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0) || 1;
  let cumulative = 0;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14} />
      {segments.map((seg, i) => {
        if (!seg.value) return null;
        const dashLen = (seg.value / total) * C;
        const offset = C - cumulative * (C / total);
        cumulative += seg.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={14}
            strokeDasharray={`${dashLen} ${C}`}
            strokeDashoffset={offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.6s ease' }}
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={17} fontWeight={800} fill="#0f172a">{label ?? total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#64748b" letterSpacing={1}>{sublabel ?? 'TOTAL'}</text>
    </svg>
  );
}

export default function Home() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [queueItems, setQueueItems] = useState([]);
  const [counterCards, setCounterCards] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [assistedItems, setAssistedItems] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const id = setInterval(loadDashboard, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => ({
    serving: queueItems.filter((i) => i.clientCallStatus === 'CALL').length,
    waiting: queueItems.filter((i) => ['Waiting to Call', 'Queued'].includes(i.clientCallStatus)).length,
    missing: queueItems.filter((i) => i.clientCallStatus === 'CLIENT MISSING').length,
    total: queueItems.length,
    priority: queueItems.filter((i) => isPriority(i.clientStatus)).length,
    regular: queueItems.filter((i) => !isPriority(i.clientStatus)).length,
    availableOfficers: officers.filter((o) => o.status === 'Available').length,
  }), [queueItems, officers]);

  const cardData = useMemo(() => counterCards.map((card) => {
    const t = normText(card.transactionName);
    const matching = queueItems.filter((item) => {
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
  }), [counterCards, queueItems, officers]);

  // Log severity counts for chart
  const logSeverityCounts = useMemo(() => {
    const counts = { Info: 0, Notice: 0, Warning: 0, Critical: 0 };
    recentLogs.forEach((log) => { counts[log.severity] = (counts[log.severity] || 0) + 1; });
    return counts;
  }, [recentLogs]);

  // Assisted clients grouped by officer
  const assistedByOfficer = useMemo(() => {
    const counts = {};
    assistedItems.forEach((item) => {
      const officer = item.screeningOfficer || 'Unknown';
      counts[officer] = (counts[officer] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [assistedItems]);

  return (
    <AdminShell
      title={`Queue Operations — ${admin?.name?.split(' ')[0] || 'Admin'}`}
      subtitle="Real-time monitoring of all active service counters and queuing activity."
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
          <Button type="primary" size="small" icon={<DesktopOutlined />} onClick={() => navigate('/queue-dashboard')}>
            Launch Public Board
          </Button>
        </Space>
      }
    >
      {/* ── Live stats row ──────────────────────────────────────────── */}
      <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ textAlign: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10 }}>
            <Statistic
              title={<Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#1e40af' }}>Now Serving</Text>}
              value={stats.serving}
              valueStyle={{ color: '#1d4ed8', fontWeight: 900, fontSize: 32 }}
              prefix={<NotificationOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ textAlign: 'center', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10 }}>
            <Statistic
              title={<Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#92400e' }}>Waiting</Text>}
              value={stats.waiting}
              valueStyle={{ color: '#d97706', fontWeight: 900, fontSize: 32 }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ textAlign: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
            <Statistic
              title={<Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#14532d' }}>Officers Ready</Text>}
              value={stats.availableOfficers}
              valueStyle={{ color: '#15803d', fontWeight: 900, fontSize: 32 }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ textAlign: 'center', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10 }}>
            <Statistic
              title={<Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#581c87' }}>In Queue</Text>}
              value={stats.total}
              valueStyle={{ color: '#7c3aed', fontWeight: 900, fontSize: 32 }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Analytics & Trends ─────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={10}>
          <Card
            bordered={false}
            size="small"
            title={
              <Space>
                <BarChartOutlined style={{ color: '#1d4ed8' }} />
                <span style={{ fontWeight: 700 }}>Queue Load by Counter</span>
              </Space>
            }
            style={{ height: '100%' }}
          >
            {cardData.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 13 }}>No active counters configured.</Text>
            ) : (
              <div>
                {cardData.map((card) => {
                  const maxVal = Math.max(...cardData.map((c) => c.activeCount), 1);
                  const pct = maxVal > 0 ? Math.round((card.activeCount / maxVal) * 100) : 0;
                  return (
                    <div key={card._id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {card.transactionName}
                        </Text>
                        <Space size={4}>
                          {card.servingReg && <Tag style={{ margin: 0, fontSize: 10 }} color="blue">Reg {extractNum(card.servingReg.clientCardNo)}</Tag>}
                          {card.servingPri && <Tag style={{ margin: 0, fontSize: 10 }} color="gold">Pri {extractNum(card.servingPri.clientCardNo)}</Tag>}
                          <Text style={{ fontSize: 11, color: '#64748b' }}>{card.activeCount}</Text>
                        </Space>
                      </div>
                      <div style={{ background: '#e2e8f0', borderRadius: 6, height: 9, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', height: '100%' }}>
                          {card.servingReg || card.servingPri ? (
                            <div style={{
                              width: `${Math.max(pct > 0 ? 12 : 0, 12)}%`,
                              maxWidth: `${pct}%`,
                              background: 'linear-gradient(90deg,#1d4ed8,#3b82f6)',
                              borderRadius: '6px 0 0 6px',
                              transition: 'width 0.5s ease',
                            }} />
                          ) : null}
                          <div style={{
                            width: `${pct - (card.servingReg || card.servingPri ? Math.max(pct > 0 ? 12 : 0, 12) : 0)}%`,
                            background: '#93c5fd',
                            borderRadius: card.servingReg || card.servingPri ? '0 6px 6px 0' : 6,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                        <Text style={{ fontSize: 9, color: '#64748b' }}>{card.waiting} waiting</Text>
                        {card.cardOfficers.map((o) => (
                          <span key={o._id} style={{ fontSize: 9, color: o.status === 'Available' ? '#15803d' : '#94a3b8' }}>• {o.name}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Merged: Status Distribution + Activity by Severity */}
        <Col xs={24} md={7}>
          <Card
            bordered={false}
            size="small"
            title={
              <Space>
                <RiseOutlined style={{ color: '#7c3aed' }} />
                <span style={{ fontWeight: 700 }}>Analytics Overview</span>
                <Text type="secondary" style={{ fontSize: 11 }}>(last 20 logs)</Text>
              </Space>
            }
            style={{ height: '100%' }}
          >
            {/* ── Row 1: Two donuts side by side ────────────────── */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              {/* Status donut */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <QueueDonut
                  size={130}
                  label={stats.serving + stats.waiting + stats.missing}
                  sublabel="IN QUEUE"
                  segments={[
                    { value: stats.serving, color: '#1d4ed8' },
                    { value: stats.waiting, color: '#f59e0b' },
                    { value: stats.missing, color: '#ef4444' },
                  ]}
                />
                <Text style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>Queue Status</Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { label: 'Serving', value: stats.serving, color: '#1d4ed8' },
                    { label: 'Waiting', value: stats.waiting, color: '#f59e0b' },
                    { label: 'Missing', value: stats.missing, color: '#ef4444' },
                  ].map((item) => {
                    const total = stats.serving + stats.waiting + stats.missing || 1;
                    return (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                        <Text style={{ fontSize: 10, color: '#64748b' }}>{item.label}</Text>
                        <Text style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.value}</Text>
                        <Text style={{ fontSize: 9, color: '#94a3b8' }}>({Math.round((item.value / total) * 100)}%)</Text>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lane donut */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <QueueDonut
                  size={130}
                  label={stats.priority + stats.regular}
                  sublabel="CLIENTS"
                  segments={[
                    { value: stats.priority, color: '#b45309' },
                    { value: stats.regular, color: '#1d4ed8' },
                  ]}
                />
                <Text style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>Client Type</Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { label: 'Priority', value: stats.priority, color: '#b45309' },
                    { label: 'Regular', value: stats.regular, color: '#1d4ed8' },
                  ].map((item) => {
                    const total = (stats.priority + stats.regular) || 1;
                    return (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                        <Text style={{ fontSize: 10, color: '#64748b' }}>{item.label}</Text>
                        <Text style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.value}</Text>
                        <Text style={{ fontSize: 9, color: '#94a3b8' }}>({Math.round((item.value / total) * 100)}%)</Text>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Divider ────────────────────────────────────────── */}
            <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 10px' }} />

            {/* ── Row 2: Log severity horizontal bars ───────────── */}
            <Text style={{ fontSize: 10, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Log Severity (last 20)
            </Text>
            {(() => {
              const bars = [
                { label: 'Info', color: '#3b82f6', count: logSeverityCounts.Info },
                { label: 'Notice', color: '#a855f7', count: logSeverityCounts.Notice },
                { label: 'Warning', color: '#f59e0b', count: logSeverityCounts.Warning },
                { label: 'Critical', color: '#ef4444', count: logSeverityCounts.Critical },
              ];
              const maxCount = Math.max(...bars.map((b) => b.count), 1);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {bars.map((bar) => (
                    <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 10, color: bar.color, fontWeight: 700, width: 46, flexShrink: 0, textAlign: 'right' }}>{bar.label}</Text>
                      <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                        <div style={{
                          width: bar.count > 0 ? `${Math.max((bar.count / maxCount) * 100, 6)}%` : '0%',
                          height: '100%',
                          background: bar.color,
                          borderRadius: 4,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                      <Text style={{ fontSize: 10, fontWeight: 700, color: bar.color, width: 18, textAlign: 'right', flexShrink: 0 }}>{bar.count}</Text>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </Col>

        {/* ── Assisted by Officers bar chart ─────────────────────── */}
        <Col xs={24} md={7}>
          <Card
            bordered={false}
            size="small"
            title={
              <Space>
                <LikeOutlined style={{ color: '#7c3aed' }} />
                <span style={{ fontWeight: 700 }}>Assisted by Officer</span>
                <Tag style={{ margin: 0, fontSize: 10 }} color="purple">{assistedItems.length} total</Tag>
              </Space>
            }
            style={{ height: '100%' }}
          >
            {assistedByOfficer.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>No assisted transactions recorded yet.</Text>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {assistedByOfficer.map((row) => {
                  const maxCount = assistedByOfficer[0]?.count || 1;
                  const pct = Math.max(Math.round((row.count / maxCount) * 100), 6);
                  return (
                    <div key={row.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, flexShrink: 0 }}>{row.count}</Text>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                          borderRadius: 6,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: 4, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                  <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                    Total: {assistedItems.length} assisted client{assistedItems.length !== 1 ? 's' : ''}
                  </Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* ── Counter cards ──────────────────────────────────────────── */}
        <Col xs={24} xl={16}>
          <Card
            bordered={false}
            title={
              <Space>
                <NotificationOutlined style={{ color: '#1d4ed8' }} />
                <span style={{ fontWeight: 700 }}>Counter Status</span>
                <Badge count={counterCards.length} style={{ background: '#1d4ed8' }} />
              </Space>
            }
            bodyStyle={{ padding: '12px 16px' }}
          >
            {counterCards.length === 0 ? (
              <Text type="secondary">No active counter cards configured. Add them in Settings → Queue Display.</Text>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
                alignItems: 'stretch',
              }}>
                {cardData.map((card) => (
                  <div key={card._id} style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: '#ffffff',
                    boxShadow: '0 2px 14px -4px rgba(15,23,42,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                      {/* Card header */}
                      <div style={{
                        background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)',
                        padding: '8px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <Text style={{ color: '#fff', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {card.transactionName}
                        </Text>
                        <Tag style={{ margin: 0, fontSize: 11, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>
                          {card.waiting} waiting
                        </Tag>
                      </div>

                      {/* Number display */}
                      <div style={{ display: 'flex' }}>
                        {/* Regular lane */}
                        <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <UserOutlined /> Regular
                          </div>
                          <div style={{ fontSize: 30, fontWeight: 900, color: card.servingReg ? '#1d4ed8' : '#94a3b8', lineHeight: 1.1, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {extractNum(card.servingReg?.clientCardNo)}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {card.nextReg
                              ? <>next: <strong style={{ color: '#1d4ed8' }}>{extractNum(card.nextReg.clientCardNo)}</strong></>
                              : <span style={{ opacity: 0.5 }}>no next</span>}
                          </div>
                        </div>

                        {/* Priority lane */}
                        <div style={{ flex: 1, padding: '10px 12px', background: '#fffbf0', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#92400e', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <HeartOutlined /> Priority
                          </div>
                          <div style={{ fontSize: 30, fontWeight: 900, color: card.servingPri ? '#b45309' : '#94a3b8', lineHeight: 1.1, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {extractNum(card.servingPri?.clientCardNo)}
                          </div>
                          <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>
                            {card.nextPri
                              ? <>next: <strong>{extractNum(card.nextPri.clientCardNo)}</strong></>
                              : <span style={{ opacity: 0.5 }}>no next</span>}
                          </div>
                        </div>
                      </div>

                      {/* Assigned officers */}
                      {card.cardOfficers.length > 0 && (
                        <div style={{ padding: '5px 12px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
                          {card.cardOfficers.map((o) => (
                            <Tooltip key={o._id} title={o.position || o.designation}>
                              <Tag
                                style={{ margin: 0, fontSize: 11 }}
                                color={o.status === 'Available' ? 'green' : 'default'}
                              >
                                <span style={{
                                  display: 'inline-block',
                                  width: 6, height: 6,
                                  borderRadius: '50%',
                                  background: o.status === 'Available' ? '#22c55e' : '#94a3b8',
                                  marginRight: 4,
                                  verticalAlign: 'middle',
                                }} />
                                {o.name}
                              </Tag>
                            </Tooltip>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </Col>

        {/* ── Right column ───────────────────────────────────────────── */}
        <Col xs={24} xl={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={14}>
            {/* Missing clients alert */}
            {stats.missing > 0 && (
              <Card
                bordered={false}
                size="small"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}
              >
                <Space>
                  <WarningOutlined style={{ color: '#b91c1c', fontSize: 18 }} />
                  <div>
                    <Text style={{ color: '#b91c1c', fontWeight: 700 }}>{stats.missing} client{stats.missing > 1 ? 's' : ''} missing</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>Check the queue list in the portal.</Text>
                  </div>
                </Space>
              </Card>
            )}

            {/* Recent activity */}
            <Card
              bordered={false}
              size="small"
              title={
                <Space>
                  <ClockCircleOutlined style={{ color: '#7c3aed' }} />
                  <span style={{ fontWeight: 700 }}>Recent Activity</span>
                </Space>
              }
              bodyStyle={{ padding: '8px 16px', maxHeight: 340, overflowY: 'auto' }}
            >
              {recentLogs.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 13 }}>No recent activity recorded.</Text>
              ) : (
                <Timeline
                  style={{ marginTop: 8 }}
                  items={recentLogs.map((log) => ({
                    color: log.severity === 'Critical' || log.severity === 'Warning' ? 'red' : log.severity === 'Notice' ? 'blue' : 'gray',
                    children: (
                      <div style={{ marginBottom: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: 600, display: 'block' }}>{log.action}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{log.actor} · {log.scope}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </AdminShell>
  );
}
