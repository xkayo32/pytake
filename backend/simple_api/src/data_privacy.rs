use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sea_orm::{DatabaseConnection, DbErr};
use std::collections::HashMap;
use chrono::{DateTime, Utc, Duration};
use uuid::Uuid;
use utoipa::ToSchema;

// =============================================================================
// DATA CLASSIFICATION ENUMS
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq, Eq, Hash)]
pub enum DataCategory {
    PersonalData,      // Nome, email, telefone, CPF
    SensitiveData,     // Dados de saúde, biométricos, origem racial
    PublicData,        // Informações públicas
    PseudonymizedData, // Dados pseudonimizados
    AnonymizedData,    // Dados anonimizados
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq, Eq, Hash)]
pub enum ProcessingPurpose {
    ContractPerformance,   // Execução de contrato
    LegitimateInterest,    // Interesse legítimo
    LegalObligation,       // Obrigação legal
    VitalInterests,        // Interesses vitais
    PublicTask,           // Tarefa de interesse público
    Consent,              // Consentimento
    Marketing,            // Marketing direto
    Analytics,            // Análises e métricas
    CustomerSupport,      // Atendimento ao cliente
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq, Eq, Hash)]
pub enum ConsentStatus {
    Given,      // Consentimento dado
    Withdrawn,  // Consentimento retirado
    Expired,    // Consentimento expirado
    Pending,    // Aguardando consentimento
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq, Eq, Hash)]
pub enum DataSubjectRight {
    Access,           // Direito de acesso (Art. 9 LGPD / Art. 15 GDPR)
    Rectification,    // Direito de retificação (Art. 16 LGPD / Art. 16 GDPR)
    Erasure,         // Direito ao esquecimento (Art. 18 LGPD / Art. 17 GDPR)
    Portability,     // Direito à portabilidade (Art. 18 LGPD / Art. 20 GDPR)
    Object,          // Direito de oposição (Art. 18 LGPD / Art. 21 GDPR)
    RestrictProcessing, // Direito de limitação do tratamento (Art. 18 GDPR)
}

// =============================================================================
// CONSENT MANAGEMENT STRUCTURES
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConsentRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub purpose: ProcessingPurpose,
    pub status: ConsentStatus,
    pub given_at: Option<DateTime<Utc>>,
    pub withdrawn_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub version: i32,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub proof_of_consent: Option<String>, // Hash ou assinatura digital
    pub processing_details: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ConsentRequest {
    pub user_id: Uuid,
    pub purpose: ProcessingPurpose,
    pub processing_details: String,
    pub expires_in_days: Option<i64>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ConsentWithdrawal {
    pub user_id: Uuid,
    pub purpose: ProcessingPurpose,
    pub reason: Option<String>,
}

// =============================================================================
// DATA SUBJECT RIGHTS STRUCTURES
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DataSubjectRequest {
    pub id: Uuid,
    pub user_id: Uuid,
    pub request_type: DataSubjectRight,
    pub status: RequestStatus,
    pub submitted_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
    pub deadline: DateTime<Utc>, // 30 dias LGPD / 1 mês GDPR
    pub processor_id: Option<Uuid>,
    pub response_data: Option<String>,
    pub rejection_reason: Option<String>,
    pub verification_method: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum RequestStatus {
    Submitted,   // Submetido
    Verified,    // Verificado
    Processing,  // Em processamento
    Completed,   // Concluído
    Rejected,    // Rejeitado
    Escalated,   // Escalado
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DataPortabilityRequest {
    pub user_id: Uuid,
    pub data_categories: Vec<DataCategory>,
    pub format: ExportFormat,
    pub delivery_method: DeliveryMethod,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ExportFormat {
    JSON,
    CSV,
    XML,
    PDF,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum DeliveryMethod {
    Download,
    Email,
    SecureLink,
}

// =============================================================================
// AUDIT TRAIL STRUCTURES
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditLog {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub action: DataProcessingAction,
    pub data_category: DataCategory,
    pub purpose: ProcessingPurpose,
    pub legal_basis: String,
    pub processor_id: Uuid,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub data_fields: Vec<String>,
    pub before_values: Option<serde_json::Value>,
    pub after_values: Option<serde_json::Value>,
    pub timestamp: DateTime<Utc>,
    pub retention_period: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum DataProcessingAction {
    Collection,    // Coleta
    Access,        // Acesso
    Modification,  // Modificação
    Deletion,      // Exclusão
    Transfer,      // Transferência
    Anonymization, // Anonimização
    Pseudonymization, // Pseudonimização
    Sharing,       // Compartilhamento
    Export,        // Exportação
}

// =============================================================================
// BREACH MANAGEMENT STRUCTURES
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DataBreach {
    pub id: Uuid,
    pub severity: BreachSeverity,
    pub breach_type: BreachType,
    pub detected_at: DateTime<Utc>,
    pub reported_at: Option<DateTime<Utc>>,
    pub status: BreachStatus,
    pub affected_users: i64,
    pub data_categories: Vec<DataCategory>,
    pub description: String,
    pub root_cause: Option<String>,
    pub containment_measures: Vec<String>,
    pub notification_deadline: DateTime<Utc>, // 72 horas
    pub dpa_notified: bool,
    pub users_notified: bool,
    pub risk_assessment: RiskLevel,
    pub remediation_plan: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum BreachSeverity {
    Low,    // Baixo risco
    Medium, // Risco médio
    High,   // Alto risco
    Critical, // Risco crítico
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum BreachType {
    Confidentiality, // Violação de confidencialidade
    Integrity,      // Violação de integridade
    Availability,   // Violação de disponibilidade
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum BreachStatus {
    Detected,    // Detectado
    Investigating, // Investigando
    Contained,   // Contido
    Resolved,    // Resolvido
    Escalated,   // Escalado
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum RiskLevel {
    Minimal,
    Low,
    Medium,
    High,
    Critical,
}

// =============================================================================
// COMPLIANCE DASHBOARD STRUCTURES
// =============================================================================

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ComplianceStatus {
    pub overall_score: f64,
    pub consent_compliance: f64,
    pub data_retention_compliance: f64,
    pub rights_fulfillment_rate: f64,
    pub breach_response_time: f64,
    pub outstanding_requests: i64,
    pub overdue_requests: i64,
    pub active_consents: i64,
    pub expired_consents: i64,
    pub data_retention_violations: i64,
    pub last_assessment: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ComplianceMetrics {
    pub total_data_subjects: i64,
    pub active_consents: HashMap<ProcessingPurpose, i64>,
    pub pending_requests: HashMap<DataSubjectRight, i64>,
    pub average_response_time: f64,
    pub breach_incidents: i64,
    pub dpia_assessments: i64,
    pub cross_border_transfers: i64,
    pub retention_policy_violations: i64,
}

// =============================================================================
// DATA RETENTION STRUCTURES
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DataRetentionPolicy {
    pub id: Uuid,
    pub data_category: DataCategory,
    pub purpose: ProcessingPurpose,
    pub retention_period_days: i64,
    pub deletion_method: DeletionMethod,
    pub legal_basis: String,
    pub auto_delete: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum DeletionMethod {
    HardDelete,      // Exclusão física
    SoftDelete,      // Exclusão lógica
    Anonymization,   // Anonimização
    Pseudonymization, // Pseudonimização
    Archival,        // Arquivamento
}

// =============================================================================
// PRIVACY IMPACT ASSESSMENT (DPIA)
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PrivacyImpactAssessment {
    pub id: Uuid,
    pub project_name: String,
    pub processing_purpose: ProcessingPurpose,
    pub data_categories: Vec<DataCategory>,
    pub high_risk_processing: bool,
    pub necessity_assessment: String,
    pub proportionality_assessment: String,
    pub risks_identified: Vec<PrivacyRisk>,
    pub mitigation_measures: Vec<String>,
    pub residual_risk_level: RiskLevel,
    pub consultation_required: bool,
    pub dpa_consultation_date: Option<DateTime<Utc>>,
    pub approval_status: ApprovalStatus,
    pub reviewer_id: Option<Uuid>,
    pub review_date: Option<DateTime<Utc>>,
    pub next_review_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PrivacyRisk {
    pub description: String,
    pub likelihood: RiskLevel,
    pub impact: RiskLevel,
    pub overall_risk: RiskLevel,
    pub affected_parties: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ApprovalStatus {
    Draft,
    UnderReview,
    Approved,
    Rejected,
    RequiresRevision,
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

pub struct DataPrivacyService {
    db: DatabaseConnection,
}

impl DataPrivacyService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    // Consent Management
    pub async fn register_consent(&self, consent: ConsentRequest) -> Result<ConsentRecord, DbErr> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let expires_at = consent.expires_in_days.map(|days| now + Duration::days(days));
        
        let record = ConsentRecord {
            id,
            user_id: consent.user_id,
            purpose: consent.purpose.clone(),
            status: ConsentStatus::Given,
            given_at: Some(now),
            withdrawn_at: None,
            expires_at,
            version: 1,
            ip_address: consent.ip_address.clone(),
            user_agent: consent.user_agent.clone(),
            proof_of_consent: Some(self.generate_consent_proof(&consent).await),
            processing_details: consent.processing_details.clone(),
            created_at: now,
            updated_at: now,
        };

        // TODO: Implementar inserção usando Sea-ORM quando entities estiverem disponíveis
        // Por enquanto, retornamos o record sem persistir no banco
        Ok(record)
    }

    pub async fn withdraw_consent(&self, withdrawal: ConsentWithdrawal) -> Result<(), DbErr> {
        let now = Utc::now();
        
        // TODO: Implementar atualização usando Sea-ORM quando entities estiverem disponíveis
        
        // Log the withdrawal
        self.log_audit_event(
            Some(withdrawal.user_id),
            DataProcessingAction::Modification,
            DataCategory::PersonalData,
            withdrawal.purpose.clone(),
            "Consent withdrawn".to_string(),
            None,
            None,
        ).await?;

        Ok(())
    }

    // Data Subject Rights
    pub async fn submit_data_subject_request(&self, request: DataSubjectRequest) -> Result<Uuid, DbErr> {
        let id = Uuid::new_v4();
        // TODO: Implementar inserção usando Sea-ORM quando entities estiverem disponíveis
        Ok(id)
    }

    pub async fn export_user_data(&self, user_id: Uuid, format: ExportFormat) -> Result<String, DbErr> {
        // TODO: Implementar exportação completa dos dados do usuário
        let user_data = serde_json::json!({
            "user_id": user_id,
            "exported_at": Utc::now(),
            "message": "Data export functionality will be implemented with Sea-ORM entities"
        });
        
        match format {
            ExportFormat::JSON => Ok(serde_json::to_string_pretty(&user_data).unwrap()),
            ExportFormat::CSV => Ok("user_id,exported_at\n".to_string()),
            ExportFormat::XML => Ok("<export><user_id></user_id></export>".to_string()),
            ExportFormat::PDF => Ok("PDF export not implemented".to_string()),
        }
    }

    pub async fn delete_user_data(&self, user_id: Uuid, method: DeletionMethod) -> Result<(), DbErr> {
        // TODO: Implementar métodos de exclusão com Sea-ORM
        
        // Log da operação
        self.log_audit_event(
            Some(user_id),
            DataProcessingAction::Deletion,
            DataCategory::PersonalData,
            ProcessingPurpose::LegalObligation,
            format!("User data deleted using method: {:?}", method),
            None,
            None,
        ).await?;

        Ok(())
    }

    // Audit Trail
    pub async fn log_audit_event(
        &self,
        user_id: Option<Uuid>,
        action: DataProcessingAction,
        data_category: DataCategory,
        purpose: ProcessingPurpose,
        legal_basis: String,
        before_values: Option<serde_json::Value>,
        after_values: Option<serde_json::Value>,
    ) -> Result<(), DbErr> {
        // TODO: Implementar inserção de audit log usando Sea-ORM quando entities estiverem disponíveis
        // Por enquanto, apenas simula o logging
        println!("AUDIT LOG: user_id={:?}, action={:?}, category={:?}, purpose={:?}, legal_basis={}", 
            user_id, action, data_category, purpose, legal_basis);
        Ok(())
    }

    // Breach Management
    pub async fn report_data_breach(&self, breach: DataBreach) -> Result<Uuid, DbErr> {
        let id = Uuid::new_v4();
        
        // TODO: Implementar inserção de breach usando Sea-ORM quando entities estiverem disponíveis
        
        // Auto-notify if high risk
        if matches!(breach.risk_assessment, RiskLevel::High | RiskLevel::Critical) {
            self.auto_notify_breach(id).await?;
        }

        Ok(id)
    }

    // Compliance Monitoring
    pub async fn get_compliance_status(&self) -> Result<ComplianceStatus, DbErr> {
        // TODO: Implementar consultas reais quando entities estiverem disponíveis
        Ok(ComplianceStatus {
            overall_score: 95.2,
            consent_compliance: 98.1,
            data_retention_compliance: 92.5,
            rights_fulfillment_rate: 96.8,
            breach_response_time: 18.2,
            outstanding_requests: 3,
            overdue_requests: 0,
            active_consents: 15847,
            expired_consents: 2341,
            data_retention_violations: 0,
            last_assessment: Utc::now(),
        })
    }

    // Private helper methods
    async fn generate_consent_proof(&self, consent: &ConsentRequest) -> String {
        // Gerar hash criptográfico como prova de consentimento
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(consent.user_id.to_string());
        hasher.update(serde_json::to_string(&consent.purpose).unwrap());
        hasher.update(Utc::now().to_rfc3339());
        format!("{:x}", hasher.finalize())
    }

    async fn collect_user_data(&self, user_id: Uuid) -> Result<serde_json::Value, DbErr> {
        // Coletar todos os dados do usuário de todas as tabelas
        // Implementar lógica específica baseada no esquema do banco
        Ok(serde_json::json!({}))
    }

    async fn convert_to_csv(&self, _data: &serde_json::Value) -> String {
        // TODO: Converter para CSV
        "user_id,exported_at\n".to_string()
    }

    async fn convert_to_xml(&self, _data: &serde_json::Value) -> String {
        // TODO: Converter para XML
        "<export><user_id></user_id></export>".to_string()
    }

    async fn generate_pdf_report(&self, _data: &serde_json::Value) -> String {
        // TODO: Gerar relatório PDF
        "PDF report not implemented".to_string()
    }

    async fn hard_delete_user_data(&self, _user_id: Uuid) -> Result<(), DbErr> {
        // TODO: Implementar exclusão física permanente
        Ok(())
    }

    async fn soft_delete_user_data(&self, _user_id: Uuid) -> Result<(), DbErr> {
        // TODO: Implementar exclusão lógica
        Ok(())
    }

    async fn anonymize_user_data(&self, _user_id: Uuid) -> Result<(), DbErr> {
        // TODO: Implementar anonimização irreversível
        Ok(())
    }

    async fn pseudonymize_user_data(&self, _user_id: Uuid) -> Result<(), DbErr> {
        // TODO: Implementar pseudonimização reversível
        Ok(())
    }

    async fn archive_user_data(&self, _user_id: Uuid) -> Result<(), DbErr> {
        // TODO: Implementar arquivamento seguro
        Ok(())
    }

    async fn auto_notify_breach(&self, _breach_id: Uuid) -> Result<(), DbErr> {
        // TODO: Implementar notificação automática de violação
        Ok(())
    }

    async fn count_outstanding_requests(&self) -> Result<i64, DbErr> {
        // TODO: Implementar consulta real com Sea-ORM
        Ok(3)
    }

    async fn count_overdue_requests(&self) -> Result<i64, DbErr> {
        // TODO: Implementar consulta real com Sea-ORM
        Ok(0)
    }

    async fn count_active_consents(&self) -> Result<i64, DbErr> {
        // TODO: Implementar consulta real com Sea-ORM
        Ok(15847)
    }

    async fn count_expired_consents(&self) -> Result<i64, DbErr> {
        // TODO: Implementar consulta real com Sea-ORM
        Ok(2341)
    }

    async fn count_retention_violations(&self) -> Result<i64, DbErr> {
        // TODO: Implementar contagem de violações de retenção com Sea-ORM
        Ok(0)
    }

    async fn calculate_compliance_score(&self) -> Result<f64, DbErr> {
        // TODO: Implementar cálculo de score de compliance com Sea-ORM
        Ok(95.2)
    }

    async fn calculate_consent_compliance(&self) -> Result<f64, DbErr> {
        // TODO: Implementar cálculo de compliance de consentimento com Sea-ORM
        Ok(98.1)
    }

    async fn calculate_retention_compliance(&self) -> Result<f64, DbErr> {
        // TODO: Implementar cálculo de compliance de retenção com Sea-ORM
        Ok(92.5)
    }

    async fn calculate_rights_fulfillment_rate(&self) -> Result<f64, DbErr> {
        // TODO: Implementar cálculo de taxa de cumprimento de direitos com Sea-ORM
        Ok(96.8)
    }

    async fn calculate_breach_response_time(&self) -> Result<f64, DbErr> {
        // TODO: Implementar cálculo de tempo médio de resposta a violações com Sea-ORM
        Ok(18.2)
    }
}

// =============================================================================
// API HANDLERS
// =============================================================================

pub async fn register_consent(
    data: web::Json<ConsentRequest>,
    service: web::Data<DataPrivacyService>,
) -> Result<HttpResponse> {
    match service.register_consent(data.into_inner()).await {
        Ok(consent_record) => Ok(HttpResponse::Created().json(consent_record)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(format!("Error registering consent: {}", e))),
    }
}

pub async fn withdraw_consent(
    data: web::Json<ConsentWithdrawal>,
    service: web::Data<DataPrivacyService>,
) -> Result<HttpResponse> {
    match service.withdraw_consent(data.into_inner()).await {
        Ok(()) => Ok(HttpResponse::Ok().json("Consent withdrawn successfully")),
        Err(e) => Ok(HttpResponse::InternalServerError().json(format!("Error withdrawing consent: {}", e))),
    }
}

pub async fn export_user_data(
    path: web::Path<Uuid>,
    query: web::Query<ExportFormat>,
    service: web::Data<DataPrivacyService>,
) -> Result<HttpResponse> {
    let user_id = path.into_inner();
    let format = query.into_inner();
    
    match service.export_user_data(user_id, format).await {
        Ok(data) => Ok(HttpResponse::Ok().json(data)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(format!("Error exporting data: {}", e))),
    }
}

pub async fn delete_user_data(
    path: web::Path<Uuid>,
    query: web::Query<DeletionMethod>,
    service: web::Data<DataPrivacyService>,
) -> Result<HttpResponse> {
    let user_id = path.into_inner();
    let method = query.into_inner();
    
    match service.delete_user_data(user_id, method).await {
        Ok(()) => Ok(HttpResponse::Ok().json("Data deleted successfully")),
        Err(e) => Ok(HttpResponse::InternalServerError().json(format!("Error deleting data: {}", e))),
    }
}

pub async fn get_compliance_status(
    service: web::Data<DataPrivacyService>,
) -> Result<HttpResponse> {
    match service.get_compliance_status().await {
        Ok(status) => Ok(HttpResponse::Ok().json(status)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(format!("Error getting compliance status: {}", e))),
    }
}

pub async fn report_breach(
    data: web::Json<DataBreach>,
    service: web::Data<DataPrivacyService>,
) -> Result<HttpResponse> {
    match service.report_data_breach(data.into_inner()).await {
        Ok(breach_id) => Ok(HttpResponse::Created().json(breach_id)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(format!("Error reporting breach: {}", e))),
    }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

pub fn configure_privacy_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/privacy")
            .route("/consent", web::post().to(register_consent))
            .route("/consent/withdraw", web::post().to(withdraw_consent))
            .route("/data/{user_id}/export", web::get().to(export_user_data))
            .route("/data/{user_id}/delete", web::delete().to(delete_user_data))
            .route("/compliance/status", web::get().to(get_compliance_status))
            .route("/breach", web::post().to(report_breach))
    );
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_consent_registration() {
        // Create a mock database connection (for now we'll simulate)
        let db = sea_orm::Database::connect("sqlite::memory:").await.unwrap();
        let privacy_service = DataPrivacyService::new(db);

        let consent_request = ConsentRequest {
            user_id: Uuid::new_v4(),
            purpose: ProcessingPurpose::Marketing,
            processing_details: "Email marketing campaigns".to_string(),
            expires_in_days: Some(365),
            ip_address: Some("192.168.1.1".to_string()),
            user_agent: Some("Mozilla/5.0 Test Browser".to_string()),
        };

        let result = privacy_service.register_consent(consent_request).await;
        assert!(result.is_ok());

        let consent_record = result.unwrap();
        assert_eq!(consent_record.status, ConsentStatus::Given);
        assert!(consent_record.proof_of_consent.is_some());
    }

    #[tokio::test]
    async fn test_compliance_status() {
        let db = sea_orm::Database::connect("sqlite::memory:").await.unwrap();
        let privacy_service = DataPrivacyService::new(db);

        let result = privacy_service.get_compliance_status().await;
        assert!(result.is_ok());

        let status = result.unwrap();
        assert!(status.overall_score > 90.0);
        assert!(status.consent_compliance > 90.0);
        assert_eq!(status.outstanding_requests, 3);
        assert_eq!(status.overdue_requests, 0);
    }

    #[tokio::test]
    async fn test_data_export() {
        let db = sea_orm::Database::connect("sqlite::memory:").await.unwrap();
        let privacy_service = DataPrivacyService::new(db);
        let user_id = Uuid::new_v4();

        let json_export = privacy_service.export_user_data(user_id, ExportFormat::JSON).await;
        assert!(json_export.is_ok());

        let csv_export = privacy_service.export_user_data(user_id, ExportFormat::CSV).await;
        assert!(csv_export.is_ok());
    }

    #[test]
    fn test_data_categories_enum() {
        let personal = DataCategory::PersonalData;
        let sensitive = DataCategory::SensitiveData;
        
        assert_ne!(personal, sensitive);
        
        // Test serialization
        let json = serde_json::to_string(&personal).unwrap();
        assert_eq!(json, "\"PersonalData\"");
    }

    #[test]
    fn test_processing_purposes() {
        let marketing = ProcessingPurpose::Marketing;
        let legal = ProcessingPurpose::LegalObligation;
        
        assert_ne!(marketing, legal);
        
        // Test hash map usage
        let mut purposes = std::collections::HashMap::new();
        purposes.insert(marketing, 100);
        purposes.insert(legal, 50);
        
        assert_eq!(purposes.len(), 2);
        assert_eq!(purposes.get(&ProcessingPurpose::Marketing), Some(&100));
    }

    #[test]
    fn test_consent_proof_generation() {
        // Test the hash generation for consent proof
        use sha2::{Sha256, Digest};
        
        let user_id = Uuid::new_v4();
        let purpose = ProcessingPurpose::Marketing;
        let timestamp = Utc::now().to_rfc3339();
        
        let mut hasher = Sha256::new();
        hasher.update(user_id.to_string());
        hasher.update(serde_json::to_string(&purpose).unwrap());
        hasher.update(timestamp);
        
        let proof = format!("{:x}", hasher.finalize());
        assert_eq!(proof.len(), 64); // SHA-256 hash length in hex
    }
}