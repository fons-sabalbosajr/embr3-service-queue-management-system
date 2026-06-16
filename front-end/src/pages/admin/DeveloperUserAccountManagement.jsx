import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { Suspense, lazy, useEffect, useState } from 'react'
import apiClient from '../../api/client'
import LoadingScreen from '../../components/LoadingScreen'
import { useAuth } from '../../context/AuthContext'
import AdminShell from './AdminShell'
import './AdminDataTables.css'

const UserFormContent = lazy(() => import('./users/UserFormContent'))
const UserAccessContent = lazy(() => import('./users/UserAccessContent'))

const { Text } = Typography

function accessModulesForRole(role) {
  switch (role) {
    case 'Super Admin/Developer':
      return [
        'dashboard',
        'developer',
        'settings',
        'queue-officer',
        'queue-officer-serving-desk',
        'queue-officer-portal',
        'queue-number-initialization',
        'secretariat',
        'queue-dashboard',
      ]
    case 'Admin':
      return ['dashboard', 'settings', 'queue-dashboard']
    case 'Queue Officer':
      return [
        'dashboard',
        'queue-officer',
        'queue-officer-serving-desk',
        'queue-officer-portal',
        'queue-number-initialization',
        'queue-dashboard',
      ]
    case 'Queue Number Officer':
      return ['dashboard', 'queue-officer', 'queue-number-initialization', 'queue-dashboard']
    case 'Secretariat':
      return ['dashboard', 'secretariat', 'queue-dashboard']
    default:
      return ['dashboard']
  }
}

export default function DeveloperUserAccountManagement() {
  const { message } = App.useApp()
  const { admin } = useAuth()
  const [form] = Form.useForm()
  const [accessForm] = Form.useForm()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accessSaving, setAccessSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [accessModalOpen, setAccessModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  const selectedCreateRole = Form.useWatch('role', form)
  const selectedAccessRole = Form.useWatch('role', accessForm)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/admin-users')
      setUsers(data.admins || [])
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load user accounts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const openCreateModal = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({
      role: 'Queue Officer',
      status: 'Active',
      accessModules: accessModulesForRole('Queue Officer'),
    })
    setModalOpen(true)
  }

  const openEditModal = (record) => {
    setEditingUser(record)
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      role: record.role,
      status: record.status,
      accessModules: record.accessModules || ['dashboard'],
      password: '',
    })
    setModalOpen(true)
  }

  const openAccessModal = (record) => {
    setSelectedUser(record)
    accessForm.setFieldsValue({
      role: record.role,
      status: record.status,
      accessModules: record.accessModules || ['dashboard'],
    })
    setAccessModalOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      const payload = {
        name: values.name,
        email: values.email,
        role: values.role,
        status: values.status,
        accessModules: values.accessModules,
      }

      if (values.password) {
        payload.password = values.password
      }

      if (editingUser) {
        await apiClient.put(`/admin-users/${editingUser.id}`, payload)
        message.success('User account updated successfully.')
      } else {
        await apiClient.post('/admin-users', {
          ...payload,
          password: values.password,
        })
        message.success('User account created successfully.')
      }

      setModalOpen(false)
      form.resetFields()
      loadUsers()
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to save user account.')
    } finally {
      setSaving(false)
    }
  }

  const handleAccessSave = async (values) => {
    if (!selectedUser) return

    setAccessSaving(true)
    try {
      await apiClient.patch(`/admin-users/${selectedUser.id}/access`, values)
      message.success('Access permissions updated successfully.')
      setAccessModalOpen(false)
      loadUsers()
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to update access permissions.')
    } finally {
      setAccessSaving(false)
    }
  }

  const handleDelete = async (record) => {
    try {
      await apiClient.delete(`/admin-users/${record.id}`)
      message.success('User account deleted successfully.')
      loadUsers()
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to delete user account.')
    }
  }

  const handleRoleChange = (value) => {
    form.setFieldValue('accessModules', accessModulesForRole(value))
  }

  const handleAccessRoleChange = (value) => {
    accessForm.setFieldValue('accessModules', accessModulesForRole(value))
  }

  const columns = [
    {
      title: 'Administrator',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div className="admin-table-name">
          <span className="admin-pill-icon">
            <UserOutlined />
          </span>
          <div>
            <strong>{record.name}</strong>
            <span className="admin-table-subtext">{record.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => (
        <Tag color={value === 'Active' ? 'green' : value === 'Pending' ? 'gold' : 'red'}>
          {value}
        </Tag>
      ),
    },
    {
      title: 'Access',
      dataIndex: 'accessModules',
      key: 'accessModules',
      render: (value = []) =>
        value.slice(0, 2).map((item) => (
          <Tag key={item} color="purple">
            {item}
          </Tag>
        )),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Button icon={<SafetyCertificateOutlined />} onClick={() => openAccessModal(record)}>
            Manage Access
          </Button>
          <Popconfirm
            title="Delete this user account?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record)}
            disabled={record.id === admin?.id}
          >
            <Button danger icon={<DeleteOutlined />} disabled={record.id === admin?.id}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <AdminShell
      title="User Account Management"
      subtitle="Manage administrator accounts, access levels, and activation state from MongoDB."
      extra={
        <div className="admin-data-toolbar">
          <Text type="secondary">
            Create administrators, update their profile, and manage system access per user.
          </Text>
          <Space wrap>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Add Administrator
            </Button>
          </Space>
        </div>
      }
    >
      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card bordered={false} className="admin-data-table-card">
            <Table
              className="admin-data-table"
              columns={columns}
              dataSource={users}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingUser ? 'Edit User Account' : 'Create User Account'}
        open={modalOpen}
        onCancel={() => !saving && setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        closable={!saving}
        maskClosable={!saving}
        okText={editingUser ? 'Save Changes' : 'Create User'}
      >
        {saving ? (
          <LoadingScreen compact title="Saving user account" description="Validating role, access modules, and account details." />
        ) : (
          <Suspense fallback={<LoadingScreen compact title="Loading user form" description="Preparing account fields, roles, and access defaults." />}>
            <UserFormContent
              editingUser={editingUser}
              form={form}
              handleRoleChange={handleRoleChange}
              handleSubmit={handleSubmit}
              selectedCreateRole={selectedCreateRole}
            />
          </Suspense>
        )}
      </Modal>

      <Modal
        title={`Manage Access${selectedUser ? `: ${selectedUser.name}` : ''}`}
        open={accessModalOpen}
        onCancel={() => !accessSaving && setAccessModalOpen(false)}
        onOk={() => accessForm.submit()}
        confirmLoading={accessSaving}
        closable={!accessSaving}
        maskClosable={!accessSaving}
        okText="Save Access"
      >
        {accessSaving ? (
          <LoadingScreen compact title="Saving access rules" description="Updating role defaults and page permissions." />
        ) : (
          <Suspense fallback={<LoadingScreen compact title="Loading access form" description="Preparing role-based permission controls." />}>
            <UserAccessContent
              accessForm={accessForm}
              handleAccessRoleChange={handleAccessRoleChange}
              handleAccessSave={handleAccessSave}
              selectedAccessRole={selectedAccessRole}
            />
          </Suspense>
        )}
      </Modal>
    </AdminShell>
  )
}