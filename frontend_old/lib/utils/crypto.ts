/**
 * Gera um token webhook seguro com 256 bits de entropia
 * Formato: pytake_[64-hex-chars]
 */
export function generateWebhookVerifyToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const hexString = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `pytake_${hexString}`;
}

/**
 * Gera um token seguro genérico com N bytes de entropia
 */
export function generateSecureToken(bytes: number = 32): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
