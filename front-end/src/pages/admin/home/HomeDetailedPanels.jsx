import {
  BarChartOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  LikeOutlined,
  NotificationOutlined,
  RiseOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Badge, Card, Col, Row, Skeleton, Space, Tag, Timeline, Tooltip, Typography } from 'antd'

const { Text } = Typography

function extractNum(cardNo) {
  const str = String(cardNo || '').trim()
  if (!str) return '--'
  const groups = str.match(/(\d+)/g)
  if (!groups?.length) return str
  return groups[groups.length - 1].slice(-2).padStart(2, '0')
}

function QueueDonut({ segments, size = 130, label, sublabel }) {
  const r = 42
  const cx = size / 2
  const cy = size / 2
  const C = 2 * Math.PI * r
  const total = segments.reduce((sum, seg) => sum + (seg.value || 0), 0) || 1
  let cumulative = 0

  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14} />
      {segments.map((seg, index) => {
        if (!seg.value) return null
        const dashLen = (seg.value / total) * C
        const offset = C - cumulative * (C / total)
        cumulative += seg.value

        return (
          <circle
            key={index}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={14}
            strokeDasharray={`${dashLen} ${C}`}
            strokeDashoffset={offset}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'stroke-dasharray 0.6s ease',
            }}
          />
        )
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={17} fontWeight={800} fill="#0f172a">
        {label ?? total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#64748b" letterSpacing={1}>
        {sublabel ?? 'TOTAL'}
      </text>
    </svg>
  )
}

export default function HomeDetailedPanels({
  assistedByOfficer,
  assistedItems,
  cardData,
  counterCards,
  loading,
  logSeverityCounts,
  recentLogs,
  stats,
}) {
  return (
    <>
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
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : cardData.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 13 }}>No active counters configured.</Text>
            ) : (
              <div>
                {cardData.map((card) => {
                  const maxVal = Math.max(...cardData.map((c) => c.activeCount), 1)
                  const pct = maxVal > 0 ? Math.round((card.activeCount / maxVal) * 100) : 0
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
                        {card.cardOfficers.map((officer) => (
                          <span key={officer._id} style={{ fontSize: 9, color: officer.status === 'Available' ? '#15803d' : '#94a3b8' }}>
                            • {officer.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </Col>

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
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
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
              </div>

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
              </div>
            </div>

            <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 10px' }} />

            <Text style={{ fontSize: 10, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Log Severity (last 20)
            </Text>
            {(() => {
              const bars = [
                { label: 'Info', color: '#3b82f6', count: logSeverityCounts.Info },
                { label: 'Notice', color: '#a855f7', count: logSeverityCounts.Notice },
                { label: 'Warning', color: '#f59e0b', count: logSeverityCounts.Warning },
                { label: 'Critical', color: '#ef4444', count: logSeverityCounts.Critical },
              ]
              const maxCount = Math.max(...bars.map((bar) => bar.count), 1)
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
              )
            })()}
          </Card>
        </Col>

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
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : assistedByOfficer.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>No assisted transactions recorded yet.</Text>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {assistedByOfficer.map((row) => {
                  const maxCount = assistedByOfficer[0]?.count || 1
                  const pct = Math.max(Math.round((row.count / maxCount) * 100), 6)
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
                  )
                })}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
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
            {loading ? (
              <Skeleton active paragraph={{ rows: 9 }} />
            ) : counterCards.length === 0 ? (
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

                    <div style={{ display: 'flex' }}>
                      <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <NotificationOutlined /> Regular
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

                    {card.cardOfficers.length > 0 && (
                      <div style={{ padding: '5px 12px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
                        {card.cardOfficers.map((officer) => (
                          <Tooltip key={officer._id} title={officer.position || officer.designation}>
                            <Tag style={{ margin: 0, fontSize: 11 }} color={officer.status === 'Available' ? 'green' : 'default'}>
                              <span style={{
                                display: 'inline-block',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: officer.status === 'Available' ? '#22c55e' : '#94a3b8',
                                marginRight: 4,
                                verticalAlign: 'middle',
                              }} />
                              {officer.name}
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

        <Col xs={24} xl={8} style={{ display: 'flex' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', minHeight: 100 + '%' }}>
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

            <Card
              bordered={false}
              size="small"
              style={{ flex: 1, minHeight: 0 }}
              title={
                <Space>
                  <ClockCircleOutlined style={{ color: '#7c3aed' }} />
                  <span style={{ fontWeight: 700 }}>Recent Activity</span>
                </Space>
              }
              bodyStyle={{ padding: '8px 16px', height: 340, overflowY: 'auto' }}
            >
              {loading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
              ) : recentLogs.length === 0 ? (
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
          </div>
        </Col>
      </Row>
    </>
  )
}
