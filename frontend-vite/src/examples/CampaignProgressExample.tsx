/**
 * Campaign Progress with Custom Hook
 * 
 * Simplified version using useWebSocket hook
 */

import React, { useState, useEffect } from 'react';
import { Progress, Card, Statistic, Row, Col, Tag } from 'antd';
import { CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useWebSocket } from '../hooks/useWebSocket';

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

interface Props {
  campaignId: string;
  token: string;
}

export const CampaignProgressSimple: React.FC<Props> = ({ campaignId, token }) => {
  const [progress, setProgress] = useState<number>(0);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [status, setStatus] = useState<string>('draft');

  const { connected, joinRoom, subscribe } = useWebSocket({
    token,
    autoConnect: true,
  });

  // Join campaign room on mount
  useEffect(() => {
    if (connected) {
      joinRoom(`campaign:${campaignId}`);
    }
  }, [connected, campaignId, joinRoom]);

  // Subscribe to campaign progress events
  useEffect(() => {
    const unsubscribe = subscribe('campaign:progress', (data) => {
      setProgress(data.progress);
      setStats(data.stats);
      setStatus(data.status);
    });

    return unsubscribe;
  }, [subscribe]);

  return (
    <Card
      title="Campaign Progress"
      extra={
        <Tag color={connected ? 'green' : 'red'}>
          {connected ? 'Connected' : 'Disconnected'}
        </Tag>
      }
    >
      <Progress percent={Math.round(progress * 10) / 10} status="active" />

      {stats && (
        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={6}>
            <Statistic title="Sent" value={stats.messages_sent} />
          </Col>
          <Col span={6}>
            <Statistic
              title="Delivered"
              value={stats.messages_delivered}
              suffix={`(${stats.delivery_rate?.toFixed(1)}%)`}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Read"
              value={stats.messages_read}
              suffix={`(${stats.read_rate?.toFixed(1)}%)`}
            />
          </Col>
          <Col span={6}>
            <Statistic title="Failed" value={stats.messages_failed} />
          </Col>
        </Row>
      )}
    </Card>
  );
};

// Example usage in a page component
export const CampaignDetailPage: React.FC = () => {
  const campaignId = 'uuid-from-route';
  const token = 'jwt-token-from-auth';

  return (
    <div>
      <h1>Campaign Detail</h1>
      <CampaignProgressSimple campaignId={campaignId} token={token} />
    </div>
  );
};
