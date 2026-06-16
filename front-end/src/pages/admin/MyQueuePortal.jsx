import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  HeartOutlined,
  HistoryOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  NotificationOutlined,
  PlusOutlined,
  StepForwardOutlined,
  UnorderedListOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../../api/client';
import LoadingScreen from '../../components/LoadingScreen';
import { exportToCSV, exportToExcel } from '../../utils/exportData';
import { useAuth } from '../../context/AuthContext';
import AdminShell from './AdminShell';

const { Text } = Typography;
const { TextArea } = Input;

async function getSwal() {
  const mod = await import('sweetalert2')
  return mod.default
}

async function portalToast(options) {
  const Swal = await getSwal()
  const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  })
  return toast.fire(options)
}

// ── Export column definitions ─────────────────────────────────────────────
const QUEUE_EXPORT_COLS = [
  { title: 'Queue No.', dataIndex: 'clientCardNo', exportValue: (v) => String(v || '').replace(/\D/g, '').slice(-2).padStart(2, '0') },
  { title: 'Client Name', dataIndex: 'clientName' },
  { title: 'Client Type', dataIndex: 'clientStatus' },
  { title: 'Counter / Inquiry Type', dataIndex: 'eccCnc' },
  { title: 'Inquiry', dataIndex: 'transactionStatus' },
  { title: 'Specific Inquiry', dataIndex: 'specificInquiry' },
  { title: 'Company / App No.', dataIndex: 'companyOrApplicationNo' },
  { title: 'Queue Status', dataIndex: 'clientCallStatus' },
  { title: 'Created At', dataIndex: 'createdAt', exportValue: (v) => v ? new Date(v).toLocaleString([], { hour12: true }) : '' },
];

const HISTORY_EXPORT_COLS = [
  { title: 'Queue No.', dataIndex: 'clientCardNo', exportValue: (v) => String(v || '').replace(/\D/g, '').slice(-2).padStart(2, '0') },
  { title: 'Client Name', dataIndex: 'clientName' },
  { title: 'Client Type', dataIndex: 'clientStatus' },
  { title: 'Counter / Inquiry Type', dataIndex: 'eccCnc' },
  { title: 'Inquiry', dataIndex: 'transactionStatus' },
  { title: 'Specific Inquiry', dataIndex: 'specificInquiry' },
  { title: 'Company / App No.', dataIndex: 'companyOrApplicationNo' },
  { title: 'Screening Officer', dataIndex: 'screeningOfficer' },
  { title: 'Queue Status', dataIndex: 'clientCallStatus' },
  { title: 'Receipt Date', dataIndex: 'receiptDate' },
  { title: 'Receipt Time', dataIndex: 'receiptTime' },
  { title: 'Created At', dataIndex: 'createdAt', exportValue: (v) => v ? new Date(v).toLocaleString([], { hour12: true }) : '' },
];

const INQUIRY_OPTIONS_BY_TRANSACTION = {
  'ECC/CNC': [
    'Screening Only (Inquiry/Consultation)',
    'Application Received',
    'Application Processed',
    'Permit / Clearance / Certificate Issued',
  ],
  'PTO/DP/PCO': [
    'Screening Only (Inquiry/Consultation)',
    'Application Received',
    'Application Processed',
    'Permit / Clearance / Certificate Issued',
  ],
  'PTO/DP': [
    'Screening Only (Inquiry/Consultation)',
    'Application Received',
    'Application Processed',
    'Permit / Clearance / Certificate Issued',
  ],
  PCO: [
    'Screening Only (Inquiry/Consultation)',
    'Application Received',
    'Application Processed',
    'Permit / Clearance / Certificate Issued',
  ],
  HAZ: [
    'Screening Only (Inquiry/Consultation)',
    'Application Received',
    'Application Processed',
    'Permit / Clearance / Certificate Issued',
  ],
  'OTHER PERMITS': [
    'Screening Only (Inquiry/Consultation)',
    'Application Received',
    'Application Processed',
    'Permit / Clearance / Certificate Issued',
  ],
  'HWG ID': [
    'Screening Only (Inquiry/Consultation)',
    'Application Received',
    'Application Processed',
    'Permit / Clearance / Certificate Issued',
  ],
  'COMPANY REGISTRATION': [
    'Screening Only (Inquiry/Consultation)',
    'Registration Process',
    'Registration Approved',
  ],
  'TECHNICAL CONFERENCE': [
    'Inquiry / Consultation',
    'Technical Conference Conducted',
    'Paid Penalty / Settled',
  ],
  'SMR/CMR': [
    'Screening Only (Inquiry/Consultation)',
    'Report Evaluated',
  ],
};

const SPECIFIC_INQUIRY_OPTIONS = [
  'ECC',
  'CNC',
  'PTO',
  'DP',
  'HWG ID',
  'PCO',
  'CRS',
  'SMR',
  'CMR',
  'Technical Conference',
].map((value) => ({ value, label: value }));

// ── Completion modal: triggers & requirements ──────────────────────────────
const COMPLETION_TRIGGER_INQUIRY_STATUSES = [
  'Application Received',
  'Application Processed',
  'Permit / Clearance / Certificate Issued',
];

// Returns what additional data the officer must supply before marking Done/Assisted:
//   'paymentDateTime'  — Date + Time of Payment Receipt
//   'paymentDate'      — Date of Payment Receipt only
//   'reportDate'       — Date of Report Submission
//   'companyRegId'     — Company Registration ID
//   null               — no extra data required
function getCompletionRequirement(entry) {
  if (!entry) return null;
  const grp = normalizeTransactionGroup(entry.eccCnc);
  const inquiry = String(entry.transactionStatus || '');

  // Inquiry / Consultation transactions never require payment-receipt data.
  if (/inquiry|consultation|screening only/i.test(inquiry)) {
    return null;
  }

  if (grp === 'ECC/CNC' || grp === 'PTO/DP/PCO' || grp === 'HWG ID') {
    return COMPLETION_TRIGGER_INQUIRY_STATUSES.includes(inquiry) ? 'paymentDateTime' : null;
  }
  if (grp === 'TECHNICAL CONFERENCE') return 'paymentDate';
  if (grp === 'SMR/CMR') return 'reportDate';
  if (grp === 'COMPANY REGISTRATION') return 'companyRegId';
  return null;
}

function normalizeTransactionGroup(value) {
  return String(value || '').trim().toUpperCase();
}

function isPriorityClientType(clientStatus) {
  return typeof clientStatus === 'string'
    && ['priority', 'senior', 'pwd'].some((keyword) => clientStatus.toLowerCase().includes(keyword));
}

function nextQueueNumberForInquiry(entries, generalInquiry, clientStatus) {
  const targetInquiry = String(generalInquiry || '').trim();
  const targetPriority = isPriorityClientType(clientStatus);

  const highest = entries.reduce((currentHighest, entry) => {
    if (entry.eccCnc !== targetInquiry) {
      return currentHighest;
    }

    if (isPriorityClientType(entry.clientStatus) !== targetPriority) {
      return currentHighest;
    }

    const matches = String(entry.clientCardNo || '').match(/(\d+)/g);
    const value = matches?.length ? Number(matches[matches.length - 1]) : 0;
    return Math.max(currentHighest, value);
  }, 0);

  return String(highest + 1).padStart(2, '0');
}

function formatQueueNumber(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '--';
  }

  const matches = raw.match(/(\d+)/g);
  if (!matches?.length) {
    return raw;
  }

  return matches[matches.length - 1].slice(-2).padStart(2, '0');
}

function playButtonTone(enabled) {
  if (!enabled || typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(720, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
  osc.onended = () => ctx.close().catch(() => {});
}

// Corporate ding-dong bell for admin-side queue calls.
function playCorporateBell(enabled) {
  if (!enabled || typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();

  function playNote(freq, startAt, duration, peakGain) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startAt);
    // A second harmonic for a bell-like timbre
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.756, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    gain2.gain.setValueAtTime(0.0001, startAt);
    gain2.gain.exponentialRampToValueAtTime(peakGain * 0.35, startAt + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startAt + duration * 0.7);
    osc.connect(gain); gain.connect(ctx.destination);
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc.start(startAt); osc.stop(startAt + duration);
    osc2.start(startAt); osc2.stop(startAt + duration);
  }

  const t = ctx.currentTime;
  playNote(880, t, 0.55, 0.18);       // ding  (A5)
  playNote(698.5, t + 0.32, 0.65, 0.14); // dong (F5)

  const bellDuration = 0.32 + 0.65 + 0.15;
  setTimeout(() => ctx.close().catch(() => {}), bellDuration * 1000);
}

function statusColor(status) {
  switch (status) {
    case 'CALL':
      return 'green';
    case 'Waiting to Call':
      return 'blue';
    case 'On Hold':
      return 'gold';
    case 'Skipped':
      return 'volcano';
    case 'CLIENT MISSING':
      return 'red';
    case 'Initialized':
      return 'default';
    case 'Done':
    case 'Assisted':
    case 'Done/Assisted':
      return 'green';
    default:
      return 'orange';
  }
}

export default function MyQueuePortal() {
  const { message } = App.useApp();
  const { admin } = useAuth();
  const [form] = Form.useForm();
  const [historyForm] = Form.useForm();
  const [completionForm] = Form.useForm();
  const [entries, setEntries] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySaving, setHistorySaving] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [historyTab, setHistoryTab] = useState('all');
  const [displayOptions, setDisplayOptions] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState('all');
  const [queueInquiryFilter, setQueueInquiryFilter] = useState('all');
  const [formExpanded, setFormExpanded] = useState(true);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionPendingStatus, setCompletionPendingStatus] = useState(null);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [viewHistoryRecord, setViewHistoryRecord] = useState(null);
  const selectedGeneralInquiry = Form.useWatch('generalInquiry', form);
  const selectedClientStatus = Form.useWatch('clientStatus', form);
  const lastSuggestedQueueNumberRef = useRef('');
  // True only for admin accounts that have developer access — never for queue-officer accounts.
  const isAdminDeveloper = admin?.accountType === 'admin' && (admin?.accessModules || []).includes('developer');

  const selectedOfficer = useMemo(
    () => officers.find((item) => item._id === selectedOfficerId) || null,
    [officers, selectedOfficerId]
  );

  const loadEntries = async () => {
    setLoading(true);
    try {
      const requests = [apiClient.get('/queue-display')];
      if (isAdminDeveloper) {
        requests.push(apiClient.get('/queue-officers'));
      }

      const responses = await Promise.all(requests);
      const displayData = responses[0].data;
      const officerData = isAdminDeveloper ? responses[1]?.data : null;

      const activeDisplayOptions = (displayData.config?.counterCards || [])
        .filter((item) => item.active)
        .sort((left, right) => left.order - right.order)
        .map((item) => item.transactionName);

      const availableOfficers = officerData?.officers || [];
      if (isAdminDeveloper) {
        setOfficers(availableOfficers);
      }

      const effectiveOfficerId = isAdminDeveloper
        ? selectedOfficerId || availableOfficers[0]?._id || null
        : null;

      if (isAdminDeveloper && effectiveOfficerId !== selectedOfficerId) {
        setSelectedOfficerId(effectiveOfficerId);
      }

      const portalResponse = await apiClient.get('/queue-officers/portal/entries', {
        params: isAdminDeveloper && effectiveOfficerId ? { officerId: effectiveOfficerId } : undefined,
      });
      const portalData = portalResponse.data;

      setEntries(portalData.entries || []);

      // For regular queue officers, only show their assigned counter in the form.
      // Developers see all active counters so they can operate on any officer's behalf.
      const officerAssigned = portalData.assignedTransaction || admin?.assignedTransaction || '';
      const filteredOptions = !isAdminDeveloper && officerAssigned
        ? activeDisplayOptions.filter((name) =>
            name.toLowerCase() === officerAssigned.toLowerCase() || activeDisplayOptions.length === 0
          )
        : activeDisplayOptions;

      setDisplayOptions(filteredOptions.length ? filteredOptions : activeDisplayOptions);
      setSoundEnabled(displayData.config?.soundAlerts !== false);

      const currentGeneralInquiry = form.getFieldValue('generalInquiry');
      const relevantOptions = filteredOptions.length ? filteredOptions : activeDisplayOptions;
      const nextGeneralInquiry =
        currentGeneralInquiry && relevantOptions.includes(currentGeneralInquiry)
          ? currentGeneralInquiry
          : relevantOptions[0] || '';

      form.setFieldsValue({ generalInquiry: nextGeneralInquiry, clientCallStatus: form.getFieldValue('clientCallStatus') || 'Waiting to Call' });
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load portal queue entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [selectedOfficerId]);

  // Realtime refresh: silently re-fetch active queue entries so thrown numbers
  // and status changes from other officers/pages appear without manual reloads.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await apiClient.get('/queue-officers/portal/entries', {
          params: isAdminDeveloper && selectedOfficerId ? { officerId: selectedOfficerId } : undefined,
        });
        setEntries(res.data.entries || []);
      } catch {
        // Ignore transient polling errors.
      }
    }, 5000);
    return () => clearInterval(id);
  }, [isAdminDeveloper, selectedOfficerId]);

  // ── Transaction history (Done / Assisted) ──────────────────────
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await apiClient.get('/queue-officers/portal/transactions', {
        params: isAdminDeveloper && selectedOfficerId ? { officerId: selectedOfficerId } : undefined,
      });
      setHistory(data.entries || []);
    } catch {
      // graceful — history may not be available
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, selectedOfficerId]);

  const stats = useMemo(
    () => ({
      total: entries.length,
      queued: entries.filter((item) => item.clientCallStatus === 'Waiting to Call').length,
      nowServing: entries.filter((item) => item.clientCallStatus === 'CALL').length,
    }),
    [entries]
  );

  const inquiryOptions = useMemo(() => {
    const key = normalizeTransactionGroup(selectedGeneralInquiry);
    const options = INQUIRY_OPTIONS_BY_TRANSACTION[key] || ['Screening Only (Inquiry/Consultation)'];
    return options.map((value) => ({ value, label: value }));
  }, [selectedGeneralInquiry]);

  const nextQueueNumber = useMemo(
    () => nextQueueNumberForInquiry(entries, selectedGeneralInquiry, selectedClientStatus),
    [entries, selectedClientStatus, selectedGeneralInquiry]
  );

  const selectedEntry = useMemo(
    () => entries.find((item) => item._id === selectedEntryId) || null,
    [entries, selectedEntryId]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = !queueSearch || [
        entry.clientName,
        entry.clientCardNo,
        entry.eccCnc,
        entry.transactionStatus,
        entry.specificInquiry,
        entry.companyOrApplicationNo,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(queueSearch.toLowerCase()));

      const matchesStatus = queueStatusFilter === 'all' || entry.clientCallStatus === queueStatusFilter;
      const matchesInquiry = queueInquiryFilter === 'all' || entry.eccCnc === queueInquiryFilter;

      return matchesSearch && matchesStatus && matchesInquiry;
    });
  }, [entries, queueInquiryFilter, queueSearch, queueStatusFilter]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (queueInquiryFilter !== 'all') {
      chips.push({ key: 'inquiry', label: `Inquiry: ${queueInquiryFilter}` });
    }

    if (queueStatusFilter !== 'all') {
      chips.push({ key: 'status', label: `Status: ${queueStatusFilter}` });
    }

    if (queueSearch.trim()) {
      chips.push({ key: 'search', label: `Search: ${queueSearch.trim()}` });
    }

    return chips;
  }, [queueInquiryFilter, queueSearch, queueStatusFilter]);

  const effectiveAssignedTransaction = selectedOfficer?.assignedTransaction || admin?.assignedTransaction || 'your assigned transaction';

  useEffect(() => {
    const currentValue = String(form.getFieldValue('clientCardNo') || '').trim();
    const shouldSyncSuggestedNumber = !editingEntryId && (!isAdminDeveloper || !currentValue || currentValue === lastSuggestedQueueNumberRef.current);

    if (shouldSyncSuggestedNumber) {
      form.setFieldsValue({ clientCardNo: nextQueueNumber });
    }

    lastSuggestedQueueNumberRef.current = nextQueueNumber;
  }, [editingEntryId, form, isAdminDeveloper, nextQueueNumber]);

  useEffect(() => {
    if (!inquiryOptions.length) {
      form.setFieldsValue({ inquiry: undefined });
      return;
    }

    const currentInquiry = form.getFieldValue('inquiry');
    if (!currentInquiry || !inquiryOptions.some((option) => option.value === currentInquiry)) {
      form.setFieldsValue({ inquiry: inquiryOptions[0].value });
    }
  }, [form, inquiryOptions]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      playButtonTone(soundEnabled);
      const payload = {
        ...values,
        officerId: isAdminDeveloper ? selectedOfficerId : undefined,
      };

      if (editingEntryId) {
        await apiClient.put(`/queue-officers/portal/entries/${editingEntryId}`, payload);
        await portalToast({ icon: 'success', title: 'Queue entry updated.' });
      } else {
        await apiClient.post('/queue-officers/portal/entries', payload);
        await portalToast({ icon: 'success', title: 'Client queued successfully.' });
      }
      form.resetFields();
      form.setFieldsValue({
        clientStatus: 'Regular',
        generalInquiry: selectedGeneralInquiry,
        clientCallStatus: 'Waiting to Call',
      });
      setEditingEntryId(null);
      setSelectedEntryId(null);
      loadEntries();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to queue client', text: error.response?.data?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditSelected = () => {
    if (!selectedEntry) {
      message.warning('Select a queue entry first.');
      return;
    }

    form.setFieldsValue({
      clientName: selectedEntry.clientName,
      clientCardNo: formatQueueNumber(selectedEntry.clientCardNo),
      generalInquiry: selectedEntry.eccCnc,
      clientStatus: selectedEntry.clientStatus,
      inquiry: selectedEntry.transactionStatus,
      specificInquiry: selectedEntry.specificInquiry || undefined,
      companyOrApplicationNo: selectedEntry.companyOrApplicationNo,
      clientCallStatus: selectedEntry.clientCallStatus,
    });
    setEditingEntryId(selectedEntry._id);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    form.resetFields();
    form.setFieldsValue({
      clientStatus: 'Regular',
      generalInquiry: selectedGeneralInquiry,
      clientCallStatus: 'Waiting to Call',
    });
    lastSuggestedQueueNumberRef.current = nextQueueNumber;
  };

  // ── Done / Assisted with optional completion-data modal ──────────────────
  const handleCallNumber = async (record) => {
    const target = record || selectedEntry;
    if (!target?._id) {
      message.warning('Select a queue entry first.');
      return;
    }

    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: `Call queue no. ${formatQueueNumber(target.clientCardNo)}?`,
      text: 'This will push the active call to the public dashboard.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Call now',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1d4ed8',
    });
    if (!confirmed.isConfirmed) return;

    setActingId(target._id);
    try {
      playCorporateBell(soundEnabled);
      await apiClient.post(`/queue-officers/portal/entries/${target._id}/call`, {
        officerId: isAdminDeveloper ? selectedOfficerId : undefined,
      });
      await portalToast({ icon: 'success', title: `Now calling ${formatQueueNumber(target.clientCardNo)}.` });
      setSelectedEntryId(null);
      loadEntries();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to call queue number', text: error.response?.data?.message || 'Please try again.' });
    } finally {
      setActingId(null);
    }
  };

  const handleStatusUpdate = async (clientCallStatus, record) => {
    const target = record || selectedEntry;
    if (!target?._id) {
      message.warning('Select a queue entry first.');
      return;
    }

    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: `Set ${formatQueueNumber(target.clientCardNo)} to ${clientCallStatus}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1d4ed8',
    });
    if (!confirmed.isConfirmed) return;

    setActingId(target._id);
    try {
      playButtonTone(soundEnabled);
      await apiClient.patch(`/queue-officers/portal/entries/${target._id}/status`, {
        clientCallStatus,
        officerId: isAdminDeveloper ? selectedOfficerId : undefined,
      });
      await portalToast({ icon: 'success', title: `${formatQueueNumber(target.clientCardNo)} marked as ${clientCallStatus}.` });
      setSelectedEntryId(null);
      loadEntries();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to update queue status', text: error.response?.data?.message || 'Please try again.' });
    } finally {
      setActingId(null);
    }
  };

  // Serve a thrown ready number (or edit an existing entry): prefill and expand the form.
  const handleServe = (record) => {
    if (!record) return;
    setFormExpanded(true);
    const queueNo = formatQueueNumber(record.clientCardNo);
    lastSuggestedQueueNumberRef.current = queueNo;
    form.setFieldsValue({
      clientName: record.clientName || '',
      clientCardNo: queueNo,
      generalInquiry: record.eccCnc,
      clientStatus: record.clientStatus || 'Regular',
      inquiry: record.transactionStatus || undefined,
      specificInquiry: record.specificInquiry || undefined,
      companyOrApplicationNo: record.companyOrApplicationNo || '',
      clientCallStatus: record.clientCallStatus === 'Initialized' ? 'Waiting to Call' : record.clientCallStatus,
    });
    setEditingEntryId(record._id);
    setSelectedEntryId(record._id);
  };

  // Inline-edit the Inquiry value directly from the queue list.
  const handleInlineInquiryChange = async (record, value) => {
    try {
      await apiClient.put(`/queue-officers/portal/entries/${record._id}`, {
        inquiry: value,
        officerId: isAdminDeveloper ? selectedOfficerId : undefined,
      });
      await portalToast({ icon: 'success', title: 'Inquiry updated.' });
      loadEntries();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to update inquiry', text: error.response?.data?.message || 'Please try again.' });
    }
  };

  // ── Done / Assisted with optional completion-data modal ──────────────────
  const handleDoneOrAssisted = (status, record) => {
    const target = record || selectedEntry;
    if (!target) {
      message.warning('Select a queue entry first.');
      return;
    }
    setSelectedEntryId(target._id);
    const requirement = getCompletionRequirement(target);
    if (requirement) {
      completionForm.resetFields();
      setCompletionPendingStatus(status);
      setCompletionModalOpen(true);
    } else {
      handleStatusUpdate(status, target);
    }
  };

  const handleCompletionSubmit = async (values) => {
    const requirement = getCompletionRequirement(selectedEntry);
    let extraPayload = {};

    if (requirement === 'paymentDateTime' && values.paymentDateTime) {
      extraPayload.receiptDate = values.paymentDateTime.format('MM/DD/YYYY');
      extraPayload.receiptTime = values.paymentDateTime.format('hh:mm A');
    } else if (requirement === 'paymentDate' && values.paymentDate) {
      extraPayload.receiptDate = values.paymentDate.format('MM/DD/YYYY');
    } else if (requirement === 'reportDate' && values.reportDate) {
      extraPayload.receiptDate = values.reportDate.format('MM/DD/YYYY');
    } else if (requirement === 'companyRegId' && values.companyRegId) {
      extraPayload.companyOrApplicationNo = values.companyRegId;
    }

    setCompletionSaving(true);
    setActingId(selectedEntry._id);
    try {
      playButtonTone(soundEnabled);
      await apiClient.patch(`/queue-officers/portal/entries/${selectedEntry._id}/status`, {
        clientCallStatus: completionPendingStatus,
        officerId: isAdminDeveloper ? selectedOfficerId : undefined,
        ...extraPayload,
      });
      await portalToast({ icon: 'success', title: `${formatQueueNumber(selectedEntry.clientCardNo)} marked as ${completionPendingStatus}.` });
      setCompletionModalOpen(false);
      setSelectedEntryId(null);
      loadEntries();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to update queue status', text: error.response?.data?.message || 'Please try again.' });
    } finally {
      setCompletionSaving(false);
      setActingId(null);
    }
  };

  const handleDeleteEntry = async (record) => {
    const Swal = await getSwal()
    const confirmed = await Swal.fire({
      title: `Delete queue entry ${formatQueueNumber(record.clientCardNo)}?`,
      text: 'This permanently removes the queue entry.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmed.isConfirmed) return;

    try {
      await apiClient.delete(`/queue-officers/portal/entries/${record._id}`, {
        params: { officerId: selectedOfficerId },
      });
      await portalToast({ icon: 'success', title: `Entry ${formatQueueNumber(record.clientCardNo)} deleted.` });
      if (selectedEntryId === record._id) {
        setSelectedEntryId(null);
      }
      loadEntries();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to delete entry', text: error.response?.data?.message || 'Please try again.' });
    }
  };

  const historyTabs = useMemo(() => {
    const values = Array.from(new Set([
      ...displayOptions,
      ...history.map((item) => item.eccCnc).filter(Boolean),
    ])).filter(Boolean);

    return [
      { key: 'all', label: 'All Permits' },
      ...values.map((value) => ({ key: value, label: value })),
    ];
  }, [displayOptions, history]);

  useEffect(() => {
    if (!historyTabs.some((item) => item.key === historyTab)) {
      setHistoryTab(historyTabs[0]?.key || 'all');
    }
  }, [historyTab, historyTabs]);

  const filteredHistory = useMemo(
    () => (historyTab === 'all' ? history : history.filter((item) => item.eccCnc === historyTab)),
    [history, historyTab]
  );

  const columns = [
    {
      title: 'Queue Number',
      dataIndex: 'clientCardNo',
      key: 'clientCardNo',
      render: (value, record) => (
        <Tag
          color={isPriorityClientType(record.clientStatus) ? 'blue' : 'green'}
          style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1 }}
        >
          {formatQueueNumber(value)}
        </Tag>
      ),
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Specific Inquiry',
      dataIndex: 'specificInquiry',
      key: 'specificInquiry',
      render: (value) => value ? <Tag color="geekblue">{value}</Tag> : '-',
    },
    {
      title: 'Inquiry Type',
      dataIndex: 'eccCnc',
      key: 'eccCnc',
      render: (value) => <Tag color="cyan">{value}</Tag>,
    },
    {
      title: 'Inquiry',
      dataIndex: 'transactionStatus',
      key: 'transactionStatus',
      width: 230,
      render: (value, record) => {
        if (record.clientCallStatus === 'Initialized') {
          return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        }
        const grp = normalizeTransactionGroup(record.eccCnc);
        const opts = (INQUIRY_OPTIONS_BY_TRANSACTION[grp] || ['Screening Only (Inquiry/Consultation)'])
          .map((v) => ({ value: v, label: v }));
        return (
          <Select
            size="small"
            value={value || undefined}
            placeholder="Set inquiry"
            style={{ minWidth: 210 }}
            options={opts}
            onClick={(event) => event.stopPropagation()}
            onChange={(val) => handleInlineInquiryChange(record, val)}
          />
        );
      },
    },
    {
      title: 'Client Type',
      dataIndex: 'clientStatus',
      key: 'clientStatus',
      render: (value) => (
        <Tag color={isPriorityClientType(value) ? 'blue' : 'green'}>{value}</Tag>
      ),
    },
    {
      title: 'Other Details',
      dataIndex: 'companyOrApplicationNo',
      key: 'companyOrApplicationNo',
      render: (value) => value || '-',
    },
    {
      title: 'Queue Status',
      dataIndex: 'clientCallStatus',
      key: 'clientCallStatus',
      render: (value) =>
        value === 'Initialized'
          ? <Tag color="default" style={{ color: '#64748b' }}>Ready (Unserved)</Tag>
          : <Tag color={statusColor(value)}>{value}</Tag>,
    },
    {
      title: 'Actions',
      key: 'rowActions',
      fixed: 'right',
      width: 240,
      render: (_, record) => {
        if (record.clientCallStatus === 'Initialized') {
          return (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [{ key: 'serve', icon: <PlayCircleOutlined />, label: 'Serve' }],
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  if (key === 'serve') handleServe(record);
                },
              }}
            >
              <Button type="primary" size="small" className="qno-serve-btn" onClick={(event) => event.stopPropagation()}>
                <PlayCircleOutlined className="anim-icon-pulse" /> Serve <DownOutlined />
              </Button>
            </Dropdown>
          );
        }
        const acting = actingId === record._id;
        return (
          <Space size={2}>
            <Tooltip title="Call">
              <Button size="small" type="text" loading={acting} icon={<NotificationOutlined className="anim-icon-ring" />} onClick={(event) => { event.stopPropagation(); handleCallNumber(record); }} />
            </Tooltip>
            <Tooltip title="Hold">
              <Button size="small" type="text" icon={<PauseCircleOutlined className="anim-icon-pulse" />} onClick={(event) => { event.stopPropagation(); handleStatusUpdate('On Hold', record); }} />
            </Tooltip>
            <Tooltip title="Skip">
              <Button size="small" type="text" danger icon={<StepForwardOutlined className="anim-icon-slide" />} onClick={(event) => { event.stopPropagation(); handleStatusUpdate('Skipped', record); }} />
            </Tooltip>
            <Tooltip title="Done/Assisted">
              <Button size="small" type="text" style={{ color: '#15803d' }} icon={<CheckCircleOutlined className="anim-icon-pop" />} onClick={(event) => { event.stopPropagation(); handleDoneOrAssisted('Done/Assisted', record); }} />
            </Tooltip>
            <Tooltip title="Edit">
              <Button size="small" type="text" icon={<EditOutlined className="anim-icon-wiggle" />} onClick={(event) => { event.stopPropagation(); handleServe(record); }} />
            </Tooltip>
          </Space>
        );
      },
    },
    ...(isAdminDeveloper ? [{
      title: '',
      key: 'devDelete',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteEntry(record)}>Delete</Button>
      ),
    }] : []),
  ];

  return (
    <AdminShell
      title="My Queue Portal"
      subtitle={`Queue clients for ${effectiveAssignedTransaction} and call numbers to the public board.`}
      extra={
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <Text type="secondary">
            Add a client, use the available counter inquiries, and use Call Number to push it to the public dashboard counter card.
          </Text>
          {isAdminDeveloper ? (
            <Space wrap>
              <Text strong>Assigned Officer</Text>
              <Select
                style={{ minWidth: 260 }}
                value={selectedOfficerId}
                onChange={setSelectedOfficerId}
                options={officers.map((item) => ({
                  value: item._id,
                  label: `${item.name} • ${item.assignedTransaction}`,
                }))}
                placeholder="Select assigned officer"
              />
            </Space>
          ) : null}
        </Space>
      }
    >
      {/* Officer info banner — only for queue officer accounts */}
      {!isAdminDeveloper && admin?.accountType === 'queue-officer' && (
        <div style={{
          background: 'linear-gradient(90deg,#1e3a8a 0%,#1d4ed8 100%)',
          borderRadius: 10, padding: '12px 18px', marginBottom: 16,
          display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center',
        }}>
          <div><div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Officer</div><div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{admin?.name || '—'}</div></div>
          <div><div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Assigned Counter</div><div style={{ color: '#fcd34d', fontWeight: 700, fontSize: 15 }}>{effectiveAssignedTransaction}</div></div>
          <div><div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Now Serving</div><div style={{ color: '#6ee7b7', fontWeight: 900, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{stats.nowServing}</div></div>
          <div><div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Waiting</div><div style={{ color: '#fde68a', fontWeight: 900, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{stats.queued}</div></div>
          <div><div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Total in Queue</div><div style={{ color: '#bfdbfe', fontWeight: 900, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{stats.total}</div></div>
        </div>
      )}

      {isAdminDeveloper && (
        <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
          <Tag color="blue">Queued {stats.total}</Tag>
          <Tag color="gold">Waiting {stats.queued}</Tag>
          <Tag color="green">Now Serving {stats.nowServing}</Tag>
        </Space>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'queue',
            label: <Space size={4}><UnorderedListOutlined />Active Queue</Space>,
            children: (
              <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            bordered={false}
            className="admin-data-table-card"
            title={
              <Space size={8}>
                {editingEntryId ? 'Edit Queue Entry' : 'Queue Client Form'}
                <Tag
                  color={formExpanded ? 'blue' : 'default'}
                  style={{ cursor: 'pointer', fontWeight: 600, fontSize: 11, letterSpacing: 1 }}
                  onClick={() => setFormExpanded((v) => !v)}
                >
                  {formExpanded ? 'Hide' : 'Show'}
                </Tag>
              </Space>
            }
            extra={
              <Space size={8}>
                {editingEntryId && <Button size="small" onClick={handleCancelEdit}>Cancel Edit</Button>}
                <Button
                  size="small"
                  icon={formExpanded ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setFormExpanded((v) => !v)}
                >
                  {formExpanded ? 'Collapse Form' : 'Expand Form'}
                </Button>
              </Space>
            }
          >
            {formExpanded && (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ clientStatus: 'Regular', clientCallStatus: 'Waiting to Call' }}
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="clientName"
                    label="Client / Company Name"
                    rules={[{ required: true, message: 'Please enter the client or company name.' }]}
                  >
                    <TextArea autoSize={{ minRows: 1, maxRows: 3 }} placeholder="Client name or company name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                  <Form.Item
                    name="clientCardNo"
                    label={isAdminDeveloper ? 'Queue No. (editable)' : 'Queue No.'}
                    rules={[
                      { required: true, message: 'Please enter the queue number.' },
                      { pattern: /^\d+$/, message: 'Numbers only.' },
                    ]}
                    extra={isAdminDeveloper ? 'Developers may override the auto-assigned number.' : undefined}
                  >
                    <Input placeholder={nextQueueNumber} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="generalInquiry"
                    label="General Inquiry Type"
                    rules={[{ required: true, message: 'Please select the general inquiry type.' }]}
                  >
                    <Select
                      options={displayOptions.map((value) => ({ value, label: value }))}
                      placeholder="Select a counter inquiry"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="clientStatus"
                    label="Client Type"
                    rules={[{ required: true, message: 'Please select the client type.' }]}
                  >
                    <Select
                      options={[
                        { value: 'Regular', label: 'Regular' },
                        { value: 'Priority', label: 'Priority' },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[16, 0]}>
                <Col xs={24} md={10}>
                  <Form.Item
                    name="inquiry"
                    label="Inquiry"
                    rules={[{ required: true, message: 'Please select the inquiry.' }]}
                  >
                    <Select options={inquiryOptions} placeholder="Select inquiry type" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="specificInquiry"
                    label="Specific Inquiry Type"
                  >
                    <Select
                      options={SPECIFIC_INQUIRY_OPTIONS}
                      placeholder="ECC, CNC, PTO…"
                      allowClear
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="clientCallStatus"
                    label="Service Status"
                    rules={[{ required: true, message: 'Please select the service status.' }]}
                  >
                    <Select
                      options={[
                        { value: 'Waiting to Call', label: 'Waiting to Call' },
                        { value: 'CALL', label: 'Call' },
                        { value: 'On Hold', label: 'Hold' },
                        { value: 'Skipped', label: 'Skip' },
                        { value: 'CLIENT MISSING', label: 'Client Missing' },
                        { value: 'Done/Assisted', label: 'Done/Assisted' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="companyOrApplicationNo" label="Other Details">
                    <TextArea rows={3} placeholder="Company, application number, or additional notes" />
                  </Form.Item>
                </Col>
              </Row>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving} icon={<PlusOutlined />}>
                  {editingEntryId ? 'Save Changes' : 'Add to Queue'}
                </Button>
              </Space>
            </Form>
            )}
          </Card>
        </Col>
        <Col xs={24}>
          <Card
            bordered={false}
            className="admin-data-table-card"
            title="Queue List"
          >
            <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
              <Select
                value={queueInquiryFilter}
                onChange={setQueueInquiryFilter}
                style={{ minWidth: 210 }}
                options={[
                  { value: 'all', label: 'All General Inquiries' },
                  ...displayOptions.map((value) => ({ value, label: value })),
                ]}
              />
              <Select
                value={queueStatusFilter}
                onChange={setQueueStatusFilter}
                style={{ minWidth: 180 }}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'Waiting to Call', label: 'Waiting to Call' },
                  { value: 'Queued', label: 'Queued' },
                  { value: 'CALL', label: 'CALL' },
                  { value: 'On Hold', label: 'On Hold' },
                  { value: 'Skipped', label: 'Skipped' },
                  { value: 'CLIENT MISSING', label: 'Client Missing' },
                  { value: 'Done', label: 'Done' },
                  { value: 'Assisted', label: 'Assisted' },
                ]}
              />
              <Input.Search
                allowClear
                placeholder="Search queue list"
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                style={{ minWidth: 240 }}
              />
              <Button
                onClick={() => {
                  setQueueInquiryFilter('all');
                  setQueueStatusFilter('all');
                  setQueueSearch('');
                }}
              >
                Reset Filters
              </Button>
            </Space>
            {activeFilterChips.length ? (
              <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
                {activeFilterChips.map((chip) => (
                  <Tag
                    key={chip.key}
                    color="blue"
                    closable
                    onClose={(event) => {
                      event.preventDefault();
                      if (chip.key === 'inquiry') { setQueueInquiryFilter('all'); }
                      if (chip.key === 'status') { setQueueStatusFilter('all'); }
                      if (chip.key === 'search') { setQueueSearch(''); }
                    }}
                  >
                    {chip.label}
                  </Tag>
                ))}
              </Space>
            ) : null}
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">
                {selectedEntry
                  ? `Selected: ${formatQueueNumber(selectedEntry.clientCardNo)} - ${selectedEntry.clientName}`
                  : 'Select one queue entry from the table to enable the action buttons.'}
              </Text>
            </div>
            <Table
              className="admin-data-table"
              rowKey="_id"
              columns={columns}
              dataSource={filteredEntries}
              loading={loading}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 'max-content' }}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedEntryId ? [selectedEntryId] : [],
                onChange: (selectedRowKeys) => setSelectedEntryId(selectedRowKeys[0] || null),
              }}
              onRow={(record) => ({
                onClick: () => setSelectedEntryId(record._id),
              })}
            />
          </Card>
        </Col>
      </Row>
        ),
          },
          {
            key: 'history',
            label: <Space size={4}><HistoryOutlined />My Transactions</Space>,
            children: (
              <Card
                bordered={false}
                className="admin-data-table-card"
                title={<Space><HistoryOutlined style={{ color: '#7c3aed' }} /><span>Completed Transactions</span></Space>}
                extra={
                  <Space wrap size={6}>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => exportToCSV(HISTORY_EXPORT_COLS, history, `my-transactions-${new Date().toISOString().slice(0,10)}`)}
                    >
                      CSV
                    </Button>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => exportToExcel(HISTORY_EXPORT_COLS, history, `my-transactions-${new Date().toISOString().slice(0,10)}`)}
                      style={{ color: '#15803d', borderColor: '#15803d' }}
                    >
                      Excel
                    </Button>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => { setEditingHistoryId(null); historyForm.resetFields(); setHistoryModalOpen(true); }}>
                      Add Record
                    </Button>
                  </Space>
                }
              >
                <Tabs
                  activeKey={historyTab}
                  onChange={setHistoryTab}
                  items={historyTabs.map((item) => ({ key: item.key, label: item.label }))}
                  style={{ marginBottom: 12 }}
                />
                <Table
                  className="admin-data-table"
                  rowKey="_id"
                  loading={historyLoading}
                  dataSource={filteredHistory}
                  pagination={{ defaultPageSize: 8, showSizeChanger: true, pageSizeOptions: ['8','15','30'], showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
                  scroll={{ x: 'max-content' }}
                  size="small"
                  onRow={(record) => ({
                    onClick: () => setViewHistoryRecord(record),
                  })}
                  columns={[
                    {
                      title: 'Queue No. and Type',
                      key: 'client',
                      width: 180,
                      render: (_, rec) => (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                            <Tag
                              color={isPriorityClientType(rec.clientStatus) ? 'blue' : 'green'}
                              style={{ fontWeight: 800, fontSize: 13, margin: 0, letterSpacing: 1 }}
                            >
                              {String(rec.clientCardNo || '').replace(/\D/g, '').slice(-2).padStart(2, '0')}
                            </Tag>
                            <Tag
                              color={isPriorityClientType(rec.clientStatus) ? 'blue' : 'green'}
                              style={{ fontSize: 10, margin: 0 }}
                            >
                              {rec.clientStatus || '—'}
                            </Tag>
                          </div>
                          <Text style={{ fontSize: 12, fontWeight: 600 }}>{rec.clientName || '—'}</Text>
                        </div>
                      ),
                    },
                    {
                      title: 'Client/Company Name',
                      key: 'clientName',
                      width: 190,
                      render: (_, rec) => <Text style={{ fontSize: 12, fontWeight: 600 }}>{rec.clientName || rec.companyOrApplicationNo || '—'}</Text>,
                    },
                    {
                      title: 'Counter & Inquiry',
                      key: 'inquiry',
                      width: 210,
                      render: (_, rec) => (
                        <div>
                          <Tag color="cyan" style={{ fontSize: 10, marginBottom: 2 }}>{rec.eccCnc || '—'}</Tag>
                          <br />
                          <Text style={{ fontSize: 11 }}>{rec.transactionStatus || '—'}</Text>
                          {rec.specificInquiry ? (
                            <><br /><Tag color="geekblue" style={{ fontSize: 10, marginTop: 2 }}>{rec.specificInquiry}</Tag></>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      title: 'Queue Officer in Charge',
                      key: 'details',
                      width: 160,
                      render: (_, rec) => <Text style={{ fontSize: 11 }}>{rec.screeningOfficer || '—'}</Text>,
                    },
                    {
                      title: 'Transaction Date',
                      key: 'receipt',
                      width: 115,
                      render: (_, rec) => (
                        <div>
                          <Text style={{ fontSize: 11 }}>{rec.receiptDate || (rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : '—')}</Text>
                          {rec.receiptTime ? (
                            <><br /><Text type="secondary" style={{ fontSize: 10 }}>{rec.receiptTime}</Text></>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      title: 'Service Status',
                      dataIndex: 'clientCallStatus',
                      key: 'clientCallStatus',
                      width: 90,
                      render: (v) => <Tag color={statusColor(v)} style={{ fontSize: 10 }}>{v}</Tag>,
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* History entry modal */}
      <Modal
        title={editingHistoryId ? 'Edit Transaction Record' : 'Add Transaction Record'}
        open={historyModalOpen}
        onCancel={() => !historySaving && setHistoryModalOpen(false)}
        onOk={() => historyForm.submit()}
        confirmLoading={historySaving}
        closable={!historySaving}
        maskClosable={!historySaving}
        width={600}
      >
        {historySaving ? (
          <LoadingScreen compact title="Saving transaction record" description="Validating fields and updating queue history." />
        ) : (
        <Form form={historyForm} layout="vertical" onFinish={async (values) => {
          setHistorySaving(true)
          try {
            const payload = { ...values, officerId: isAdminDeveloper ? selectedOfficerId : undefined };
            if (editingHistoryId) {
              await apiClient.put(`/queue-officers/portal/entries/${editingHistoryId}`, payload);
              message.success('Record updated.');
            } else {
              await apiClient.post('/queue-officers/portal/entries', { ...payload, clientCallStatus: values.clientCallStatus || 'Done' });
              message.success('Record added.');
            }
            setHistoryModalOpen(false);
            historyForm.resetFields();
            loadHistory();
          } catch (err) {
            message.error(err.response?.data?.message || 'Unable to save record.');
          } finally {
            setHistorySaving(false)
          }
        }}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="clientName" label="Client Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="clientStatus" label="Client Type" rules={[{ required: true }]}><Select options={[{ value: 'Regular', label: 'Regular' }, { value: 'Priority', label: 'Priority' }]} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="generalInquiry" label="Counter / Inquiry" rules={[{ required: true }]}><Select options={displayOptions.map((v) => ({ value: v, label: v }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="inquiry" label="Transaction Type" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="companyOrApplicationNo" label="Company / App No."><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="clientCallStatus" label="Status" rules={[{ required: true }]}><Select options={[{ value: 'Done', label: 'Done' }, { value: 'Assisted', label: 'Assisted' }]} /></Form.Item></Col>
          </Row>
        </Form>
        )}
      </Modal>

      {/* ── Transaction Completion Data Modal ─────────────────── */}
      {(() => {
        const req = getCompletionRequirement(selectedEntry);
        const grp = normalizeTransactionGroup(selectedEntry?.eccCnc);
        const isSMR = String(selectedEntry?.specificInquiry || '').toUpperCase().includes('SMR')
          || (!String(selectedEntry?.specificInquiry || '').toUpperCase().includes('CMR') && grp === 'SMR/CMR');
        const isCMR = String(selectedEntry?.specificInquiry || '').toUpperCase().includes('CMR');

        const titleMap = {
          paymentDateTime: 'Record Payment Receipt Details',
          paymentDate: 'Record Payment Receipt Date',
          reportDate: 'Record Report Submission Date',
          companyRegId: 'Record Company Registration ID',
        };

        return (
          <Modal
            title={
              <Space direction="vertical" size={2}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>
                  {titleMap[req] || 'Complete Transaction'}
                </span>
                <span style={{ fontWeight: 400, fontSize: 12, color: '#64748b' }}>
                  {selectedEntry?.clientName} — {selectedEntry?.eccCnc}
                  {completionPendingStatus ? ` · Marking as ${completionPendingStatus}` : ''}
                </span>
              </Space>
            }
            open={completionModalOpen}
            onCancel={() => !completionSaving && setCompletionModalOpen(false)}
            onOk={() => completionForm.submit()}
            okText={`Confirm & Mark ${completionPendingStatus || ''}`}
            okButtonProps={{ style: { background: '#15803d', borderColor: '#15803d' } }}
            confirmLoading={completionSaving}
            closable={!completionSaving}
            maskClosable={!completionSaving}
            width={460}
            destroyOnClose
          >
            {completionSaving ? (
              <LoadingScreen compact title="Completing transaction" description="Applying validation rules and updating the final service status." />
            ) : (
            <>
            <div style={{
              background: 'linear-gradient(135deg,#f0fdf4 0%,#eff6ff 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 18,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <CheckCircleOutlined style={{ color: '#15803d', fontSize: 18, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#15803d', fontSize: 13 }}>
                  Transaction Being Completed
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  <strong>{selectedEntry?.eccCnc}</strong> · {selectedEntry?.transactionStatus}
                  {selectedEntry?.specificInquiry ? ` · ${selectedEntry.specificInquiry}` : ''}
                </div>
              </div>
            </div>

            <Form
              form={completionForm}
              layout="vertical"
              onFinish={handleCompletionSubmit}
            >
              {req === 'paymentDateTime' && (
                <Form.Item
                  name="paymentDateTime"
                  label="Date and Time of Payment Receipt (optional)"
                  extra="Optional — select the date and time stamped on the payment receipt, if available."
                >
                  <DatePicker
                    showTime={{ format: 'hh:mm A', use12Hours: true }}
                    format="MM/DD/YYYY hh:mm A"
                    style={{ width: '100%' }}
                    placeholder="Select date and time"
                  />
                </Form.Item>
              )}
              {req === 'paymentDate' && (
                <Form.Item
                  name="paymentDate"
                  label="Date of Payment Receipt (optional)"
                  extra="Optional — enter the date printed on the official payment receipt, if available."
                >
                  <DatePicker
                    format="MM/DD/YYYY"
                    style={{ width: '100%' }}
                    placeholder="Select date"
                  />
                </Form.Item>
              )}
              {req === 'reportDate' && (
                <Form.Item
                  name="reportDate"
                  label="Date of Report Submission (optional)"
                  extra={
                    <span>
                      {isSMR && !isCMR && 'SMR — submitted quarterly (every 3 months).'}
                      {isCMR && !isSMR && 'CMR — submitted semestral (every 6 months).'}
                      {!isSMR && !isCMR && 'SMR: quarterly submission · CMR: semestral submission.'}
                    </span>
                  }
                >
                  <DatePicker
                    format="MM/DD/YYYY"
                    style={{ width: '100%' }}
                    placeholder="Select submission date"
                  />
                </Form.Item>
              )}
              {req === 'companyRegId' && (
                <Form.Item
                  name="companyRegId"
                  label="Company Registration ID (optional)"
                  extra="Optional — enter the official Company Registration ID issued, if available."
                >
                  <Input placeholder="e.g. CRS-2024-00123" />
                </Form.Item>
              )}
            </Form>
            </>
            )}
          </Modal>
        );
      })()}

      {/* ── View Transaction Record Modal ──────────────────────── */}
      <Modal
        title={
          <Space size={8}>
            <EyeOutlined style={{ color: '#7c3aed' }} />
            <span style={{ fontWeight: 800 }}>Transaction Record</span>
          </Space>
        }
        open={!!viewHistoryRecord}
        onCancel={() => setViewHistoryRecord(null)}
        footer={<Button onClick={() => setViewHistoryRecord(null)}>Close</Button>}
        width={520}
        destroyOnClose
      >
        {viewHistoryRecord && (() => {
          const r = viewHistoryRecord;
          const isPriority = isPriorityClientType(r.clientStatus);
          const rows = [
            { label: 'Queue Number',        value: <Tag color={isPriority ? 'blue' : 'green'} style={{ fontWeight: 700, fontSize: 14, padding: '2px 10px' }}>{String(r.clientCardNo || '').replace(/\D/g, '').slice(-2).padStart(2, '0')}</Tag> },
            { label: 'Client Name',         value: <Text strong>{r.clientName || '—'}</Text> },
            { label: 'Client Type',         value: <Tag color={isPriority ? 'blue' : 'green'}>{r.clientStatus || '—'}</Tag> },
            { label: 'Counter / General Inquiry', value: <Tag color="cyan">{r.eccCnc || '—'}</Tag> },
            { label: 'Transaction / Inquiry', value: <Tag color="purple">{r.transactionStatus || '—'}</Tag> },
            { label: 'Specific Inquiry',    value: r.specificInquiry ? <Tag color="geekblue">{r.specificInquiry}</Tag> : <Text type="secondary">—</Text> },
            { label: 'Company / App No.',   value: <Text>{r.companyOrApplicationNo || '—'}</Text> },
            { label: 'Queue Status',        value: <Tag color={r.clientCallStatus === 'Done' ? 'green' : r.clientCallStatus === 'Assisted' ? 'purple' : statusColor(r.clientCallStatus)}>{r.clientCallStatus || '—'}</Tag> },
            { label: 'Screening Officer',   value: <Text>{r.screeningOfficer || '—'}</Text> },
            { label: 'Receipt / Report Date', value: <Text>{r.receiptDate || '—'}</Text> },
            { label: 'Time',               value: <Text>{r.receiptTime || '—'}</Text> },
            { label: 'Created At',          value: <Text type="secondary">{r.createdAt ? new Date(r.createdAt).toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</Text> },
            { label: 'Last Updated',        value: <Text type="secondary">{r.updatedAt ? new Date(r.updatedAt).toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</Text> },
          ];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {rows.map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 4px',
                    borderBottom: '1px solid #f1f5f9',
                    gap: 12,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, minWidth: 160, flexShrink: 0 }}>{label}</Text>
                  <div style={{ textAlign: 'right' }}>{value}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>
    </AdminShell>
  );
}