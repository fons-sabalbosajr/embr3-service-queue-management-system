import { LoadingOutlined } from '@ant-design/icons'
import { Progress, Space, Spin, Typography } from 'antd'
import { useEffect, useState } from 'react'

const { Text, Title } = Typography

export default function LoadingScreen({
  title = 'Loading workspace',
  description = 'Preparing data, permissions, and page state.',
  compact = false,
}) {
  const [progress, setProgress] = useState(18)

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current
        return current + Math.max(2, Math.round((100 - current) / 10))
      })
    }, 180)

    return () => clearInterval(id)
  }, [])

  return (
    <div
      style={{
        minHeight: compact ? 260 : '100vh',
        display: 'grid',
        placeItems: 'center',
        background: compact
          ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
          : 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 48%, #fff7ed 100%)',
        borderRadius: compact ? 18 : 0,
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(460px, 100%)',
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(148,163,184,0.22)',
          borderRadius: 22,
          boxShadow: '0 20px 60px -34px rgba(15,23,42,0.35)',
          padding: compact ? '26px 22px' : '32px 28px',
        }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 12px 28px -18px rgba(29,78,216,0.8)',
              }}
            >
              <Spin indicator={<LoadingOutlined style={{ color: '#fff', fontSize: 24 }} spin />} />
            </div>
            <div>
              <Title level={compact ? 5 : 4} style={{ margin: 0 }}>
                {title}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {description}
              </Text>
            </div>
          </div>

          <Progress
            percent={progress}
            status="active"
            strokeColor={{ from: '#1d4ed8', to: '#f97316' }}
            trailColor="#e2e8f0"
            showInfo={false}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1d4ed8' }}>
              Lazy loading enabled
            </Text>
            <Text style={{ fontSize: 11, color: '#64748b' }}>{progress}%</Text>
          </div>
        </Space>
      </div>
    </div>
  )
}