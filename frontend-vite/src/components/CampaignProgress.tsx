/**
 * Campaign Progress Component
 * 
 * Real-time campaign progress monitoring with WebSocket integration
 * 
 * Features:
 * - Live progress bar
 * - Real-time stats updates
 * - WebSocket connection management
 * - Auto-reconnection
 * - Status indicators
 */

import React, { useState, useEffect, useRef } from 'react';
import { Progress, Card, Statistic, Row, Col, Tag, Spin } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';

interface CampaignStats {
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  messages_pending: number;
  delivery_rate: number | null;
  read_rate: number | null;
}

interface CampaignProgressData {
  campaign_id: string;
  campaign_name: string;
  status: string;
  progress: number;
  stats: CampaignStats;
  timestamp: string;
}

interface Props {
  campaignId: string;
  token: string;
  onComplete?: () => void;
}

export const CampaignProgress: React.FC<Props> = ({
  campaignId,
  token,
  onComplete,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [status, setStatus] = useState<string>('draft');
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // WebSocket connection
  useEffect(() => {
    connectWebSocket();

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [campaignId, token]);

  const connectWebSocket = () => {
    const wsUrl = `ws://localhost:8000/api/v1/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setWsConnected(true);

      // Join campaign room
      ws.send(
        JSON.stringify({
          action: 'join_room',
          room: `campaign:${campaignId}`,
        })
      );
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { event: eventType, data } = message;

      console.log('📨 WebSocket message:', eventType, data);

      if (eventType === 'campaign:progress') {
        handleProgressUpdate(data);
      } else if (eventType === 'room:joined') {
        console.log('📥 Joined room:', data.room);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('📡 WebSocket disconnected');
      setWsConnected(false);

      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Reconnecting...');
        connectWebSocket();
      }, 3000);
    };

    wsRef.current = ws;
  };

  const handleProgressUpdate = (data: CampaignProgressData) => {
    setProgress(data.progress);
    setStats(data.stats);
    setStatus(data.status);

    // Call onComplete callback if campaign is completed
    if (data.status === 'completed' && onComplete) {
      onComplete();
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      draft: 'default',
      scheduled: 'blue',
      running: 'processing',
      paused: 'warning',
      completed: 'success',
      failed: 'error',
      cancelled: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      draft: <ClockCircleOutlined />,
      scheduled: <ClockCircleOutlined />,
      running: <SyncOutlined spin />,
      paused: <ClockCircleOutlined />,
      completed: <CheckCircleOutlined />,
      failed: <CloseCircleOutlined />,
      cancelled: <CloseCircleOutlined />,
    };
    return icons[status] || <ClockCircleOutlined />;
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Campaign Progress</span>
          <div>
            <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
              {status.toUpperCase()}
            </Tag>
            {wsConnected ? (
              <Tag color="green">WebSocket Connected</Tag>
            ) : (
              <Tag color="red" icon={<SyncOutlined spin />}>
                Reconnecting...
              </Tag>
            )}
          </div>
        </div>
      }
    >
      {/* Progress Bar */}
      <div style={{ marginBottom: 24 }}>
        <Progress
          percent={Math.round(progress * 10) / 10}
          status={status === 'running' ? 'active' : status === 'completed' ? 'success' : 'normal'}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
      </div>

      {/* Statistics */}
      {stats && (
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Recipients"
              value={stats.total_recipients}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Sent"
              value={stats.messages_sent}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SyncOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Delivered"
              value={stats.messages_delivered}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
              suffix={
                stats.delivery_rate !== null && (
                  <span style={{ fontSize: '14px' }}>
                    ({stats.delivery_rate.toFixed(1)}%)
                  </span>
                )
              }
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Read"
              value={stats.messages_read}
              valueStyle={{ color: '#722ed1' }}
              prefix={<CheckCircleOutlined />}
              suffix={
                stats.read_rate !== null && (
                  <span style={{ fontSize: '14px' }}>
                    ({stats.read_rate.toFixed(1)}%)
                  </span>
                )
              }
            />
          </Col>
        </Row>
      )}

      {/* Secondary Stats */}
      {stats && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Statistic
              title="Failed"
              value={stats.messages_failed}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Pending"
              value={stats.messages_pending}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Success Rate"
              value={
                stats.delivery_rate !== null
                  ? stats.delivery_rate.toFixed(1)
                  : '0.0'
              }
              suffix="%"
              valueStyle={{
                color:
                  (stats.delivery_rate || 0) >= 90
                    ? '#52c41a'
                    : (stats.delivery_rate || 0) >= 70
                    ? '#faad14'
                    : '#cf1322',
              }}
            />
          </Col>
        </Row>
      )}

      {/* Loading state */}
      {!stats && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: '#999' }}>
            Waiting for campaign data...
          </p>
        </div>
      )}
    </Card>
  );
};

export default CampaignProgress;
