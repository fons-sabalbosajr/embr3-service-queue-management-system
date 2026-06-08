import { BellOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, InputNumber, Row, Col, Select, Statistic, Switch } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import AdminShell from './AdminShell';
import './AdminDataTables.css';

export default function DeveloperDisplayConfig() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/queue-display');
      setConfig(data.config);
      form.setFieldsValue({
        refreshSeconds: data.config.refreshSeconds,
        density: data.config.density,
        soundAlerts: data.config.soundAlerts,
      });
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load display config.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const stats = useMemo(
    () => ({
      refreshSeconds: config?.refreshSeconds || 0,
      density: config?.density || 'Comfortable',
      soundAlerts: config?.soundAlerts ? 'Enabled' : 'Disabled',
    }),
    [config]
  );

  const handleSave = async (values) => {
    setSaving(true);
    try {
      await apiClient.put('/queue-display/settings', values);
      message.success('Display configuration updated successfully.');
      loadConfig();
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to save display config.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Display Config"
      subtitle="Developer-level controls for the public display refresh cycle, density, and audio behavior."
    >
      <div className="admin-data-stat-grid" style={{ marginBottom: 20 }}>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Refresh Seconds" value={stats.refreshSeconds} prefix={<SyncOutlined />} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Density" value={stats.density} />
        </Card>
        <Card bordered={false} className="admin-data-stat-card">
          <Statistic title="Sound Alerts" value={stats.soundAlerts} prefix={<BellOutlined />} />
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card bordered={false} className="admin-data-table-card" loading={loading}>
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item label="Refresh interval (seconds)" name="refreshSeconds">
                <InputNumber min={1} max={60} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Default display density" name="density">
                <Select
                  options={[
                    { value: 'Comfortable', label: 'Comfortable' },
                    { value: 'Compact', label: 'Compact' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="Enable audio call alerts" name="soundAlerts" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                Save Display Config
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </AdminShell>
  );
}
