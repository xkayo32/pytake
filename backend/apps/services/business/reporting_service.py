"""
Reporting Service
Handles report generation, aggregation, and distribution
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from django.conf import settings
from apps.services.database.mongodb_service import MongoDBService
import logging
from io import BytesIO
import csv
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet

logger = logging.getLogger(__name__)


class ReportingService:
    """
    Service for generating various business reports
    Supports aggregation, filtering, and export to PDF/CSV
    """

    def __init__(self, organization_id: str = None):
        """
        Initialize reporting service

        Args:
            organization_id: Organization UUID for multi-tenancy
        """
        self.organization_id = organization_id
        self.mongo_service = MongoDBService(organization_id=organization_id)

    def generate_campaign_report(
        self,
        days: int = 30,
        format: str = 'dict',  # 'dict', 'csv', 'pdf'
    ) -> Dict:
        """
        Generate campaign performance report

        Args:
            days: Number of days to include
            format: Output format

        Returns:
            Report data or file bytes
        """
        try:
            # Get daily stats
            stats = self.mongo_service.get_daily_stats(
                metric_type='campaigns_executed',
                days=days,
            )

            # Aggregate data
            total_campaigns = sum(s['count'] for s in stats)
            avg_per_day = total_campaigns / days if days > 0 else 0

            report_data = {
                'title': 'Campaign Performance Report',
                'period': f'Last {days} days',
                'generated_at': datetime.utcnow().isoformat(),
                'metrics': {
                    'total_campaigns': total_campaigns,
                    'average_per_day': round(avg_per_day, 2),
                    'daily_breakdown': stats,
                },
            }

            if format == 'csv':
                return self._dict_to_csv(report_data)
            elif format == 'pdf':
                return self._dict_to_pdf(report_data)

            return report_data

        except Exception as e:
            logger.error(f"❌ Error generating campaign report: {e}")
            raise

    def generate_conversation_report(
        self,
        days: int = 30,
        format: str = 'dict',
    ) -> Dict:
        """
        Generate conversation analytics report

        Args:
            days: Number of days to include
            format: Output format

        Returns:
            Report data or file bytes
        """
        try:
            # Get daily stats
            stats = self.mongo_service.get_daily_stats(
                metric_type='conversations_closed',
                days=days,
            )

            # Aggregate data
            total_conversations = sum(s['total'] for s in stats)
            total_resolution_time = sum(s['total'] for s in stats)
            avg_resolution_time = total_resolution_time / total_conversations if total_conversations > 0 else 0

            report_data = {
                'title': 'Conversation Analytics Report',
                'period': f'Last {days} days',
                'generated_at': datetime.utcnow().isoformat(),
                'metrics': {
                    'total_conversations': int(total_conversations),
                    'average_resolution_time': round(avg_resolution_time, 2),
                    'daily_breakdown': stats,
                },
            }

            if format == 'csv':
                return self._dict_to_csv(report_data)
            elif format == 'pdf':
                return self._dict_to_pdf(report_data)

            return report_data

        except Exception as e:
            logger.error(f"❌ Error generating conversation report: {e}")
            raise

    def generate_message_report(
        self,
        days: int = 30,
        format: str = 'dict',
    ) -> Dict:
        """
        Generate messaging activity report

        Args:
            days: Number of days to include
            format: Output format

        Returns:
            Report data or file bytes
        """
        try:
            # Get daily stats
            stats = self.mongo_service.get_daily_stats(
                metric_type='messages_sent',
                days=days,
            )

            # Aggregate data
            total_messages = sum(s['total'] for s in stats)
            avg_per_day = total_messages / days if days > 0 else 0

            report_data = {
                'title': 'Messaging Activity Report',
                'period': f'Last {days} days',
                'generated_at': datetime.utcnow().isoformat(),
                'metrics': {
                    'total_messages': int(total_messages),
                    'average_per_day': round(avg_per_day, 2),
                    'daily_breakdown': stats,
                },
            }

            if format == 'csv':
                return self._dict_to_csv(report_data)
            elif format == 'pdf':
                return self._dict_to_pdf(report_data)

            return report_data

        except Exception as e:
            logger.error(f"❌ Error generating message report: {e}")
            raise

    def generate_audit_report(
        self,
        days: int = 30,
        action_filter: Optional[str] = None,
        format: str = 'dict',
    ) -> Dict:
        """
        Generate audit trail report

        Args:
            days: Number of days to include
            action_filter: Filter by action (create, update, delete)
            format: Output format

        Returns:
            Report data or file bytes
        """
        try:
            # Get audit logs from MongoDB
            collection = self.mongo_service.audit_logger.collection

            query = {
                'organization_id': str(self.organization_id),
                'created_at': {
                    '$gte': datetime.utcnow() - timedelta(days=days)
                },
            }

            if action_filter:
                query['action'] = action_filter

            logs = list(
                collection.find(query)
                .sort('created_at', -1)
                .limit(1000)
            )

            # Group by action
            action_counts = {}
            for log in logs:
                action = log.get('action', 'unknown')
                action_counts[action] = action_counts.get(action, 0) + 1

            report_data = {
                'title': 'Audit Trail Report',
                'period': f'Last {days} days',
                'generated_at': datetime.utcnow().isoformat(),
                'metrics': {
                    'total_events': len(logs),
                    'action_breakdown': action_counts,
                    'recent_events': [
                        {
                            'action': log.get('action'),
                            'resource_type': log.get('resource_type'),
                            'user_id': log.get('user_id'),
                            'created_at': log.get('created_at').isoformat(),
                        }
                        for log in logs[:10]
                    ],
                },
            }

            if format == 'csv':
                return self._dict_to_csv(report_data)
            elif format == 'pdf':
                return self._dict_to_pdf(report_data)

            return report_data

        except Exception as e:
            logger.error(f"❌ Error generating audit report: {e}")
            raise

    def generate_summary_report(
        self,
        days: int = 30,
        format: str = 'dict',
    ) -> Dict:
        """
        Generate executive summary report with all metrics

        Args:
            days: Number of days to include
            format: Output format

        Returns:
            Report data or file bytes
        """
        try:
            # Get all key metrics
            campaigns = self.mongo_service.get_daily_stats(
                'campaigns_executed',
                days=days,
            )
            messages = self.mongo_service.get_daily_stats(
                'messages_sent',
                days=days,
            )
            conversations = self.mongo_service.get_daily_stats(
                'conversations_closed',
                days=days,
            )

            report_data = {
                'title': 'Executive Summary Report',
                'period': f'Last {days} days',
                'generated_at': datetime.utcnow().isoformat(),
                'summary': {
                    'total_campaigns': sum(c['count'] for c in campaigns),
                    'total_messages': sum(m['total'] for m in messages),
                    'total_conversations': sum(c['total'] for c in conversations),
                },
                'daily_metrics': {
                    'campaigns': campaigns[-7:],  # Last 7 days
                    'messages': messages[-7:],
                    'conversations': conversations[-7:],
                },
            }

            logger.info(f"📊 Summary report generated")

            if format == 'csv':
                return self._dict_to_csv(report_data)
            elif format == 'pdf':
                return self._dict_to_pdf(report_data)

            return report_data

        except Exception as e:
            logger.error(f"❌ Error generating summary report: {e}")
            raise

    def _dict_to_csv(self, data: Dict) -> bytes:
        """Convert report dict to CSV format"""
        output = BytesIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([data.get('title', 'Report')])
        writer.writerow([f"Generated: {data.get('generated_at')}"])
        writer.writerow([])

        # Write metrics
        writer.writerow(['Metric', 'Value'])
        if 'metrics' in data:
            for key, value in data['metrics'].items():
                if not isinstance(value, (list, dict)):
                    writer.writerow([key, value])
        elif 'summary' in data:
            for key, value in data['summary'].items():
                writer.writerow([key, value])

        output.seek(0)
        return output.getvalue()

    def _dict_to_pdf(self, data: Dict) -> bytes:
        """Convert report dict to PDF format"""
        output = BytesIO()
        doc = SimpleDocTemplate(
            output,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        styles = getSampleStyleSheet()
        story = []

        # Title
        story.append(Paragraph(data.get('title', 'Report'), styles['Heading1']))
        story.append(Spacer(1, 0.3 * 72))

        # Period
        story.append(
            Paragraph(
                f"Period: {data.get('period')} | Generated: {data.get('generated_at')}",
                styles['Normal'],
            )
        )
        story.append(Spacer(1, 0.2 * 72))

        # Metrics table
        table_data = [['Metric', 'Value']]

        if 'metrics' in data:
            for key, value in data['metrics'].items():
                if not isinstance(value, (list, dict)):
                    table_data.append([key, str(value)])
        elif 'summary' in data:
            for key, value in data['summary'].items():
                table_data.append([key, str(value)])

        if len(table_data) > 1:
            table = Table(table_data)
            table.setStyle(
                TableStyle(
                    [
                        ('BACKGROUND', (0, 0), (-1, 0), (0.8, 0.8, 0.8)),
                        ('TEXTCOLOR', (0, 0), (-1, 0), (0, 0, 0)),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 12),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('GRID', (0, 0), (-1, -1), 1, (0.5, 0.5, 0.5)),
                    ]
                )
            )
            story.append(table)

        doc.build(story)
        output.seek(0)
        return output.getvalue()

    def schedule_report(
        self,
        report_type: str,
        email: str,
        frequency: str = 'weekly',  # daily, weekly, monthly
        format: str = 'pdf',
    ) -> Dict:
        """
        Schedule automated report delivery

        Args:
            report_type: Type of report (campaign, conversation, message, audit, summary)
            email: Recipient email
            frequency: Report frequency
            format: Report format (pdf, csv)

        Returns:
            Dict with schedule info
        """
        try:
            schedule_info = {
                'report_type': report_type,
                'email': email,
                'frequency': frequency,
                'format': format,
                'created_at': datetime.utcnow().isoformat(),
                'status': 'active',
            }

            # TODO: Store in database for scheduling

            logger.info(f"📅 Report scheduled: {report_type} to {email}")

            if self.organization_id:
                self.mongo_service.store_event(
                    event_type='ReportScheduled',
                    event_data=schedule_info,
                    aggregate_id=self.organization_id,
                    aggregate_type='organization',
                )

            return schedule_info

        except Exception as e:
            logger.error(f"❌ Error scheduling report: {e}")
            raise
