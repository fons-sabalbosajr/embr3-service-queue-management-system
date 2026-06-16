import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import LoadingScreen from "../../components/LoadingScreen";
import AdminShell from "./AdminShell";
import "./AdminDataTables.css";

const OfficerFormContent = lazy(() => import('./officers/OfficerFormContent'))
const OfficerAccessContent = lazy(() => import('./officers/OfficerAccessContent'))

const { Text } = Typography;

const TRANSACTION_OPTIONS = [
  "ECC/CNC",
  "PTO/DP/PCO",
  "HWG ID",
  "TECHNICAL CONFERNCE",
  "SMR/CMR",
];

const DEFAULT_OFFICER_ACCESS = [
  "dashboard",
  "queue-dashboard",
  "queue-officer",
  "queue-officer-serving-desk",
  "queue-officer-portal",
];

export default function SettingsAssignedOfficers() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [selectedAccessModules, setSelectedAccessModules] = useState(
    DEFAULT_OFFICER_ACCESS,
  );
  const [accountEnabled, setAccountEnabled] = useState(true);

  const loadOfficers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/queue-officers");
      setOfficers(data.officers || []);
    } catch (error) {
      message.error(
        error.response?.data?.message || "Unable to load queue officers.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  const openCreateModal = () => {
    setEditingOfficer(null);
    form.resetFields();
    form.setFieldsValue({
      status: "Available",
      username: "",
      password: "",
      accountStatus: "Active",
      accessModules: DEFAULT_OFFICER_ACCESS,
    });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingOfficer(record);
    form.setFieldsValue({
      name: record.name,
      username: record.username,
      position: record.position ? [record.position] : [],
      designation: record.designation,
      assignedTransaction: [record.assignedTransaction],
      status: record.status,
      password: "",
    });
    setModalOpen(true);
  };

  const openAccessModal = (record) => {
    setSelectedOfficer(record);
    setSelectedAccessModules(record.accessModules || DEFAULT_OFFICER_ACCESS);
    setAccountEnabled(record.accountStatus !== "Inactive");
    setAccessModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        position: Array.isArray(values.position)
          ? values.position[0]
          : values.position,
        assignedTransaction: Array.isArray(values.assignedTransaction)
          ? values.assignedTransaction[0]
          : values.assignedTransaction,
        accountStatus: values.accountStatus || "Active",
        accessModules: values.accessModules || DEFAULT_OFFICER_ACCESS,
      };

      if (!payload.password) {
        delete payload.password;
      }

      if (editingOfficer) {
        await apiClient.put(`/queue-officers/${editingOfficer._id}`, payload);
        message.success("Queue officer updated successfully.");
      } else {
        await apiClient.post("/queue-officers", payload);
        message.success("Queue officer created successfully.");
      }

      setModalOpen(false);
      form.resetFields();
      loadOfficers();
    } catch (error) {
      message.error(
        error.response?.data?.message || "Unable to save queue officer.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccess = async () => {
    if (!selectedOfficer) {
      return;
    }

    setAccessSaving(true);
    try {
      await apiClient.patch(`/queue-officers/${selectedOfficer._id}/access`, {
        accountStatus: accountEnabled ? "Active" : "Inactive",
        accessModules: selectedAccessModules,
      });
      message.success("Queue officer access updated successfully.");
      setAccessModalOpen(false);
      loadOfficers();
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          "Unable to update queue officer access.",
      );
    } finally {
      setAccessSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await apiClient.delete(`/queue-officers/${record._id}`);
      message.success("Queue officer deleted successfully.");
      loadOfficers();
    } catch (error) {
      message.error(
        error.response?.data?.message || "Unable to delete queue officer.",
      );
    }
  };

  const transactionOptions = useMemo(() => {
    const values = new Set([
      ...TRANSACTION_OPTIONS,
      ...officers.map((item) => item.assignedTransaction).filter(Boolean),
    ]);

    return Array.from(values).map((value) => ({ value, label: value }));
  }, [officers]);

  const columns = [
    {
      title: "Officer",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div className="admin-table-name">
          <span className="admin-pill-icon">
            <TeamOutlined />
          </span>
          <div>
            <strong>{record.name}</strong>
            <span className="admin-table-subtext">{record.employeeId}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Credentials",
      key: "credentials",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.username}</Text>
          <Text type="secondary">{record.accountStatus || "Active"}</Text>
        </Space>
      ),
    },
    {
      title: "Position",
      dataIndex: "position",
      key: "position",
    },
    {
      title: "Designation",
      dataIndex: "designation",
      key: "designation",
    },
    {
      title: "Assigned Transaction",
      dataIndex: "assignedTransaction",
      key: "assignedTransaction",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Menu Access",
      dataIndex: "accessModules",
      key: "accessModules",
      render: (value = []) =>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 260 }}>
          {value
            .filter((item) => item !== "queue-officer")
            .map((item) => (
              <Tag key={item} color="purple" style={{ margin: 0, whiteSpace: 'normal', height: 'auto', lineHeight: 1.2, paddingBlock: 4 }}>
                {item}
              </Tag>
            ))}
        </div>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag color={value === "Available" ? "green" : "red"}>{value}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />

          <Button
            icon={<SafetyCertificateOutlined />}
            onClick={() => openAccessModal(record)}
          >
            Manage
          </Button>
          <Popconfirm
            title="Delete this queue officer?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminShell
      title="Queue Assigned Officers Config"
      subtitle="Manage live queue officers, staffing status, and transaction assignments from MongoDB."
      extra={
        <div className="admin-data-toolbar">
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Add Queue Officer
          </Button>
        </div>
      }
    >
      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card bordered={false} className="admin-data-table-card">
            <Table
              className="admin-data-table"
              rowKey="_id"
              columns={columns}
              dataSource={officers}
              loading={loading}
              pagination={{ pageSize: 6 }}
              scroll={{ x: "max-content" }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingOfficer ? "Edit Queue Officer" : "Create Queue Officer"}
        open={modalOpen}
        onCancel={() => !saving && setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        closable={!saving}
        maskClosable={!saving}
        okText={editingOfficer ? "Save Changes" : "Create Officer"}
      >
        {saving ? (
          <LoadingScreen compact title="Saving queue officer" description="Validating credentials, position, and assigned transaction." />
        ) : (
        <Suspense fallback={<LoadingScreen compact title="Loading officer form" description="Preparing queue officer fields and validation rules." />}>
          <OfficerFormContent
            editingOfficer={editingOfficer}
            form={form}
            handleSubmit={handleSubmit}
            transactionOptions={transactionOptions}
          />
        </Suspense>
        )}
      </Modal>

      <Modal
        title={`Manage Access${selectedOfficer ? `: ${selectedOfficer.name}` : ""}`}
        open={accessModalOpen}
        onCancel={() => !accessSaving && setAccessModalOpen(false)}
        onOk={handleSaveAccess}
        confirmLoading={accessSaving}
        closable={!accessSaving}
        maskClosable={!accessSaving}
        okText="Save Access"
        width={760}
      >
        {accessSaving ? (
          <LoadingScreen compact title="Saving officer access" description="Updating sign-in state and menu visibility." />
        ) : (
        <Suspense fallback={<LoadingScreen compact title="Loading access controls" description="Preparing queue officer menu access options." />}>
          <OfficerAccessContent
            accountEnabled={accountEnabled}
            selectedAccessModules={selectedAccessModules}
            selectedOfficer={selectedOfficer}
            setAccountEnabled={setAccountEnabled}
            setSelectedAccessModules={setSelectedAccessModules}
          />
        </Suspense>
        )}
      </Modal>
    </AdminShell>
  );
}
