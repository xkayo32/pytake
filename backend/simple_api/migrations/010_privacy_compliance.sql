-- LGPD/GDPR Compliance Database Schema
-- This migration creates all necessary tables for complete privacy compliance

-- =============================================================================
-- CONSENT MANAGEMENT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL, -- JSON serialized ProcessingPurpose
    status TEXT NOT NULL, -- JSON serialized ConsentStatus
    given_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    ip_address INET,
    user_agent TEXT,
    proof_of_consent TEXT, -- Cryptographic proof hash
    processing_details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT valid_status CHECK (status IN ('"Given"', '"Withdrawn"', '"Expired"', '"Pending"')),
    CONSTRAINT valid_dates CHECK (
        (given_at IS NULL AND status != '"Given"') OR
        (given_at IS NOT NULL AND status = '"Given"') OR
        (withdrawn_at IS NULL AND status != '"Withdrawn"') OR
        (withdrawn_at IS NOT NULL AND status = '"Withdrawn"')
    )
);

CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_records_purpose ON consent_records(purpose);
CREATE INDEX idx_consent_records_status ON consent_records(status);
CREATE INDEX idx_consent_records_expires_at ON consent_records(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_consent_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_records_updated_at
    BEFORE UPDATE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION update_consent_records_updated_at();

-- =============================================================================
-- DATA SUBJECT RIGHTS TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL, -- JSON serialized DataSubjectRight
    status TEXT NOT NULL, -- JSON serialized RequestStatus
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    deadline TIMESTAMPTZ NOT NULL, -- 30 dias LGPD / 1 mês GDPR
    processor_id UUID REFERENCES users(id),
    response_data TEXT, -- JSON response or file path
    rejection_reason TEXT,
    verification_method TEXT NOT NULL,
    priority INTEGER DEFAULT 1, -- 1=Low, 2=Medium, 3=High, 4=Critical
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_request_type CHECK (request_type IN (
        '"Access"', '"Rectification"', '"Erasure"', '"Portability"', '"Object"', '"RestrictProcessing"'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        '"Submitted"', '"Verified"', '"Processing"', '"Completed"', '"Rejected"', '"Escalated"'
    )),
    CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 4)
);

CREATE INDEX idx_data_subject_requests_user_id ON data_subject_requests(user_id);
CREATE INDEX idx_data_subject_requests_type ON data_subject_requests(request_type);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_deadline ON data_subject_requests(deadline);
CREATE INDEX idx_data_subject_requests_overdue ON data_subject_requests(deadline) 
    WHERE status NOT IN ('"Completed"', '"Rejected"') AND deadline < NOW();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_data_subject_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_subject_requests_updated_at
    BEFORE UPDATE ON data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_data_subject_requests_updated_at();

-- =============================================================================
-- AUDIT TRAIL TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- JSON serialized DataProcessingAction
    data_category TEXT NOT NULL, -- JSON serialized DataCategory
    purpose TEXT NOT NULL, -- JSON serialized ProcessingPurpose
    legal_basis TEXT NOT NULL,
    processor_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    data_fields TEXT[], -- Array of affected field names
    before_values JSONB, -- Values before change
    after_values JSONB, -- Values after change
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retention_period TIMESTAMPTZ, -- When this log should be deleted
    session_id TEXT, -- Session identifier
    request_id TEXT, -- Request correlation ID
    
    CONSTRAINT valid_action CHECK (action IN (
        '"Collection"', '"Access"', '"Modification"', '"Deletion"', 
        '"Transfer"', '"Anonymization"', '"Pseudonymization"', '"Sharing"', '"Export"'
    )),
    CONSTRAINT valid_data_category CHECK (data_category IN (
        '"PersonalData"', '"SensitiveData"', '"PublicData"', '"PseudonymizedData"', '"AnonymizedData"'
    ))
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_processor_id ON audit_logs(processor_id);
CREATE INDEX idx_audit_logs_retention ON audit_logs(retention_period) WHERE retention_period IS NOT NULL;

-- Particionamento por mês para performance (opcional)
-- CREATE TABLE audit_logs_y2025m01 PARTITION OF audit_logs
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- =============================================================================
-- DATA BREACH MANAGEMENT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity TEXT NOT NULL, -- JSON serialized BreachSeverity
    breach_type TEXT NOT NULL, -- JSON serialized BreachType
    detected_at TIMESTAMPTZ NOT NULL,
    reported_at TIMESTAMPTZ,
    status TEXT NOT NULL, -- JSON serialized BreachStatus
    affected_users BIGINT NOT NULL DEFAULT 0,
    data_categories TEXT NOT NULL, -- JSON array of DataCategory
    description TEXT NOT NULL,
    root_cause TEXT,
    containment_measures TEXT[], -- Array of containment actions
    notification_deadline TIMESTAMPTZ NOT NULL, -- 72 horas obrigatórias
    dpa_notified BOOLEAN DEFAULT FALSE, -- ANPD/DPA notificada
    users_notified BOOLEAN DEFAULT FALSE, -- Usuários notificados
    risk_assessment TEXT NOT NULL, -- JSON serialized RiskLevel
    remediation_plan TEXT,
    external_parties_involved TEXT[], -- Terceiros envolvidos
    estimated_cost DECIMAL(10,2), -- Custo estimado do incidente
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_severity CHECK (severity IN ('"Low"', '"Medium"', '"High"', '"Critical"')),
    CONSTRAINT valid_breach_type CHECK (breach_type IN ('"Confidentiality"', '"Integrity"', '"Availability"')),
    CONSTRAINT valid_status CHECK (status IN ('"Detected"', '"Investigating"', '"Contained"', '"Resolved"', '"Escalated"')),
    CONSTRAINT valid_risk_assessment CHECK (risk_assessment IN ('"Minimal"', '"Low"', '"Medium"', '"High"', '"Critical"'))
);

CREATE INDEX idx_data_breaches_severity ON data_breaches(severity);
CREATE INDEX idx_data_breaches_status ON data_breaches(status);
CREATE INDEX idx_data_breaches_detected_at ON data_breaches(detected_at);
CREATE INDEX idx_data_breaches_deadline ON data_breaches(notification_deadline);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_data_breaches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_breaches_updated_at
    BEFORE UPDATE ON data_breaches
    FOR EACH ROW
    EXECUTE FUNCTION update_data_breaches_updated_at();

-- =============================================================================
-- DATA RETENTION POLICY TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_category TEXT NOT NULL, -- JSON serialized DataCategory
    purpose TEXT NOT NULL, -- JSON serialized ProcessingPurpose
    retention_period_days BIGINT NOT NULL,
    deletion_method TEXT NOT NULL, -- JSON serialized DeletionMethod
    legal_basis TEXT NOT NULL,
    auto_delete BOOLEAN DEFAULT TRUE,
    geographic_scope TEXT[], -- Jurisdições aplicáveis
    exceptions TEXT, -- Exceções à política
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_retention_period CHECK (retention_period_days > 0),
    CONSTRAINT valid_deletion_method CHECK (deletion_method IN (
        '"HardDelete"', '"SoftDelete"', '"Anonymization"', '"Pseudonymization"', '"Archival"'
    ))
);

CREATE INDEX idx_retention_policies_category ON data_retention_policies(data_category);
CREATE INDEX idx_retention_policies_purpose ON data_retention_policies(purpose);
CREATE UNIQUE INDEX idx_retention_policies_unique ON data_retention_policies(data_category, purpose);

-- =============================================================================
-- PRIVACY IMPACT ASSESSMENT (DPIA) TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name TEXT NOT NULL,
    processing_purpose TEXT NOT NULL, -- JSON serialized ProcessingPurpose
    data_categories TEXT NOT NULL, -- JSON array of DataCategory
    high_risk_processing BOOLEAN NOT NULL DEFAULT FALSE,
    necessity_assessment TEXT NOT NULL,
    proportionality_assessment TEXT NOT NULL,
    risks_identified JSONB NOT NULL, -- Array of PrivacyRisk objects
    mitigation_measures TEXT[] NOT NULL,
    residual_risk_level TEXT NOT NULL, -- JSON serialized RiskLevel
    consultation_required BOOLEAN DEFAULT FALSE,
    dpa_consultation_date TIMESTAMPTZ,
    approval_status TEXT NOT NULL, -- JSON serialized ApprovalStatus
    reviewer_id UUID REFERENCES users(id),
    review_date TIMESTAMPTZ,
    next_review_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_approval_status CHECK (approval_status IN (
        '"Draft"', '"UnderReview"', '"Approved"', '"Rejected"', '"RequiresRevision"'
    )),
    CONSTRAINT valid_residual_risk CHECK (residual_risk_level IN (
        '"Minimal"', '"Low"', '"Medium"', '"High"', '"Critical"'
    ))
);

CREATE INDEX idx_dpia_project_name ON privacy_impact_assessments(project_name);
CREATE INDEX idx_dpia_approval_status ON privacy_impact_assessments(approval_status);
CREATE INDEX idx_dpia_review_date ON privacy_impact_assessments(next_review_date);
CREATE INDEX idx_dpia_high_risk ON privacy_impact_assessments(high_risk_processing) WHERE high_risk_processing = TRUE;

-- =============================================================================
-- CROSS-BORDER TRANSFER TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS cross_border_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_country TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    legal_basis TEXT NOT NULL, -- Adequacy decision, SCCs, BCRs, etc.
    transfer_mechanism TEXT NOT NULL, -- Como a transferência é protegida
    data_categories TEXT NOT NULL, -- JSON array of DataCategory
    recipient_details TEXT NOT NULL,
    purpose TEXT NOT NULL, -- JSON serialized ProcessingPurpose
    safeguards_applied TEXT[] NOT NULL,
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retention_period TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transfers_user_id ON cross_border_transfers(user_id);
CREATE INDEX idx_transfers_destination ON cross_border_transfers(destination_country);
CREATE INDEX idx_transfers_date ON cross_border_transfers(transfer_date);

-- =============================================================================
-- COMPLIANCE MONITORING VIEWS
-- =============================================================================

-- View para requests vencidos
CREATE OR REPLACE VIEW overdue_data_subject_requests AS
SELECT 
    id,
    user_id,
    request_type,
    submitted_at,
    deadline,
    (NOW() - deadline) AS days_overdue,
    status
FROM data_subject_requests 
WHERE deadline < NOW() 
  AND status NOT IN ('"Completed"', '"Rejected"');

-- View para consentimentos expirados
CREATE OR REPLACE VIEW expired_consents AS
SELECT 
    id,
    user_id,
    purpose,
    expires_at,
    (NOW() - expires_at) AS days_expired
FROM consent_records 
WHERE expires_at < NOW() 
  AND status = '"Given"';

-- View para breaches que precisam de notificação
CREATE OR REPLACE VIEW breaches_requiring_notification AS
SELECT 
    id,
    severity,
    detected_at,
    notification_deadline,
    (notification_deadline - NOW()) AS hours_remaining,
    dpa_notified,
    users_notified
FROM data_breaches 
WHERE status NOT IN ('"Resolved"')
  AND (dpa_notified = FALSE OR users_notified = FALSE)
  AND risk_assessment IN ('"High"', '"Critical"');

-- =============================================================================
-- AUTOMATED COMPLIANCE FUNCTIONS
-- =============================================================================

-- Função para marcar consentimentos como expirados
CREATE OR REPLACE FUNCTION expire_old_consents()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE consent_records 
    SET status = '"Expired"', updated_at = NOW()
    WHERE expires_at < NOW() 
      AND status = '"Given"';
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log the expiration
    INSERT INTO audit_logs (action, data_category, purpose, legal_basis, timestamp)
    SELECT 
        '"Modification"'::TEXT,
        '"PersonalData"'::TEXT,
        purpose,
        'Automatic consent expiration',
        NOW()
    FROM consent_records 
    WHERE status = '"Expired"' 
      AND updated_at > NOW() - INTERVAL '1 minute';
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Função para detectar violações de retenção
CREATE OR REPLACE FUNCTION detect_retention_violations()
RETURNS TABLE (
    table_name TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ,
    should_be_deleted_by TIMESTAMPTZ,
    days_overdue BIGINT
) AS $$
BEGIN
    -- Esta função deve ser personalizada baseada no schema específico
    -- Exemplo para tabela de usuários
    RETURN QUERY
    SELECT 
        'users'::TEXT,
        u.id,
        u.created_at,
        u.created_at + INTERVAL '7 years', -- Exemplo: 7 anos de retenção
        EXTRACT(DAY FROM NOW() - (u.created_at + INTERVAL '7 years'))::BIGINT
    FROM users u
    WHERE u.created_at + INTERVAL '7 years' < NOW()
      AND u.deleted_at IS NULL; -- Assumindo soft delete
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INDEXES ADICIONAIS PARA PERFORMANCE
-- =============================================================================

-- Índices compostos para queries complexas
CREATE INDEX idx_audit_logs_user_action_time ON audit_logs(user_id, action, timestamp);
CREATE INDEX idx_consent_user_purpose_status ON consent_records(user_id, purpose, status);
CREATE INDEX idx_requests_user_type_status ON data_subject_requests(user_id, request_type, status);

-- Índices parciais para casos específicos
CREATE INDEX idx_active_consents ON consent_records(user_id, purpose) 
    WHERE status = '"Given"' AND (expires_at IS NULL OR expires_at > NOW());

CREATE INDEX idx_pending_requests ON data_subject_requests(submitted_at) 
    WHERE status IN ('"Submitted"', '"Verified"', '"Processing"');

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE consent_records IS 'Registro completo de consentimentos LGPD/GDPR com prova criptográfica';
COMMENT ON TABLE data_subject_requests IS 'Solicitações de direitos dos titulares com tracking de prazo';
COMMENT ON TABLE audit_logs IS 'Log completo de auditoria para todas as operações de dados pessoais';
COMMENT ON TABLE data_breaches IS 'Gestão completa de incidentes de violação de dados';
COMMENT ON TABLE data_retention_policies IS 'Políticas de retenção por categoria e finalidade';
COMMENT ON TABLE privacy_impact_assessments IS 'Relatórios de Impacto à Proteção de Dados (RIPD/DPIA)';
COMMENT ON TABLE cross_border_transfers IS 'Rastreamento de transferências internacionais';

COMMENT ON COLUMN consent_records.proof_of_consent IS 'Hash SHA-256 como prova criptográfica do consentimento';
COMMENT ON COLUMN data_subject_requests.deadline IS 'Prazo legal: 30 dias (LGPD) ou 1 mês (GDPR)';
COMMENT ON COLUMN data_breaches.notification_deadline IS 'Prazo de 72 horas para notificação à ANPD/DPA';
COMMENT ON COLUMN audit_logs.retention_period IS 'Data de expiração do log de auditoria';

-- =============================================================================
-- GRANTS E PERMISSÕES (opcional)
-- =============================================================================

-- Exemplo de permissões para diferentes roles
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO privacy_officer;
-- GRANT INSERT, UPDATE ON data_subject_requests TO privacy_officer;
-- GRANT INSERT ON audit_logs TO application_user;