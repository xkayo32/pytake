# PyTake Monitoring and Observability

This directory contains comprehensive monitoring and observability configurations for the PyTake backend system.

## Overview

The monitoring stack provides full observability into the PyTake system with:

- **Metrics Collection**: Prometheus metrics for API performance, business KPIs, and system health
- **Distributed Tracing**: OpenTelemetry tracing with Jaeger for request flow visualization
- **Log Aggregation**: Structured logging with Loki and Promtail
- **Alerting**: Comprehensive alerting rules with Alertmanager
- **Visualization**: Rich Grafana dashboards for all aspects of the system
- **Health Monitoring**: Advanced health checks with dependency validation

## Components

### Core Monitoring Services

1. **Prometheus** (Port: 9090)
   - Metrics collection and storage
   - Recording rules for performance optimization
   - Alert rule evaluation

2. **Grafana** (Port: 3000)
   - Metrics visualization
   - Dashboard management
   - Alerting interface
   - Default login: admin/admin123

3. **Jaeger** (Port: 16686)
   - Distributed tracing UI
   - Trace analysis and debugging
   - Performance bottleneck identification

4. **Alertmanager** (Port: 9093)
   - Alert routing and notification
   - Alert deduplication and grouping
   - Multi-channel notifications

### Supporting Services

5. **Loki** (Port: 3100)
   - Log aggregation and storage
   - Structured log querying

6. **Promtail**
   - Log collection agent
   - Log parsing and labeling

7. **Node Exporter** (Port: 9100)
   - System metrics collection
   - Hardware monitoring

8. **Redis Exporter** (Port: 9121)
   - Redis performance metrics

9. **PostgreSQL Exporter** (Port: 9187)
   - Database performance metrics

10. **Blackbox Exporter** (Port: 9115)
    - External service monitoring
    - Endpoint availability checks

## Key Metrics Tracked

### API Performance
- Request rate by endpoint and method
- Response time percentiles (p50, p95, p99)
- Error rates by status code
- Request/response size histograms

### Business Metrics
- Active conversations
- WhatsApp message success/failure rates
- AI request performance and token usage
- User engagement metrics

### System Health
- CPU and memory usage
- Database connection pool status
- Cache hit/miss ratios
- WebSocket connection counts

### Dependencies
- Database query performance
- Redis operation latency
- External API availability (WhatsApp, OpenAI)

## Alerting Rules

### Critical Alerts
- Service downtime
- High error rates (>5%)
- Database/Redis connection failures
- Extreme response times

### Warning Alerts
- Elevated response times
- High resource usage
- WhatsApp API issues
- AI service degradation

### SLO Monitoring
- 99.9% availability SLO
- 99.5% success rate SLO
- <2s response time SLO
- 95% WhatsApp delivery SLO

## Dashboards

### 1. API Overview Dashboard
- Service status and uptime
- Request rate and response times
- Error rate trends
- Performance percentiles

### 2. WhatsApp Metrics Dashboard
- Message volume and success rates
- API request performance
- Instance analysis
- Failure investigation

### 3. Infrastructure Dashboard
- System resource utilization
- Database and cache performance
- Connection pool status
- Storage metrics

### 4. AI Metrics Dashboard
- Request volume by model
- Token usage and costs
- Performance analysis
- Error tracking

## Health Checks

### Endpoints
- `/observability/health` - Comprehensive health check
- `/observability/ready` - Readiness probe
- `/observability/live` - Liveness probe
- `/metrics` - Prometheus metrics

### Health Check Components
- Database connectivity
- Redis availability
- WhatsApp API reachability
- System resources (memory, disk)
- Dependency status

## Deployment

### Quick Start
```bash
# Deploy everything (core + monitoring)
./deploy-with-monitoring.sh deploy

# Deploy only monitoring stack
./deploy-with-monitoring.sh monitoring

# Check status
./deploy-with-monitoring.sh status
```

### Manual Deployment
```bash
# Start monitoring services
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Verify services
curl http://localhost:9090/api/v1/targets
curl http://localhost:3000/api/health
curl http://localhost:16686
```

## Configuration

### Environment Variables
```bash
# Jaeger configuration
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
ENABLE_JAEGER=true
ENABLE_STDOUT_TRACES=false

# Prometheus retention
PROMETHEUS_RETENTION_TIME=30d
PROMETHEUS_RETENTION_SIZE=10GB

# Alerting
ALERT_WEBHOOK_TOKEN=your-webhook-token
SLACK_WEBHOOK_URL=your-slack-webhook
SMTP_HOST=your-smtp-host
```

### Customization
- **Prometheus Rules**: Edit `prometheus/rules.yml`
- **Alert Routing**: Modify `alertmanager/alertmanager.yml`
- **Dashboards**: Update JSON files in `grafana/dashboards/`
- **Log Parsing**: Customize `promtail/promtail.yml`

## Grafana Dashboard Import

1. Access Grafana at http://localhost:3000
2. Login with admin/admin123
3. Dashboards are automatically provisioned
4. Manual import via Dashboard ID or JSON:
   - API Overview: Use `api-overview.json`
   - WhatsApp Metrics: Use `whatsapp-metrics.json`
   - Infrastructure: Use `infrastructure.json`
   - AI Metrics: Use `ai-metrics.json`

## Troubleshooting

### Common Issues

1. **Metrics not appearing**
   - Check Prometheus targets: http://localhost:9090/targets
   - Verify application is exposing `/metrics` endpoint
   - Check network connectivity between containers

2. **Alerts not firing**
   - Validate alert rules in Prometheus UI
   - Check Alertmanager configuration
   - Verify notification channels

3. **Dashboards empty**
   - Confirm Prometheus datasource in Grafana
   - Check dashboard queries match metric names
   - Verify time range selection

4. **Traces not visible**
   - Ensure Jaeger agent is reachable
   - Check application tracing configuration
   - Verify trace export settings

### Debug Commands
```bash
# Check service logs
./deploy-with-monitoring.sh logs prometheus
./deploy-with-monitoring.sh logs grafana

# Reload monitoring configuration
./deploy-with-monitoring.sh reload-monitoring

# Test metrics endpoint
curl http://localhost:8789/metrics

# Test health checks
curl http://localhost:8789/observability/health
```

## Best Practices

### Monitoring
- Set appropriate retention periods for your storage capacity
- Use recording rules for expensive queries
- Monitor the monitoring stack itself
- Regular backup of Grafana dashboards and Prometheus data

### Alerting
- Start with fewer alerts and add more as needed
- Use alert grouping to reduce notification spam
- Include runbook links in alert annotations
- Test alert notification channels regularly

### Performance
- Use appropriate sampling rates for tracing
- Configure metric retention based on storage
- Use label cardinality carefully to avoid performance issues
- Regular cleanup of old data

### Security
- Use authentication for monitoring services in production
- Secure inter-service communication
- Regularly update monitoring stack components
- Monitor access logs for monitoring services

## Scaling Considerations

### High Volume Environments
- Consider Prometheus federation for multiple instances
- Use VictoriaMetrics for better performance and storage
- Implement metric relabeling to reduce cardinality
- Use Grafana enterprise for advanced features

### Multi-Environment
- Separate monitoring stacks per environment
- Use different retention policies
- Environment-specific alerting rules
- Cross-environment dashboards for comparison

## Integration with CI/CD

### Automated Testing
- Include monitoring in integration tests
- Validate metrics in CI pipeline
- Test alert rules with synthetic data
- Dashboard testing with automated screenshots

### Deployment Automation
- Infrastructure as Code for monitoring stack
- Automated backup and restore procedures
- Configuration drift detection
- Automated certificate renewal for SSL

## Support and Maintenance

### Regular Tasks
- Review and update alert rules
- Clean up unused metrics
- Update dashboards based on user feedback
- Monitor resource usage of monitoring stack

### Documentation
- Keep runbooks up to date
- Document custom metrics and their meaning
- Maintain configuration change log
- Regular training on monitoring tools

For questions or support, please refer to the PyTake documentation or contact the infrastructure team.