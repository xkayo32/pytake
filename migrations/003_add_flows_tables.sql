-- Create flows table
CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('keyword', 'schedule', 'webhook', 'manual')),
    trigger_config JSONB NOT NULL DEFAULT '{}',
    flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
    stats JSONB DEFAULT '{"executions": 0, "successRate": 0}',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT flows_tenant_name_unique UNIQUE (tenant_id, name)
);

-- Create flow_executions table
CREATE TABLE IF NOT EXISTS flow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id),
    contact_id UUID REFERENCES contacts(id),
    trigger_data JSONB,
    status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    current_node_id VARCHAR(255),
    execution_data JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    CONSTRAINT flow_executions_flow_tenant_fk FOREIGN KEY (flow_id, tenant_id) REFERENCES flows(id, tenant_id)
);

-- Create flow_execution_logs table for detailed step tracking
CREATE TABLE IF NOT EXISTS flow_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES flow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    node_type VARCHAR(100),
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(50) CHECK (status IN ('success', 'error', 'skipped')),
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER
);

-- Create indexes
CREATE INDEX idx_flows_tenant_status ON flows(tenant_id, status);
CREATE INDEX idx_flows_trigger_type ON flows(trigger_type);
CREATE INDEX idx_flow_executions_flow ON flow_executions(flow_id);
CREATE INDEX idx_flow_executions_status ON flow_executions(status);
CREATE INDEX idx_flow_executions_conversation ON flow_executions(conversation_id);
CREATE INDEX idx_flow_execution_logs_execution ON flow_execution_logs(execution_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_flows_updated_at BEFORE UPDATE ON flows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();