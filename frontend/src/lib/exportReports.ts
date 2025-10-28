import { QueueMetrics, Queue } from '@/types/queue';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/formatNumber';

/**
 * Export queue metrics to CSV format
 */
export function exportQueueMetricsToCSV(
  queue: Queue,
  metrics: QueueMetrics,
  days: number
): void {
  const periodLabel = days === 1 ? 'Hoje' : `${days} dias`;
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `metricas_${queue.slug}_${timestamp}.csv`;

  // CSV header and rows
  const csvContent = [
    // Header
    ['Métricas da Fila', queue.name],
    ['Período', periodLabel],
    ['Gerado em', format(new Date(), 'dd/MM/yyyy HH:mm')],
    [''],
    
    // Volume metrics
    ['MÉTRICAS DE VOLUME', ''],
    ['Total de Conversas', metrics.total_conversations],
    ['Conversas Hoje', metrics.conversations_today],
    ['Conversas (7 dias)', metrics.conversations_7d],
    ['Conversas (30 dias)', metrics.conversations_30d],
    ['Na Fila Agora', metrics.queued_now],
    ['Ativas Agora', metrics.active_now],
    ['Fechadas Hoje', metrics.closed_today],
    [''],
    
    // Time metrics
    ['TEMPOS MÉDIOS', ''],
    ['Tempo de Espera (segundos)', metrics.avg_wait_time || 0],
    ['Tempo de Resposta (segundos)', metrics.avg_response_time || 0],
    ['Tempo de Resolução (segundos)', metrics.avg_resolution_time || 0],
    [''],
    
    // SLA metrics
    ['MÉTRICAS DE SLA', ''],
    ['Violações Hoje', metrics.sla_violations_today],
    ['Violações (7 dias)', metrics.sla_violations_7d],
  ['Taxa de Compliance (%)', metrics.sla_compliance_rate !== null ? formatNumber(metrics.sla_compliance_rate * 100, 2) : 'N/A'],
    [''],
    
    // Quality metrics
    ['QUALIDADE', ''],
  ['Taxa de Resolução (%)', metrics.resolution_rate !== null ? formatNumber(metrics.resolution_rate * 100, 2) : 'N/A'],
  ['CSAT Score', metrics.csat_score !== null ? formatNumber(metrics.csat_score, 2) : 'N/A'],
    [''],
    
    // Volume by hour
    ['VOLUME POR HORA (últimas 24h)', ''],
    ['Hora', 'Conversas'],
    ...metrics.volume_by_hour.map(v => [v.hour + 'h', v.count]),
  ];

  // Convert to CSV string
  const csv = csvContent.map(row => row.join(',')).join('\n');

  // Download
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export comparison of multiple queues to CSV
 */
export function exportQueueComparisonToCSV(
  queues: Queue[],
  metricsMap: Record<string, QueueMetrics>,
  days: number
): void {
  const periodLabel = days === 1 ? 'Hoje' : `${days} dias`;
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `comparacao_filas_${timestamp}.csv`;

  // CSV header
  const csvContent = [
    ['Comparação de Filas'],
    ['Período', periodLabel],
    ['Gerado em', format(new Date(), 'dd/MM/yyyy HH:mm')],
    [''],
    [
      'Fila',
      'Total Conversas',
      'Hoje',
      'Na Fila',
      'Espera Média (seg)',
      'Resposta Média (seg)',
      'Resolução Média (seg)',
      'SLA Compliance (%)',
      'Violações (7d)',
      'Taxa Resolução (%)',
      'CSAT',
    ],
  ];

  // Add row for each queue
  queues.forEach(queue => {
    const metrics = metricsMap[queue.id];
    if (!metrics) return;

    csvContent.push([
      queue.name,
      metrics.total_conversations.toString(),
      metrics.conversations_today.toString(),
      metrics.queued_now.toString(),
      (metrics.avg_wait_time || 0).toString(),
      (metrics.avg_response_time || 0).toString(),
      (metrics.avg_resolution_time || 0).toString(),
  metrics.sla_compliance_rate !== null ? formatNumber(metrics.sla_compliance_rate * 100, 2) : 'N/A',
      metrics.sla_violations_7d.toString(),
  metrics.resolution_rate !== null ? formatNumber(metrics.resolution_rate * 100, 2) : 'N/A',
  metrics.csat_score !== null ? formatNumber(metrics.csat_score, 2) : 'N/A',
    ]);
  });

  const csv = csvContent.map(row => row.join(',')).join('\n');
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export queue metrics to PDF format (simple text-based)
 */
export function exportQueueMetricsToPDF(
  queue: Queue,
  metrics: QueueMetrics,
  days: number
): void {
  const periodLabel = days === 1 ? 'Hoje' : `${days} dias`;
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `metricas_${queue.slug}_${timestamp}.pdf`;

  // Create HTML content for PDF
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Métricas - ${queue.name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      color: #333;
    }
    h1 {
      color: ${queue.color};
      border-bottom: 3px solid ${queue.color};
      padding-bottom: 10px;
    }
    h2 {
      color: #555;
      margin-top: 30px;
      border-left: 4px solid ${queue.color};
      padding-left: 10px;
    }
    .header {
      margin-bottom: 30px;
    }
    .info {
      color: #666;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: ${queue.color};
    }
    .good { color: #10b981; }
    .warning { color: #f59e0b; }
    .bad { color: #ef4444; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Métricas da Fila: ${queue.name}</h1>
    <p class="info">
      <strong>Período:</strong> ${periodLabel}<br>
      <strong>Gerado em:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}<br>
      <strong>Departamento:</strong> ${queue.department_id}
    </p>
  </div>

  <h2>📈 Métricas de Volume</h2>
  <div class="grid">
    <div class="card">
      <div class="metric-value">${metrics.total_conversations}</div>
      <div>Total de Conversas</div>
    </div>
    <div class="card">
      <div class="metric-value">${metrics.conversations_today}</div>
      <div>Conversas Hoje</div>
    </div>
    <div class="card">
      <div class="metric-value">${metrics.queued_now}</div>
      <div>Na Fila Agora</div>
    </div>
    <div class="card">
      <div class="metric-value">${metrics.closed_today}</div>
      <div>Fechadas Hoje</div>
    </div>
  </div>

  <h2>⏱️ Tempos Médios</h2>
  <table>
    <tr>
      <th>Métrica</th>
      <th>Valor</th>
    </tr>
    <tr>
      <td>Tempo de Espera</td>
      <td class="${getSLAClass(metrics.avg_wait_time)}">${formatTime(metrics.avg_wait_time)}</td>
    </tr>
    <tr>
      <td>Tempo de Resposta</td>
      <td class="${getSLAClass(metrics.avg_response_time)}">${formatTime(metrics.avg_response_time)}</td>
    </tr>
    <tr>
      <td>Tempo de Resolução</td>
      <td class="${getSLAClass(metrics.avg_resolution_time)}">${formatTime(metrics.avg_resolution_time)}</td>
    </tr>
  </table>

  <h2>🎯 SLA e Qualidade</h2>
  <table>
    <tr>
      <th>Métrica</th>
      <th>Valor</th>
    </tr>
    <tr>
      <td>SLA Compliance</td>
      <td class="${getComplianceClass(metrics.sla_compliance_rate)}">
  ${metrics.sla_compliance_rate !== null ? formatNumber(metrics.sla_compliance_rate * 100, 1) + '%' : 'N/A'}
      </td>
    </tr>
    <tr>
      <td>Violações Hoje</td>
      <td>${metrics.sla_violations_today}</td>
    </tr>
    <tr>
      <td>Violações (7 dias)</td>
      <td>${metrics.sla_violations_7d}</td>
    </tr>
    <tr>
      <td>Taxa de Resolução</td>
  <td>${metrics.resolution_rate !== null ? formatNumber(metrics.resolution_rate * 100, 1) + '%' : 'N/A'}</td>
    </tr>
    <tr>
      <td>CSAT Score</td>
  <td>${metrics.csat_score !== null ? formatNumber(metrics.csat_score, 2) + ' ★' : 'N/A'}</td>
    </tr>
  </table>

  <h2>📊 Volume por Hora (últimas 24h)</h2>
  <table>
    <tr>
      <th>Hora</th>
      <th>Conversas</th>
    </tr>
    ${metrics.volume_by_hour.map(v => `
      <tr>
        <td>${v.hour}h</td>
        <td>${v.count}</td>
      </tr>
    `).join('')}
  </table>

  <div class="footer">
    Relatório gerado automaticamente pelo PyTake - Customer Service Platform
  </div>
</body>
</html>
  `;

  // Convert HTML to PDF using browser print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      // Note: User needs to "Save as PDF" in print dialog
    };
  }
}

// Helper functions
function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function getSLAClass(seconds: number | null): string {
  if (seconds === null) return '';
  if (seconds < 300) return 'good'; // < 5min
  if (seconds < 900) return 'warning'; // < 15min
  return 'bad';
}

function getComplianceClass(rate: number | null): string {
  if (rate === null) return '';
  if (rate >= 0.9) return 'good';
  if (rate >= 0.7) return 'warning';
  return 'bad';
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
