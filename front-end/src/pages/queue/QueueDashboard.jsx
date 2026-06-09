import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  ConfigProvider,
  Switch,
  Table,
  Tag,
  Tooltip,
  theme as antdTheme,
} from 'antd';
import {
  ArrowLeftOutlined,
  BulbOutlined,
  FullscreenOutlined,
  HeartOutlined,
  NotificationOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App as AntApp } from 'antd';
import apiClient from '../../api/client';
import emblogo from '../../assets/emblogo.svg';
import bagongPilipinas from '../../assets/bagongpilipinaslogo.png';
import { BRAND, BRAND_SHORT } from '../../theme';
import './QueueDashboard.css';

// ── Named branded tones — one per transaction family ───────────────────────
const NAMED_CARD_TONES = {
  'ECC_CNC': {
    // Green · Light-green gradient header
    headerGradient: 'linear-gradient(120deg, #15803d 0%, #4ade80 100%)',
    light: {
      surface: 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%)',
      border: 'rgba(21, 128, 61, 0.18)',
      shadow: 'rgba(21, 128, 61, 0.18)',
      accent: '#16a34a',
      accentSoft: 'rgba(21, 128, 61, 0.10)',
      glow: 'rgba(74, 222, 128, 0.24)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(20, 83, 45, 0.42) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(74, 222, 128, 0.25)',
      shadow: 'rgba(20, 83, 45, 0.36)',
      accent: '#4ade80',
      accentSoft: 'rgba(74, 222, 128, 0.12)',
      glow: 'rgba(34, 197, 94, 0.26)',
    },
  },
  'PTO_DP_PCO': {
    // Blue · Purple gradient header
    headerGradient: 'linear-gradient(120deg, #1d4ed8 0%, #7c3aed 100%)',
    light: {
      surface: 'linear-gradient(145deg, #eff6ff 0%, #f3e8ff 100%)',
      border: 'rgba(79, 70, 229, 0.18)',
      shadow: 'rgba(79, 70, 229, 0.18)',
      accent: '#4f46e5',
      accentSoft: 'rgba(79, 70, 229, 0.10)',
      glow: 'rgba(139, 92, 246, 0.24)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(67, 56, 202, 0.38) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(167, 139, 250, 0.26)',
      shadow: 'rgba(67, 56, 202, 0.34)',
      accent: '#a78bfa',
      accentSoft: 'rgba(167, 139, 250, 0.12)',
      glow: 'rgba(99, 102, 241, 0.24)',
    },
  },
  'HAZ': {
    // Orange · Red gradient header
    headerGradient: 'linear-gradient(120deg, #ea580c 0%, #dc2626 100%)',
    light: {
      surface: 'linear-gradient(145deg, #fff7ed 0%, #fee2e2 100%)',
      border: 'rgba(234, 88, 12, 0.18)',
      shadow: 'rgba(234, 88, 12, 0.18)',
      accent: '#dc2626',
      accentSoft: 'rgba(234, 88, 12, 0.10)',
      glow: 'rgba(248, 113, 113, 0.24)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(153, 27, 27, 0.38) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(252, 165, 165, 0.24)',
      shadow: 'rgba(185, 28, 28, 0.34)',
      accent: '#fca5a5',
      accentSoft: 'rgba(252, 165, 165, 0.12)',
      glow: 'rgba(239, 68, 68, 0.26)',
    },
  },
  'TECH_CONF': {
    // Black · Brown gradient header
    headerGradient: 'linear-gradient(120deg, #1c1917 0%, #92400e 100%)',
    light: {
      surface: 'linear-gradient(145deg, #fafaf9 0%, #fef3c7 100%)',
      border: 'rgba(120, 53, 15, 0.18)',
      shadow: 'rgba(120, 53, 15, 0.18)',
      accent: '#92400e',
      accentSoft: 'rgba(120, 53, 15, 0.10)',
      glow: 'rgba(180, 83, 9, 0.22)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(69, 26, 3, 0.44) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(253, 186, 116, 0.22)',
      shadow: 'rgba(120, 53, 15, 0.36)',
      accent: '#fcd34d',
      accentSoft: 'rgba(253, 186, 116, 0.12)',
      glow: 'rgba(234, 88, 12, 0.22)',
    },
  },
  'COMPANY_REG': {
    // Yellow · Orange gradient header
    headerGradient: 'linear-gradient(120deg, #ca8a04 0%, #ea580c 100%)',
    light: {
      surface: 'linear-gradient(145deg, #fefce8 0%, #fff7ed 100%)',
      border: 'rgba(202, 138, 4, 0.18)',
      shadow: 'rgba(202, 138, 4, 0.18)',
      accent: '#d97706',
      accentSoft: 'rgba(202, 138, 4, 0.10)',
      glow: 'rgba(251, 191, 36, 0.26)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(133, 77, 14, 0.38) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(253, 224, 71, 0.22)',
      shadow: 'rgba(161, 98, 7, 0.34)',
      accent: '#fde047',
      accentSoft: 'rgba(253, 224, 71, 0.12)',
      glow: 'rgba(234, 179, 8, 0.24)',
    },
  },
  'SMR_CMR': {
    // Violet · Indigo gradient header
    headerGradient: 'linear-gradient(120deg, #7c3aed 0%, #4338ca 100%)',
    light: {
      surface: 'linear-gradient(145deg, #f5f3ff 0%, #e0e7ff 100%)',
      border: 'rgba(124, 58, 237, 0.18)',
      shadow: 'rgba(124, 58, 237, 0.18)',
      accent: '#6d28d9',
      accentSoft: 'rgba(124, 58, 237, 0.10)',
      glow: 'rgba(167, 139, 250, 0.26)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(91, 33, 182, 0.38) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(196, 181, 253, 0.22)',
      shadow: 'rgba(109, 40, 217, 0.34)',
      accent: '#c4b5fd',
      accentSoft: 'rgba(196, 181, 253, 0.12)',
      glow: 'rgba(124, 58, 237, 0.26)',
    },
  },
};

// Fallback rotating tones for unrecognised transaction names
const FALLBACK_TONES = [
  {
    headerGradient: 'linear-gradient(120deg, #2563eb 0%, #0ea5e9 100%)',
    light: {
      surface: 'linear-gradient(145deg, #ffffff 0%, #eef6ff 100%)',
      border: 'rgba(37, 99, 235, 0.18)',
      shadow: 'rgba(37, 99, 235, 0.18)',
      accent: '#2563eb',
      accentSoft: 'rgba(37, 99, 235, 0.12)',
      glow: 'rgba(96, 165, 250, 0.22)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(30, 64, 175, 0.38) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(96, 165, 250, 0.28)',
      shadow: 'rgba(30, 64, 175, 0.34)',
      accent: '#93c5fd',
      accentSoft: 'rgba(147, 197, 253, 0.14)',
      glow: 'rgba(59, 130, 246, 0.24)',
    },
  },
  {
    headerGradient: 'linear-gradient(120deg, #0d9488 0%, #06b6d4 100%)',
    light: {
      surface: 'linear-gradient(145deg, #f0fdfa 0%, #ccfbf1 100%)',
      border: 'rgba(13, 148, 136, 0.18)',
      shadow: 'rgba(13, 148, 136, 0.18)',
      accent: '#0d9488',
      accentSoft: 'rgba(13, 148, 136, 0.12)',
      glow: 'rgba(45, 212, 191, 0.24)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(13, 148, 136, 0.38) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(45, 212, 191, 0.26)',
      shadow: 'rgba(13, 148, 136, 0.34)',
      accent: '#2dd4bf',
      accentSoft: 'rgba(45, 212, 191, 0.14)',
      glow: 'rgba(20, 184, 166, 0.28)',
    },
  },
  {
    headerGradient: 'linear-gradient(120deg, #be185d 0%, #9333ea 100%)',
    light: {
      surface: 'linear-gradient(145deg, #fff8fb 0%, #fde7f3 100%)',
      border: 'rgba(190, 24, 93, 0.16)',
      shadow: 'rgba(190, 24, 93, 0.18)',
      accent: '#be185d',
      accentSoft: 'rgba(190, 24, 93, 0.12)',
      glow: 'rgba(244, 114, 182, 0.22)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(131, 24, 67, 0.42) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(244, 114, 182, 0.22)',
      shadow: 'rgba(131, 24, 67, 0.34)',
      accent: '#f9a8d4',
      accentSoft: 'rgba(244, 114, 182, 0.14)',
      glow: 'rgba(236, 72, 153, 0.22)',
    },
  },
];

function getNamedToneKey(name) {
  const u = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, ' ').trim();
  if (u.includes('ECC') || u.includes('CNC')) return 'ECC_CNC';
  if (u.includes('PTO') || u.includes('DP') || u.includes('PCO')) return 'PTO_DP_PCO';
  if (u.includes('HWG') || u.includes('HAZ')) return 'HAZ';
  if (u.includes('TECHNICAL') || u.includes('CONFERENCE')) return 'TECH_CONF';
  if (u.includes('COMPANY') || u.includes('REGISTRATION') || u.includes('CRS')) return 'COMPANY_REG';
  if (u.includes('SMR') || u.includes('CMR')) return 'SMR_CMR';
  return null;
}

function toneForCategory(name, themeMode) {
  const key = getNamedToneKey(name);
  if (key && NAMED_CARD_TONES[key]) {
    const t = NAMED_CARD_TONES[key];
    return { ...t[themeMode], headerGradient: t.headerGradient };
  }
  // Fallback: hash into FALLBACK_TONES
  let hash = 0;
  const norm = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  for (const ch of norm) hash = (hash * 31 + ch.charCodeAt(0)) % FALLBACK_TONES.length;
  const fb = FALLBACK_TONES[hash];
  return { ...fb[themeMode], headerGradient: fb.headerGradient };
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function normalizeQueueText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractTicketNumber(cardNo) {
  const value = String(cardNo || '').trim();
  if (!value) {
    return '--';
  }

  const digitGroups = value.match(/(\d+)/g);
  if (!digitGroups?.length) {
    return value;
  }

  const lastGroup = digitGroups[digitGroups.length - 1];
  return lastGroup.slice(-2).padStart(2, '0');
}

function isPriorityClient(clientStatus) {
  const status = normalizeQueueText(clientStatus);
  return status.includes('priority') || status.includes('senior') || status.includes('pwd');
}

function matchesQueueLabel(item, cardName) {
  const target = normalizeQueueText(cardName);
  if (!target) {
    return false;
  }

  const candidates = [item.eccCnc, item.transactionStatus, item.specificInquiry, item.clientStatus]
    .map(normalizeQueueText)
    .filter(Boolean);

  return candidates.some((candidate) => candidate === target || candidate.includes(target) || target.includes(candidate));
}

const INQUIRY_NAME_MAP = {
  ECC: 'Environmental Compliance Certificate',
  CNC: 'Certificate of Non-Coverage',
  PTO: 'Permit to Operate',
  DP: 'Discharge Permit',
  PCO: 'Pollution Control Officer Accreditation',
  SMR: 'Self-Monitoring Report',
  CMR: 'Compliance Monitoring Report',
  CRS: 'Company Registration System',
};

function expandInquiryName(value) {
  const raw = String(value || '').trim();
  return INQUIRY_NAME_MAP[raw] || raw || '-';
}

function pickServingAndUpNext(items) {
  if (!items.length) {
    return { serving: null, next: null };
  }

  const sortedItems = [...items].sort((left, right) => {
    const rank = {
      CALL: 0,
      'Waiting to Call': 1,
      Queued: 2,
      'CLIENT MISSING': 3,
    };

    const rankDifference = (rank[left.clientCallStatus] ?? 9) - (rank[right.clientCallStatus] ?? 9);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return new Date(left.createdAt) - new Date(right.createdAt);
  });

  const servingIndex = sortedItems.findIndex((item) => item.clientCallStatus === 'CALL');
  if (servingIndex < 0) {
    return {
      serving: null,
      next: sortedItems[0] || null,
    };
  }

  // "Next in line" must be a waiting client — skip any concurrent CALL entries
  // that belong to other officers serving the same counter card.
  const next = sortedItems.find((item) => item.clientCallStatus !== 'CALL') || null;

  return {
    serving: sortedItems[servingIndex] || null,
    next,
  };
}

function playDashboardTone(enabled) {
  if (!enabled || typeof window === 'undefined') {
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const audioContext = new AudioCtx();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.1, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.36);
  oscillator.onended = () => audioContext.close().catch(() => {});
}

function speakDashboardCall(text, enabled) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export default function QueueDashboard() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const now = useClock();
  const [dark, setDark] = useState(false);
  const [config, setConfig] = useState({
    refreshSeconds: 4,
    density: 'Comfortable',
    soundAlerts: true,
    boardTitle: 'Queue Dashboard',
    boardSubtitle: 'Now Serving',
    counterCards: [],
  });
  const [queueItems, setQueueItems] = useState([]);
  const [queueOfficers, setQueueOfficers] = useState([]);
  const [screeningRows, setScreeningRows] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const announcedServingKeysRef = useRef(new Set());

  const writeQueueLog = async (payload) => {
    try {
      await apiClient.post('/app-logs', {
        actor: 'Queue Dashboard',
        source: 'Queue Dashboard',
        severity: 'Info',
        ...payload,
      });
    } catch (_error) {
      // Non-blocking activity tracking.
    }
  };

  useEffect(() => {
    writeQueueLog({
      action: 'Opened queue dashboard',
      scope: 'Queue Dashboard',
      details: 'Queue dashboard view loaded.',
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadQueueDisplay = async () => {
      try {
        const [{ data: displayData }, { data: queueData }] = await Promise.all([
          apiClient.get('/queue-display'),
          apiClient.get('/transaction-monitoring/public-summary'),
        ]);
        if (!mounted) {
          return;
        }

        setConfig(displayData.config);
        setQueueItems(queueData.queueItems || []);

        // Officers list — fails gracefully if the user lacks admin access
        try {
          const { data: officerData } = await apiClient.get('/queue-officers');
          setQueueOfficers(officerData.officers || []);
        } catch {
          // Non-admin viewers simply won't see officer presence dots
        }

        // Build screening officer rows from live queue data
        const nowServing = (queueData.queueItems || [])
          .filter((item) => item.clientCallStatus === 'CALL');
        const rowsMap = {};
        nowServing.forEach((item) => {
          const officerKey = item.screeningOfficer || 'Unknown';
          const inquiryKey = item.specificInquiry || item.eccCnc || item.transactionStatus;
          const key = `${officerKey}::${inquiryKey}`;
          if (!rowsMap[key]) {
            rowsMap[key] = {
              key,
              officerName: officerKey,
              inquiry: inquiryKey,
              numbers: [],
              lanes: [],
            };
          }
          rowsMap[key].numbers.push(item.clientCardNo);
          rowsMap[key].lanes.push(
            isPriorityClient(item.clientStatus) ? 'priority' : 'regular'
          );
        });
        setScreeningRows(Object.values(rowsMap));
      } catch (_error) {
        if (mounted) {
          message.error('Unable to load queue dashboard data.');
        }
      } finally {
        if (mounted) {
          setLoadingConfig(false);
        }
      }
    };

    loadQueueDisplay();

    const interval = setInterval(loadQueueDisplay, (config.refreshSeconds || 4) * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [config.refreshSeconds]);

  const themeMode = dark ? 'dark' : 'light';

  const configTheme = useMemo(
    () => ({
      algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#1d4ed8',
        borderRadius: 12,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
      },
    }),
    [dark]
  );

  const counterCards = useMemo(
    () =>
      (config.counterCards || [])
        .filter((item) => item.active)
        .sort((a, b) => a.order - b.order),
    [config]
  );

  const queueByCard = useMemo(
    () =>
      counterCards.map((card) => {
        const matchingItems = queueItems.filter((item) => matchesQueueLabel(item, card.transactionName));
        const regularQueue = matchingItems.filter((item) => !isPriorityClient(item.clientStatus));
        const priorityQueue = matchingItems.filter((item) => isPriorityClient(item.clientStatus));
        const regularState = pickServingAndUpNext(regularQueue);
        const priorityState = pickServingAndUpNext(priorityQueue);
        const nextCandidates = [regularState.next, priorityState.next]
          .filter(Boolean)
          .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));

        return {
          cardId: card._id,
          regular: regularState,
          priority: priorityState,
          nextCandidate: nextCandidates[0] || null,
        };
      }),
    [counterCards, queueItems]
  );

  const upNextRows = useMemo(
    () =>
      counterCards.map((card) => {
        const queueState = queueByCard.find((item) => item.cardId === card._id);
        const regularNext = queueState?.regular?.next || null;
        const priorityNext = queueState?.priority?.next || null;
        const matchingOfficers = queueOfficers
          .filter((officer) => normalizeQueueText(officer.assignedTransaction) === normalizeQueueText(card.transactionName))
          .sort((left, right) => {
            if (left.status === right.status) {
              return left.name.localeCompare(right.name);
            }

            return left.status === 'Available' ? -1 : 1;
          });
        const primaryOfficer = matchingOfficers[0] || null;

        return {
          key: card._id,
          transaction: card.transactionName,
          officerName: primaryOfficer?.name || 'No officer assigned',
          officerStatus: primaryOfficer?.status || 'Offline',
          regularNext: regularNext ? extractTicketNumber(regularNext.clientCardNo) : null,
          priorityNext: priorityNext ? extractTicketNumber(priorityNext.clientCardNo) : null,
        };
      }),
    [counterCards, queueByCard, queueOfficers]
  );

  const screeningTableRows = useMemo(
    () =>
      screeningRows.map((row) => {
        const matchingOfficer = queueOfficers.find(
          (officer) => normalizeQueueText(officer.name) === normalizeQueueText(row.officerName)
        );

        return {
          ...row,
          officerStatus: matchingOfficer?.isOnline ? 'Available' : 'Not Available',
          inquiry: expandInquiryName(row.inquiry),
        };
      }),
    [queueOfficers, screeningRows]
  );

  const screeningColumns = useMemo(
    () => [
      {
        title: 'Officer / Inquiry',
        key: 'officerInquiry',
        render: (_, row) => (
          <div className="queue-screening-officer-cell">
            <span className={`queue-upnext-live-dot ${row.officerStatus === 'Available' ? 'online' : 'offline'}`} />
            <div className="queue-screening-officer-block">
              <span className="queue-screening-officer-name">{row.officerName}</span>
              <span className="queue-screening-officer-inquiry">{row.inquiry}</span>
              <Tag color={row.officerStatus === 'Available' ? 'green' : 'default'}>
                {row.officerStatus}
              </Tag>
            </div>
          </div>
        ),
      },
      {
        title: 'Serving',
        dataIndex: 'numbers',
        key: 'numbers',
        align: 'center',
        render: (numbers = [], row) => (
          <div className="queue-screening-numbers">
            {numbers.map((number, idx) => {
              const lane = row.lanes?.[idx] === 'priority' ? 'priority' : 'regular';
              return (
                <span key={number} className={`queue-screening-num ${lane}`}>{extractTicketNumber(number)}</span>
              );
            })}
          </div>
        ),
      },
    ],
    []
  );

  const currentServingAnnouncements = useMemo(
    () =>
      counterCards.flatMap((card) => {
        const queueState = queueByCard.find((item) => item.cardId === card._id);
        return [queueState?.regular?.serving, queueState?.priority?.serving]
          .filter(Boolean)
          .map((entry) => ({
            key: `${card._id}:${entry._id || entry.clientCardNo}`,
            text: `Now serving number ${extractTicketNumber(entry.clientCardNo)} for ${card.transactionName}. Please proceed to the counter.`,
          }));
      }),
    [counterCards, queueByCard]
  );

  useEffect(() => {
    const currentKeys = new Set(currentServingAnnouncements.map((item) => item.key));
    currentServingAnnouncements.forEach((item) => {
      if (!announcedServingKeysRef.current.has(item.key)) {
        playDashboardTone(config.soundAlerts !== false);
        speakDashboardCall(item.text, config.soundAlerts !== false);
        writeQueueLog({
          action: 'Queue number called on public board',
          scope: 'Queue Dashboard',
          severity: 'Notice',
          details: item.text,
        });
      }
    });
    announcedServingKeysRef.current = currentKeys;
  }, [config.soundAlerts, currentServingAnnouncements]);

  const queueCardRows = Math.max(Math.ceil(counterCards.length / 2), 1);
  const activeLabelCount = Math.max(upNextRows.length, 1);

  const enterFullscreen = () => {
    const enteringFullscreen = !document.fullscreenElement;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }

    writeQueueLog({
      action: enteringFullscreen ? 'Entered fullscreen mode' : 'Exited fullscreen mode',
      scope: 'Queue Dashboard',
      details: 'Queue display fullscreen state changed.',
    });
  };

  const toggleTheme = (checked) => {
    setDark(checked);
    message.destroy();
    message.success(checked ? 'Dark dashboard theme enabled.' : 'Light dashboard theme enabled.');
    writeQueueLog({
      action: checked ? 'Enabled dark theme' : 'Enabled light theme',
      scope: 'Queue Dashboard',
      details: 'Queue dashboard theme preference updated.',
    });
  };

  return (
    <ConfigProvider theme={configTheme}>
      <div className={`queue-root ${themeMode}`}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className={`queue-header ${themeMode}`}>
          <div className="queue-brand">
            <div className="queue-logos">
              <img src={emblogo} alt="EMB" className="queue-logo-emb" />
              <div className="queue-logo-sep" />
              <img src={bagongPilipinas} alt="Bagong Pilipinas" className="queue-logo-bp" />
            </div>
            <div>
              <div className="queue-title">{BRAND_SHORT} — Queue Board</div>
              <div className="queue-subtitle">{BRAND}</div>
            </div>
          </div>

          <div className="queue-header-actions">
            <div className="queue-datetime">
              <span className="queue-clock">
                {now.toLocaleDateString([], {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="queue-datetime-separator">-</span>
              <span className="queue-clock">
                {now.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>

            <Tooltip title={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
              <Switch
                className="queue-theme-switch"
                checked={dark}
                onChange={toggleTheme}
                checkedChildren={<BulbOutlined />}
                unCheckedChildren={<SunOutlined />}
              />
            </Tooltip>

            <Tooltip title="Fullscreen">
              <Button
                className={`queue-header-button ${themeMode}`}
                shape="circle"
                icon={<FullscreenOutlined />}
                onClick={enterFullscreen}
              />
            </Tooltip>

            <Button
              className={`queue-header-button queue-console-button ${themeMode}`}
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/home')}
            >
              Console
            </Button>
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="queue-body">
          <div className="queue-board-heading">
            <div className="queue-board-title-wrap">
              <div
                className="queue-board-title"
                style={config.boardTitleSize ? { fontSize: config.boardTitleSize } : undefined}
              >
                {config.boardTitle || 'Queue Dashboard'}
              </div>
              <div
                className="queue-board-subtitle"
                style={config.boardSubtitleSize ? { fontSize: config.boardSubtitleSize } : undefined}
              >
                {config.boardSubtitle || 'Now Serving'}
              </div>
            </div>
          </div>

          <div
            className="queue-main-grid"
            style={{
              '--queue-card-rows': queueCardRows,
              '--queue-active-labels': activeLabelCount,
            }}
          >
            <div className="queue-left-col">
              <div className="queue-counters-grid">
                {counterCards.map((card, index) => {
                  const tone = toneForCategory(card.transactionName, themeMode);
                  const queueState = queueByCard[index] || {};
                  const nextRow = upNextRows.find((row) => row.key === card._id);
                  return (
                    <div
                      key={card._id}
                      className={`label-card ${themeMode}`}
                      style={{
                        animationDelay: `${index * 0.05}s`,
                        '--card-header-gradient': tone.headerGradient,
                        '--card-surface': tone.surface,
                        '--card-border': tone.border,
                        '--card-shadow': tone.shadow,
                        '--card-accent': tone.accent,
                        '--card-accent-soft': tone.accentSoft,
                        '--card-glow': tone.glow,
                      }}
                    >
                      <div className="label-card-header">
                        <span className={`label-card-title ${themeMode}`}>{card.transactionName}</span>
                      </div>
                      <div className="label-card-numbers">
                        <div className={`number-portrait-card ${themeMode}`}>
                          <div className="portrait-type">
                            <UserOutlined />
                            <span>Regular</span>
                          </div>
                          <div className="portrait-number">
                            {extractTicketNumber(queueState.regular?.serving?.clientCardNo)}
                          </div>
                        </div>
                        <div className={`number-portrait-card priority ${themeMode}`}>
                          <div className="portrait-type">
                            <HeartOutlined />
                            <span>Priority</span>
                          </div>
                          <div className="portrait-number">
                            {extractTicketNumber(queueState.priority?.serving?.clientCardNo)}
                          </div>
                        </div>
                      </div>
                      <div className={`label-card-nextline ${themeMode}`}>
                        <div className="label-card-nextline-title-row">
                          <span className="label-card-nextline-title">Next in Line</span>
                        </div>
                        <div className="label-card-nextline-inline">
                          <div className="label-card-nextline-lane regular ">
                            {/* <span className="label-card-nextline-lane-label">Regular</span> */}
                            <span className="label-card-nextline-lane-dots" aria-hidden="true" />
                            <span className="label-card-nextline-lane-num regular">{nextRow?.regularNext || '--'}</span>
                          </div>
                          <div className="label-card-nextline-sep" aria-hidden="true" />
                          <div className="label-card-nextline-lane priority">
                            {/* <span className="label-card-nextline-lane-label">Priority</span> */}
                            <span className="label-card-nextline-lane-dots" aria-hidden="true" />
                            <span className="label-card-nextline-lane-num priority">{nextRow?.priorityNext || '--'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!counterCards.length ? (
                <div className={`now-serving-card ${themeMode}`} style={{ padding: 20, marginTop: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No Counter Cards Configured</div>
                  <div style={{ opacity: 0.72 }}>
                    Add transaction cards in Admin Side &gt; Queue Dashboard Display Settings to populate this board.
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── Screening Officers Side Panel ─────────────────── */}
            <aside className={`queue-screening-panel ${themeMode}`}>
              <div className="queue-screening-header">
                AVAILABLE OFFICERS
              </div>
              {screeningRows.length ? (
                <Table
                  className={`queue-screening-antd-table ${themeMode}`}
                  columns={screeningColumns}
                  dataSource={screeningTableRows}
                  rowKey="key"
                  pagination={{ pageSize: 10 }}
                  size="small"
                  pagination={{ pageSize: 10, size: 'small', hideOnSinglePage: true }}
                />
              ) : (
                <div className="queue-screening-empty">No officers are currently serving.</div>
              )}
            </aside>

          </div>

          {/* Marquee */}
          {/* <div className={`queue-marquee ${themeMode}`}>
            <span>
              <NotificationOutlined style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Welcome to EMB R3 Service Queue Management System &nbsp;•&nbsp; Please
              watch the board and proceed to your counter when your number is called
              &nbsp;•&nbsp; Thank you for your patience &nbsp;•&nbsp;
            </span>
          </div> */}
        </div>
      </div>
    </ConfigProvider>
  );
}


