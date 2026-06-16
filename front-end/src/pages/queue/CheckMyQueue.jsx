import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FastForwardOutlined,
  IdcardOutlined,
  Loading3QuartersOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  WarningOutlined,
  LoadingOutlined 
} from '@ant-design/icons';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  ConfigProvider,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  theme as antdTheme,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../../api/client';
import bagongPilipinas from '../../assets/bagongpilipinaslogo.png';
import emblogo from '../../assets/emblogo.svg';
import { BRAND_SHORT } from '../../theme';
import './CheckMyQueue.css';

const { Paragraph, Text, Title } = Typography;

const TRACKER_STORAGE_KEY = 'sqms_client_queue_tracker';
const REFRESH_INTERVAL_MS = 2000;

function normalizeQueueText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseTicketNumber(value) {
  const digits = String(value || '').match(/(\d+)/g);
  if (!digits?.length) {
    return '';
  }

  return digits[digits.length - 1].slice(-2).padStart(2, '0');
}

function extractTicketNumber(cardNo) {
  return parseTicketNumber(cardNo) || '--';
}

function isPriorityClient(clientStatus) {
  const status = normalizeQueueText(clientStatus);
  return status.includes('priority') || status.includes('senior') || status.includes('pwd');
}

function laneFromEntry(entry) {
  return isPriorityClient(entry?.clientStatus) ? 'priority' : 'regular';
}

function formatLane(value) {
  return value === 'priority' ? 'Priority' : 'Regular';
}

function queueStatusRank(status) {
  switch (status) {
    case 'CALL':
      return 0;
    case 'Waiting to Call':
      return 1;
    case 'Queued':
      return 2;
    case 'CLIENT MISSING':
      return 3;
    default:
      return 4;
  }
}

function sortQueueItems(items = []) {
  return [...items].sort((left, right) => {
    const rankDifference = queueStatusRank(left.clientCallStatus) - queueStatusRank(right.clientCallStatus);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return new Date(left.createdAt) - new Date(right.createdAt);
  });
}

function findCurrentServing(items = []) {
  return sortQueueItems(items).find((item) => item.clientCallStatus === 'CALL') || null;
}

function findNextTicket(items = []) {
  return sortQueueItems(items).find((item) => item.clientCallStatus !== 'CALL') || null;
}

function readStoredTracker() {
  if (typeof window === 'undefined') {
    return {
      trackedTicket: '',
      trackedEntryId: '',
      trackedTransaction: '',
      trackedLane: 'regular',
    };
  }

  try {
    const raw = window.localStorage.getItem(TRACKER_STORAGE_KEY);
    if (!raw) {
      return {
        trackedTicket: '',
        trackedEntryId: '',
        trackedTransaction: '',
        trackedLane: 'regular',
      };
    }

    const parsed = JSON.parse(raw);
    return {
      trackedTicket: parseTicketNumber(parsed.trackedTicket || ''),
      trackedEntryId: String(parsed.trackedEntryId || ''),
      trackedTransaction: String(parsed.trackedTransaction || ''),
      trackedLane: parsed.trackedLane === 'priority' ? 'priority' : 'regular',
    };
  } catch {
    return {
      trackedTicket: '',
      trackedEntryId: '',
      trackedTransaction: '',
      trackedLane: 'regular',
    };
  }
}

function buildTrackedSnapshot(entry) {
  return {
    trackedEntryId: String(entry?._id || ''),
    trackedTicket: parseTicketNumber(entry?.clientCardNo || ''),
    trackedTransaction: String(entry?.eccCnc || ''),
    trackedLane: laneFromEntry(entry),
  };
}

export default function CheckMyQueue() {
  const { message } = AntApp.useApp();
  const storedTracker = useMemo(() => readStoredTracker(), []);
  const [queueItems, setQueueItems] = useState([]);
  const [queueOfficers, setQueueOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [trackedTicketInput, setTrackedTicketInput] = useState(storedTracker.trackedTicket);
  const [trackedTicket, setTrackedTicket] = useState(storedTracker.trackedTicket);
  const [trackedEntryId, setTrackedEntryId] = useState(storedTracker.trackedEntryId);
  const [trackedTransaction, setTrackedTransaction] = useState(storedTracker.trackedTransaction);
  const [trackedLane, setTrackedLane] = useState(storedTracker.trackedLane);
  const [matchOptions, setMatchOptions] = useState([]);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [reminderOpen, setReminderOpen] = useState(false);
  const missedReminderKeyRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    window.localStorage.setItem(
      TRACKER_STORAGE_KEY,
      JSON.stringify({
        trackedTicket,
        trackedEntryId,
        trackedTransaction,
        trackedLane,
      })
    );
  }, [trackedEntryId, trackedLane, trackedTicket, trackedTransaction]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadPublicQueue = async ({ initial = false } = {}) => {
      if (initial) {
        setLoading(true);
      }

      try {
        const [summaryResponse, officerResponse] = await Promise.all([
          apiClient.get('/transaction-monitoring/public-summary'),
          apiClient.get('/queue-officers/public-summary'),
        ]);

        if (!mounted) {
          return;
        }

        setQueueItems(summaryResponse.data.queueItems || []);
        setQueueOfficers(officerResponse.data.officers || []);
        setLastUpdated(new Date());
      } catch (_error) {
        if (mounted && initial) {
          message.error('Unable to load the queue tracker right now.');
        }
      } finally {
        if (mounted && initial) {
          setLoading(false);
        }
      }
    };

    loadPublicQueue({ initial: true });
    const intervalId = window.setInterval(() => {
      loadPublicQueue();
    }, REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [message]);

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      const [summaryResponse, officerResponse] = await Promise.all([
        apiClient.get('/transaction-monitoring/public-summary'),
        apiClient.get('/queue-officers/public-summary'),
      ]);
      setQueueItems(summaryResponse.data.queueItems || []);
      setQueueOfficers(officerResponse.data.officers || []);
      setLastUpdated(new Date());
    } catch {
      message.error('Unable to refresh queue data.');
    } finally {
      setManualRefreshing(false);
    }
  };

  const availableOfficers = useMemo(
    () =>
      queueOfficers
        .filter((officer) => officer.status === 'Available' && officer.isOnline !== false)
        .sort((left, right) => {
          const transactionDiff = String(left.assignedTransaction || '').localeCompare(String(right.assignedTransaction || ''));
          if (transactionDiff !== 0) {
            return transactionDiff;
          }

          return String(left.name || '').localeCompare(String(right.name || ''));
        }),
    [queueOfficers]
  );

  const officerColumns = useMemo(
    () => [
      {
        title: 'Officer',
        dataIndex: 'name',
        key: 'name',
        render: (value) => (
          <div className="check-queue-officer-cell-main">
            <span className="check-queue-officer-dot available" />
            <span className="check-queue-officer-name">{value || '--'}</span>
          </div>
        ),
      },
      {
        title: 'Inquiry Type',
        dataIndex: 'assignedTransaction',
        key: 'assignedTransaction',
        align: 'right',
        render: (value) => <span className="check-queue-officer-type">{value || '--'}</span>,
      },
    ],
    []
  );

  const inquiryOptions = useMemo(() => {
    const values = new Set();

    queueItems.forEach((item) => {
      if (item.eccCnc) {
        values.add(item.eccCnc);
      }
    });

    queueOfficers.forEach((officer) => {
      if (officer.assignedTransaction) {
        values.add(officer.assignedTransaction);
      }
    });

    if (trackedTransaction) {
      values.add(trackedTransaction);
    }

    return Array.from(values)
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value }));
  }, [queueItems, queueOfficers, trackedTransaction]);

  const ticketMatches = useMemo(() => {
    const normalizedTicket = parseTicketNumber(trackedTicketInput);
    const normalizedInquiry = normalizeQueueText(trackedTransaction);

    if (!normalizedTicket || !normalizedInquiry) {
      return [];
    }

    return sortQueueItems(
      queueItems.filter(
        (item) =>
          extractTicketNumber(item.clientCardNo) === normalizedTicket &&
          normalizeQueueText(item.eccCnc) === normalizedInquiry
      )
    );
  }, [queueItems, trackedTicketInput, trackedTransaction]);

  const trackedEntry = useMemo(() => {
    if (trackedEntryId) {
      const byId = queueItems.find((item) => String(item._id) === String(trackedEntryId));
      if (byId) {
        return byId;
      }
    }

    if (!trackedTicket || !trackedTransaction) {
      return null;
    }

    return sortQueueItems(
      queueItems.filter((item) => (
        extractTicketNumber(item.clientCardNo) === trackedTicket
        && normalizeQueueText(item.eccCnc) === normalizeQueueText(trackedTransaction)
        && laneFromEntry(item) === trackedLane
      ))
    )[0] || null;
  }, [queueItems, trackedEntryId, trackedLane, trackedTicket, trackedTransaction]);

  const effectiveTransaction = trackedEntry?.eccCnc || trackedTransaction;
  const effectiveLane = trackedEntry ? laneFromEntry(trackedEntry) : trackedLane;

  const sameLaneQueue = useMemo(() => {
    if (!effectiveTransaction) {
      return [];
    }

    return sortQueueItems(
      queueItems.filter((item) => (
        normalizeQueueText(item.eccCnc) === normalizeQueueText(effectiveTransaction)
        && laneFromEntry(item) === effectiveLane
      ))
    );
  }, [effectiveLane, effectiveTransaction, queueItems]);

  const currentServing = useMemo(() => findCurrentServing(sameLaneQueue), [sameLaneQueue]);
  const nextTicket = useMemo(() => findNextTicket(sameLaneQueue), [sameLaneQueue]);
  const trackedPosition = useMemo(() => {
    if (!trackedEntry) {
      return -1;
    }

    return sameLaneQueue.findIndex((item) => String(item._id) === String(trackedEntry._id));
  }, [sameLaneQueue, trackedEntry]);

  const queueAheadCount = trackedPosition > 0 ? trackedPosition : 0;

  const trackedStage = useMemo(() => {
    if (!trackedTicket) {
      return 'idle';
    }

    if (matchOptions.length && !trackedEntry) {
      return 'select-match';
    }

    if (!trackedEntry && !effectiveTransaction) {
      return 'not-found';
    }

    if (!trackedEntry) {
      return 'not-found';
    }

    if (trackedEntry.clientCallStatus === 'CLIENT MISSING') {
      return 'missed';
    }

    if (trackedEntry.clientCallStatus === 'CALL') {
      return 'serving';
    }

    if (nextTicket && String(nextTicket._id) === String(trackedEntry._id)) {
      return 'next';
    }

    return 'waiting';
  }, [effectiveTransaction, matchOptions.length, nextTicket, trackedEntry, trackedTicket]);

  useEffect(() => {
    if (!trackedEntry && trackedEntryId) {
      setTrackedEntryId('');
    }
  }, [trackedEntry, trackedEntryId]);

  useEffect(() => {
    if (trackedStage !== 'missed' || !trackedEntry) {
      return;
    }

    const reminderKey = `${trackedEntry._id}:${trackedEntry.clientCallStatus}`;
    if (missedReminderKeyRef.current === reminderKey) {
      return;
    }

    missedReminderKeyRef.current = reminderKey;
    setReminderOpen(true);
  }, [trackedEntry, trackedStage]);

  const queueStageTone = {
    idle: 'default',
    waiting: 'blue',
    next: 'gold',
    serving: 'green',
    missed: 'red',
    'not-found': 'default',
    'select-match': 'processing',
  }[trackedStage];

  const stageHeadline = {
    idle: 'Enter your queue number.',
    waiting: 'Please wait for your turn.',
    next: 'You are next.',
    serving: 'Proceed to the counter now.',
    missed: 'Your number was missed.',
    'not-found': 'Queue number not found.',
    'select-match': 'Choose your queue.',
  }[trackedStage];

  const stageDetail = {
    idle: 'Live updates refresh every 2 seconds.',
    waiting: `${queueAheadCount} ahead of you.`,
    next: 'Please get ready.',
    serving: trackedEntry?.screeningOfficer || 'Please proceed.',
    missed: 'You may still choose to continue below.',
    'not-found': 'Check the number and try again.',
    'select-match': 'Same number found in more than one lane.',
  }[trackedStage];

  const stageIcon = {
    idle: <ClockCircleOutlined className="check-queue-stage-icon anim-float" />,
    waiting: <Loading3QuartersOutlined className="check-queue-stage-icon anim-spin-slow" />,
    next: <FastForwardOutlined className="check-queue-stage-icon anim-pulse" />,
    serving: <CheckCircleOutlined className="check-queue-stage-icon anim-breathe" />,
    missed: <WarningOutlined className="check-queue-stage-icon anim-warn" />,
    'not-found': <IdcardOutlined className="check-queue-stage-icon" />,
    'select-match': <UserSwitchOutlined className="check-queue-stage-icon anim-float" />,
  }[trackedStage];

  const applyTrackedEntry = (entry) => {
    const snapshot = buildTrackedSnapshot(entry);
    setTrackedTicket(snapshot.trackedTicket);
    setTrackedTicketInput(snapshot.trackedTicket);
    setTrackedEntryId(snapshot.trackedEntryId);
    setTrackedTransaction(snapshot.trackedTransaction);
    setTrackedLane(snapshot.trackedLane);
    setMatchOptions([]);
    setReminderOpen(false);
    missedReminderKeyRef.current = '';
  };

  const handleTrackTicket = () => {
    const normalizedTicket = parseTicketNumber(trackedTicketInput);
    if (!normalizedTicket || !trackedTransaction) {
      message.warning('Enter a queue number and inquiry type.');
      return;
    }

    const matches = ticketMatches;

    if (!matches.length) {
      setTrackedTicket(normalizedTicket);
      setTrackedTicketInput(normalizedTicket);
      setTrackedEntryId('');
      setTrackedLane('regular');
      setMatchOptions([]);
      missedReminderKeyRef.current = '';
      message.info('No active queue matches that number and inquiry type right now.');
      return;
    }

    if (matches.length === 1) {
      applyTrackedEntry(matches[0]);
      return;
    }

    setTrackedTicket(normalizedTicket);
    setTrackedTicketInput(normalizedTicket);
    setTrackedEntryId('');
    setTrackedLane('regular');
    setMatchOptions(matches);
    missedReminderKeyRef.current = '';
    message.info('Choose the matching queue entry below.');
  };

  const clearTracker = () => {
    setTrackedTicket('');
    setTrackedTicketInput('');
    setTrackedEntryId('');
    setTrackedTransaction('');
    setTrackedLane('regular');
    setMatchOptions([]);
    setReminderOpen(false);
    missedReminderKeyRef.current = '';
  };

  const themeConfig = useMemo(
    () => ({
      algorithm: antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#166534',
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
      },
    }),
    []
  );

  return (
    <ConfigProvider theme={themeConfig}>
      <div className="check-queue-root">
        <div className="check-queue-backdrop" />
        <div className="check-queue-shell">
          <header className="check-queue-hero">
            <div className="check-queue-logo-slot">
              <img src={emblogo} alt="EMB" className="check-queue-logo" />
            </div>

            <div className="check-queue-hero-center">
              <div className="check-queue-brand">
                <div className="check-queue-eyebrow">{BRAND_SHORT}</div>
                <Title level={4}>Check My Queue</Title>
                <Text className="check-queue-hero-copy">Queue number lookup for public clients.</Text>
              </div>

              <div className="check-queue-hero-meta">
                <Tag color={isOnline ? 'green' : 'red'}>{isOnline ? 'Online' : 'Offline'}</Tag>
                <Text className="check-queue-updated">
                  {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for live queue data'}
                </Text>
              </div>
            </div>

            <div className="check-queue-logo-slot">
              <img src={bagongPilipinas} alt="Bagong Pilipinas" className="check-queue-logo" />
            </div>
          </header>

          <div className="check-queue-main-grid">
            <Card className="check-queue-card check-queue-tracker-card" variant="borderless">
              <div className="check-queue-panel-header">
                <div>
                  <Text className="check-queue-section-label">Queue Number</Text>
                  <Title level={5} style={{ margin: 0 }}>Track your number</Title>
                </div>
              </div>

              <div className="check-queue-form-grid">
                <label>
                  <span>Enter queue number</span>
                  <Input
                    prefix={<IdcardOutlined />}
                    value={trackedTicketInput}
                    onChange={(event) => {
                      setTrackedTicketInput(parseTicketNumber(event.target.value));
                      setMatchOptions([]);
                    }}
                    placeholder="Example: 07"
                    maxLength={2}
                    inputMode="numeric"
                  />
                </label>

                <label>
                  <span>Inquiry type</span>
                  <Select
                    placeholder="Select inquiry type"
                    value={trackedTransaction || undefined}
                    onChange={(value) => {
                      setTrackedTransaction(value);
                      setTrackedEntryId('');
                      setMatchOptions([]);
                    }}
                    options={inquiryOptions}
                    suffixIcon={<ClockCircleOutlined />}
                    showSearch
                    optionFilterProp="label"
                  />
                </label>
              </div>

              <div className="check-queue-toolbar">
                <Button type="primary" onClick={handleTrackTicket}>
                  Track
                </Button>
                <Button onClick={clearTracker}>
                  Clear
                </Button>
                <Button icon={<ReloadOutlined />} loading={manualRefreshing} onClick={handleManualRefresh}>
                  Refresh
                </Button>
              </div>

              {ticketMatches.length > 1 || matchOptions.length ? (
                <div className="check-queue-match-grid">
                  {(matchOptions.length ? matchOptions : ticketMatches).map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      className="check-queue-match-card"
                      onClick={() => applyTrackedEntry(item)}
                    >
                      <strong>Queue #{extractTicketNumber(item.clientCardNo)}</strong>
                      <span>{item.eccCnc}</span>
                      <small>{formatLane(laneFromEntry(item))} • {item.clientCallStatus}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </Card>

            <Card className={`check-queue-card check-queue-status-card stage-${trackedStage}`} variant="borderless">
              {loading ? (
                <div className="check-queue-loading-state">
                  <LoadingOutlined />
                  <span>Loading live queue...</span>
                </div>
              ) : trackedStage === 'idle' ? (
                <div className="check-queue-empty-state">
                  <Empty description="Enter a queue number and inquiry type to start tracking." />
                </div>
              ) : trackedStage === 'not-found' ? (
                <div className="check-queue-empty-state">
                  <Empty description="No active queue matches the number and inquiry type selected." />
                </div>
              ) : (
                <div className="check-queue-status-wrap">
                  <div className="check-queue-status-head">
                    <div className="check-queue-status-copy">
                      <Text className="check-queue-section-label">Status</Text>
                      <div className="check-queue-status-title-row">
                        {stageIcon}
                        <Title level={5} style={{ margin: 0 }}>{stageHeadline}</Title>
                      </div>
                      <Text style={{ fontSize: 11, color: '#475569' }}>{stageDetail}</Text>
                    </div>
                    <Tag color={queueStageTone} className="check-queue-stage-tag">
                      {trackedStage.replace('-', ' ').toUpperCase()}
                    </Tag>
                  </div>

                  <div className="check-queue-summary-grid">
                    <div className="check-queue-summary-item highlight">
                      <div className="check-queue-summary-label">
                        <IdcardOutlined />
                        <span>Your number</span>
                      </div>
                      <strong>{trackedTicket || '--'}</strong>
                      <small>{effectiveTransaction || 'No active queue'}</small>
                    </div>
                    <div className="check-queue-summary-item">
                      <div className="check-queue-summary-label">
                        <UserSwitchOutlined />
                        <span>Now serving</span>
                      </div>
                      <strong>{extractTicketNumber(currentServing?.clientCardNo)}</strong>
                      <small>{currentServing?.screeningOfficer || 'No active call'}</small>
                    </div>
                    <div className="check-queue-summary-item">
                      <div className="check-queue-summary-label">
                        <ClockCircleOutlined />
                        <span>Next</span>
                      </div>
                      <strong>{extractTicketNumber(nextTicket?.clientCardNo)}</strong>
                      <small>{nextTicket ? formatLane(effectiveLane) : 'No one next yet'}</small>
                    </div>
                    <div className="check-queue-summary-item">
                      <div className="check-queue-summary-label">
                        <TeamOutlined />
                        <span>Ahead</span>
                      </div>
                      <strong>{queueAheadCount}</strong>
                      <small>{trackedEntry?.clientCallStatus || 'Not active'}</small>
                    </div>
                    <div className="check-queue-summary-item wide">
                      <div className="check-queue-summary-label">
                        <UserSwitchOutlined />
                        <span>Officer</span>
                      </div>
                      <strong>{trackedEntry?.screeningOfficer || currentServing?.screeningOfficer || '--'}</strong>
                      <small>{formatLane(effectiveLane)}</small>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card className="check-queue-card check-queue-officers-card" variant="borderless">
            <div className="check-queue-panel-header">
              <div>
                <Text className="check-queue-section-label">Serving Officers</Text>
                <Title level={5} style={{ margin: 0 }}>Available officers</Title>
              </div>
            </div>

            {availableOfficers.length ? (
              <Table
                className="check-queue-officer-table"
                rowKey={(officer) => officer._id || `${officer.name}-${officer.assignedTransaction}`}
                columns={officerColumns}
                dataSource={availableOfficers}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No officers available right now" />
            )}
          </Card>
        </div>

        <Modal
          open={reminderOpen}
          title="Queue number missed"
          onCancel={() => setReminderOpen(false)}
          footer={[
            <Button key="stop" onClick={clearTracker}>
              Stop
            </Button>,
            <Button key="continue" type="primary" onClick={() => setReminderOpen(false)}>
              Continue
            </Button>,
          ]}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message="Your number was marked as missed."
            />
            <Paragraph style={{ marginBottom: 0 }}>
              Queue #{trackedTicket || '--'} for {effectiveTransaction || 'your queue'} is no longer in the active call stage.
            </Paragraph>
          </Space>
        </Modal>
      </div>
    </ConfigProvider>
  );
}