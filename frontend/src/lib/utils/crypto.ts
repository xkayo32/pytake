/**
 * Gera um token seguro aleatório para webhook
 * @param length Tamanho do token (padrão: 32)
 * @returns Token hexadecimal seguro
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback para ambientes sem crypto (SSR)
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera um webhook verify token no formato Meta recomenda
 * @returns Token no formato: pytake_XXXXXXXX
 */
export function generateWebhookVerifyToken(): string {
  const randomPart = generateSecureToken(16);
  return `pytake_${randomPart}`;
}
