import {
  CloudServerOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  LinkOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Skeleton,
  Space,
  Tag,
} from 'antd';
import { Suspense, lazy, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import AdminShell from './AdminShell';
import LoadingScreen from '../../components/LoadingScreen';
import './AdminDataTables.css';

const DatabaseStatusTabs = lazy(() => import('./db-status/DatabaseStatusTabs'))

export default function DeveloperDatabaseStatusConnections() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState(null);

  const downloadJson = (filename, payload) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadHealth = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/diagnostics/database');
      setDiagnostics(data);
    } catch (_error) {
      message.error('Unable to load database status.');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      await apiClient.post('/diagnostics/database/backups');
      message.success('Backup snapshot created successfully.');
      loadHealth();
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to create backup snapshot.');
    }
  };

  const exportCollection = async (collectionName) => {
    try {
      const { data } = await apiClient.get(`/diagnostics/database/export/${collectionName}`);
      downloadJson(`${collectionName}-export.json`, data);
      message.success(`Exported ${collectionName} collection.`);
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to export collection.');
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <AdminShell
      title="Database Status and Connections"
      subtitle="Monitor connection health, uptime, collections, backup snapshots, and exportable MongoDB data."
      extra={
        <Space wrap>
          <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={loadHealth}>
            Refresh Status
          </Button>
          <Button size="small" icon={<SaveOutlined />} onClick={createBackup}>
            Create Backup Snapshot
          </Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Tag color={diagnostics?.status === 'ok' ? 'green' : 'red'}>API {diagnostics?.status || 'unknown'}</Tag>
        <Tag color={diagnostics?.database === 'connected' ? 'green' : 'gold'}>DB {diagnostics?.database || 'unavailable'}</Tag>
        <Tag color="blue">Uptime {diagnostics?.uptimeSeconds || 0}s</Tag>
        <Tag color="purple">Collections {diagnostics?.collectionCount || 0}</Tag>
        <Tag color="cyan">Documents {diagnostics?.totalDocuments || 0}</Tag>
      </div>

      <Card bordered={false} className="admin-data-table-card">
        <Suspense fallback={<LoadingScreen compact title="Loading DB status panels" description="Preparing health overview, collections, and backup tabs." />}>
          <DatabaseStatusTabs diagnostics={diagnostics} loading={loading} onExportCollection={exportCollection} />
        </Suspense>
      </Card>
    </AdminShell>
  );
}