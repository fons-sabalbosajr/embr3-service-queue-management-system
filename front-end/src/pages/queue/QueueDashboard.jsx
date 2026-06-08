import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  ConfigProvider,
  Segmented,
  Switch,
  Tooltip,
  theme as antdTheme,
} from 'antd';
import {
  ArrowLeftOutlined,
  BulbOutlined,
  FullscreenOutlined,
  NotificationOutlined,
  TableOutlined,
  SyncOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { App as AntApp } from 'antd';
import apiClient from '../../api/client';
import emblogo from '../../assets/emblogo.svg';
import bagongPilipinas from '../../assets/bagongpilipinaslogo.png';
import { BRAND, BRAND_SHORT } from '../../theme';
import './QueueDashboard.css';

const CARD_TONES = [
  {
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
    light: {
      surface: 'linear-gradient(145deg, #fffdf7 0%, #fff4da 100%)',
      border: 'rgba(217, 119, 6, 0.18)',
      shadow: 'rgba(217, 119, 6, 0.18)',
      accent: '#d97706',
      accentSoft: 'rgba(217, 119, 6, 0.12)',
      glow: 'rgba(251, 191, 36, 0.24)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(146, 64, 14, 0.42) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(251, 191, 36, 0.22)',
      shadow: 'rgba(180, 83, 9, 0.34)',
      accent: '#fcd34d',
      accentSoft: 'rgba(251, 191, 36, 0.14)',
      glow: 'rgba(245, 158, 11, 0.22)',
    },
  },
  {
    light: {
      surface: 'linear-gradient(145deg, #f7fffb 0%, #def7ec 100%)',
      border: 'rgba(5, 150, 105, 0.18)',
      shadow: 'rgba(5, 150, 105, 0.18)',
      accent: '#059669',
      accentSoft: 'rgba(5, 150, 105, 0.12)',
      glow: 'rgba(52, 211, 153, 0.24)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(6, 95, 70, 0.42) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(52, 211, 153, 0.22)',
      shadow: 'rgba(6, 95, 70, 0.34)',
      accent: '#6ee7b7',
      accentSoft: 'rgba(52, 211, 153, 0.14)',
      glow: 'rgba(16, 185, 129, 0.22)',
    },
  },
  {
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
  {
    light: {
      surface: 'linear-gradient(145deg, #f8fbff 0%, #e6f0ff 100%)',
      border: 'rgba(79, 70, 229, 0.16)',
      shadow: 'rgba(79, 70, 229, 0.18)',
      accent: '#4f46e5',
      accentSoft: 'rgba(79, 70, 229, 0.12)',
      glow: 'rgba(129, 140, 248, 0.22)',
    },
    dark: {
      surface: 'linear-gradient(145deg, rgba(67, 56, 202, 0.42) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: 'rgba(129, 140, 248, 0.22)',
      shadow: 'rgba(67, 56, 202, 0.34)',
      accent: '#c7d2fe',
      accentSoft: 'rgba(129, 140, 248, 0.14)',
      glow: 'rgba(99, 102, 241, 0.22)',
    },
  },
];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function QueueDashboard() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const now = useClock();
  const [dark, setDark] = useState(false);
  const [density, setDensity] = useState('Comfortable');
  const [config, setConfig] = useState({
    refreshSeconds: 4,
    density: 'Comfortable',
    soundAlerts: true,
    counterCards: [],
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

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
        const { data } = await apiClient.get('/queue-display');
        if (!mounted) {
          return;
        }

        setConfig(data.config);
        setDensity(data.config.density || 'Comfortable');
      } catch (_error) {
        if (mounted) {
          message.error('Unable to load queue display configuration.');
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

  const cardPad = density === 'Compact' ? 14 : 20;
  const counterCards = useMemo(
    () =>
      (config.counterCards || [])
        .filter((item) => item.active)
        .sort((a, b) => a.order - b.order),
    [config]
  );

  const upNextRows = useMemo(
    () =>
      counterCards.map((card, index) => ({
        key: card._id,
        lane: index + 1,
        transaction: card.transactionName,
        status: 'Queued',
      })),
    [counterCards]
  );

  const toneForIndex = (index) => {
    const tone = CARD_TONES[index % CARD_TONES.length];
    return tone[themeMode];
  };

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

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div className="queue-clock">
              {now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>

            <Segmented
              options={['Comfortable', 'Compact']}
              value={density}
              onChange={setDensity}
            />

            <Tooltip title={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
              <Switch
                checked={dark}
                onChange={toggleTheme}
                checkedChildren={<BulbOutlined />}
                unCheckedChildren={<SunOutlined />}
              />
            </Tooltip>

            <Tooltip title="Fullscreen">
              <Button shape="circle" icon={<FullscreenOutlined />} onClick={enterFullscreen} />
            </Tooltip>

            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/home')}>
              Console
            </Button>
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="queue-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div>
              <div className="queue-title" style={{ marginBottom: 4 }}>
                Public Serving Board
              </div>
              <div className="queue-subtitle" style={{ letterSpacing: 1.5 }}>
                All counter cards are managed from Admin Side &gt; Queue Display
              </div>
            </div>
            <Badge
              status={loadingConfig ? 'processing' : 'success'}
              text={loadingConfig ? 'Syncing display...' : `Synced every ${config.refreshSeconds || 4}s`}
            />
          </div>

          <div className="queue-main-grid">
            <div>
              <div className="queue-counters-grid">
                {counterCards.map((card, index) => (
                  <div
                    key={card._id}
                    className={`now-serving-card ${themeMode} queue-counter-card`}
                    style={{
                      padding: cardPad,
                      animationDelay: `${index * 0.05}s`,
                      '--card-surface': toneForIndex(index).surface,
                      '--card-border': toneForIndex(index).border,
                      '--card-shadow': toneForIndex(index).shadow,
                      '--card-accent': toneForIndex(index).accent,
                      '--card-accent-soft': toneForIndex(index).accentSoft,
                      '--card-glow': toneForIndex(index).glow,
                    }}
                  >
                    <div className="queue-card-topline">
                      <span className="counter-label">{`Counter ${index + 1}`}</span>
                      <span className="queue-card-sync">
                        <SyncOutlined className="stat-icon" spin={loadingConfig} style={{ fontSize: 18 }} />
                      </span>
                    </div>
                    <div
                      className="queue-card-transaction"
                      style={{ fontSize: density === 'Compact' ? 24 : 30 }}
                    >
                      {card.transactionName}
                    </div>
                    <div className="queue-serving-label">Serving</div>
                    <div className="queue-card-footer">
                      <span className="queue-card-chip">Public View</span>
                      <span className="queue-card-chip">Live Sync</span>
                    </div>
                  </div>
                ))}
              </div>

              {!counterCards.length ? (
                <div className={`now-serving-card ${themeMode}`} style={{ padding: cardPad, marginTop: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No Counter Cards Configured</div>
                  <div style={{ opacity: 0.72 }}>
                    Add transaction cards in Admin Side &gt; Queue Dashboard Display Settings to populate this board.
                  </div>
                </div>
              ) : null}
            </div>

            <aside className={`queue-upnext-panel ${themeMode}`}>
              <div className="queue-upnext-header">
                <TableOutlined style={{ marginRight: 8 }} />
                Up Next Table
              </div>
              {upNextRows.length ? (
                <div className="queue-upnext-table-wrap">
                <table className="queue-upnext-table">
                  <thead>
                    <tr>
                      <th>Counter</th>
                      <th>Transaction</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upNextRows.map((row) => (
                      <tr key={row.key}>
                        <td>
                          <span className="queue-upnext-counter">{`#${row.lane}`}</span>
                        </td>
                        <td>
                          <div className="queue-upnext-transaction">{row.transaction}</div>
                        </td>
                        <td>
                          <span className="queue-upnext-badge">{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className="queue-upnext-empty">
                  No transactions are configured yet. Add counter cards in the admin side to populate this table.
                </div>
              )}
            </aside>
          </div>

          {/* Marquee */}
          <div className={`queue-marquee ${themeMode}`}>
            <span>
              <NotificationOutlined style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Welcome to EMB R3 Service Queue Management System &nbsp;•&nbsp; Please
              watch the board and proceed to your counter when your number is called
              &nbsp;•&nbsp; Thank you for your patience &nbsp;•&nbsp;
            </span>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}


