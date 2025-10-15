/**
 * Secret Types - TypeScript definitions for encrypted secrets system
 *
 * Mirrors backend Pydantic schemas for type safety
 */

/**
 * Secret scope - where it can be used
 */
export enum SecretScope {
  ORGANIZATION = 'organization', // Available across entire organization
  CHATBOT = 'chatbot',           // Only for specific chatbot
}

/**
 * Encryption provider used to encrypt the secret
 */
export enum EncryptionProvider {
  FERNET = 'fernet',   // Internal symmetric encryption (default)
  AWS_KMS = 'aws_kms', // AWS Key Management Service
  VAULT = 'vault',     // HashiCorp Vault
}

/**
 * Base secret fields (common to all schemas)
 */
export interface SecretBase {
  name: string;
  display_name: string;
  description?: string;
  scope: SecretScope;
  metadata?: Record<string, any>;
}

/**
 * Schema for creating a new secret
 */
export interface SecretCreate extends SecretBase {
  value: string; // Plaintext value to encrypt (never stored unencrypted)
  chatbot_id?: string; // Required if scope is CHATBOT
  encryption_provider?: EncryptionProvider;
  encryption_key_id?: string; // For AWS KMS ARN, Vault path, etc.
}

/**
 * Schema for updating a secret
 */
export interface SecretUpdate {
  display_name?: string;
  description?: string;
  value?: string; // New plaintext value (will be re-encrypted)
  is_active?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Schema for rotating encryption key
 */
export interface SecretRotateKey {
  new_encryption_provider?: EncryptionProvider;
  new_key_id?: string;
}

/**
 * Secret in database (includes system fields, no decrypted value)
 * This is what the API returns in list/get endpoints
 */
export interface Secret extends SecretBase {
  id: string;
  organization_id: string;
  chatbot_id?: string;

  // Encryption configuration
  encryption_provider: EncryptionProvider;
  encryption_key_id?: string;
  encryption_metadata?: Record<string, any>;

  // Status
  is_active: boolean;

  // Audit
  last_used_at?: string; // ISO datetime
  usage_count: number;

  // Timestamps
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

/**
 * Secret validation response
 */
export interface SecretValidationResponse {
  is_valid: boolean;
  message?: string;
}

/**
 * Secret usage statistics
 */
export interface SecretUsageStats {
  secret_id: string;
  secret_name: string;
  display_name: string;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  is_active: boolean;
}

/**
 * List response with pagination info
 */
export interface SecretListResponse {
  items: Secret[];
  total: number;
}

/**
 * Filter options for listing secrets
 */
export interface SecretListFilters {
  chatbot_id?: string;
  scope?: SecretScope;
  is_active?: boolean;
}

/**
 * Props for SecretSelector component
 */
export interface SecretSelectorProps {
  value?: string; // Selected secret ID
  onChange: (secretId: string | undefined) => void;
  chatbot_id?: string; // Filter by chatbot
  scope?: SecretScope; // Filter by scope
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Props for SecretModal component
 */
export interface SecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  secret?: Secret; // If editing existing secret
  chatbot_id?: string; // Pre-fill chatbot_id for chatbot-scoped secrets
}
