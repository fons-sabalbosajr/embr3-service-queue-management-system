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
  Col,
  Descriptions,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

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

  const collectionColumns = [
    {
      title: 'Collection',
      dataIndex: 'name',
      key: 'name',
      render: (value) => (
        <Space>
          <DatabaseOutlined />
          <strong>{value}</strong>
        </Space>
      ),
    },
    {
      title: 'Documents',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => exportCollection(record.name)}>
          Export
        </Button>
      ),
    },
  ];

  const backupColumns = [
    { title: 'Label', dataIndex: 'label', key: 'label' },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy' },
    { title: 'Collections', dataIndex: 'collectionCount', key: 'collectionCount' },
    { title: 'Documents', dataIndex: 'documentCount', key: 'documentCount' },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => new Date(value).toLocaleString(),
    },
  ];

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
      <div className="admin-data-stat-grid" style={{ marginBottom: 20 }}>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Uptime (sec)" value={diagnostics?.uptimeSeconds || 0} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Collections" value={diagnostics?.collectionCount || 0} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Total Documents" value={diagnostics?.totalDocuments || 0} />
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card title="Connection Health" bordered={false} className="admin-data-table-card">
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <Descriptions column={1} bordered size="middle">
                <Descriptions.Item label="API Status">
                  <Tag color={diagnostics?.status === 'ok' ? 'green' : 'red'}>
                    {diagnostics?.status || 'unknown'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Database">
                  <Tag
                    color={diagnostics?.database === 'connected' ? 'green' : 'gold'}
                  >
                    {diagnostics?.database || 'unavailable'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Database Name">{diagnostics?.databaseName || 'Unavailable'}</Descriptions.Item>
                <Descriptions.Item label="Mongo Version">{diagnostics?.mongoVersion || 'Unavailable'}</Descriptions.Item>
                <Descriptions.Item label="Node Version">{diagnostics?.nodeVersion || 'Unavailable'}</Descriptions.Item>
                <Descriptions.Item label="Host">{diagnostics?.host || 'Unavailable'}</Descriptions.Item>
                <Descriptions.Item label="Port">{diagnostics?.port || 'Unavailable'}</Descriptions.Item>
                <Descriptions.Item label="Server Time">{diagnostics?.serverTime ? new Date(diagnostics.serverTime).toLocaleString() : 'Unavailable'}</Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Connection Summary" bordered={false} className="admin-data-side-card">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Primary Database">
                <CloudServerOutlined style={{ marginRight: 8 }} /> MongoDB Atlas
              </Descriptions.Item>
              <Descriptions.Item label="Connection Mode">
                <LinkOutlined style={{ marginRight: 8 }} /> TLS secured
              </Descriptions.Item>
              <Descriptions.Item label="Observed State">
                {diagnostics?.database === 'connected'
                  ? 'Realtime connection established'
                  : 'Waiting for status response'}
              </Descriptions.Item>
              <Descriptions.Item label="Connections">
                {diagnostics?.connections
                  ? `${diagnostics.connections.current || 0} current / ${diagnostics.connections.available || 0} available`
                  : 'Unavailable'}
              </Descriptions.Item>
              <Descriptions.Item label="Memory RSS">
                {diagnostics?.memoryUsage?.rss
                  ? `${Math.round(diagnostics.memoryUsage.rss / 1024 / 1024)} MB`
                  : 'Unavailable'}
              </Descriptions.Item>
              <Descriptions.Item label="App Logs Stored">
                {diagnostics?.logCount ?? 'Unavailable'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} xl={14}>
          <Card title="Collections" bordered={false} className="admin-data-table-card">
            <Table
              rowKey="name"
              columns={collectionColumns}
              dataSource={diagnostics?.collections || []}
              loading={loading}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Backup Snapshots" bordered={false} className="admin-data-table-card">
            <Table
              rowKey="_id"
              columns={backupColumns}
              dataSource={diagnostics?.backups || []}
              loading={loading}
              pagination={{ pageSize: 4 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>
    </AdminShell>
  );
}