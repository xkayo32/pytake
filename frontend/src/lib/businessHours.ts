/**
 * Business Hours utilities
 */

import type { BusinessHoursConfig } from '@/components/admin/BusinessHoursEditor';

/**
 * Check if current time is within business hours
 */
export function isWithinBusinessHours(config?: BusinessHoursConfig): boolean {
  if (!config || !config.schedule) return true; // No restriction

  const now = new Date();
  
  // Get day of week (convert to lowercase)
  const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = daysMap[now.getDay()];
  
  const dayConfig = config.schedule[dayName as keyof typeof config.schedule];
  
  if (!dayConfig || !dayConfig.enabled) return false; // Day disabled
  
  const start = dayConfig.start; // e.g., "09:00"
  const end = dayConfig.end;     // e.g., "18:00"
  
  if (!start || !end) return true; // No time restriction
  
  try {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return currentTime >= start && currentTime <= end;
  } catch {
    return true; // Parse error, allow by default
  }
}

/**
 * Get business hours status label
 */
export function getBusinessHoursStatus(config?: BusinessHoursConfig): {
  status: 'open' | 'closed' | 'always';
  label: string;
} {
  if (!config || !config.schedule || Object.keys(config.schedule).length === 0) {
    return { status: 'always', label: 'Sempre aberta' };
  }
  
  const isOpen = isWithinBusinessHours(config);
  return {
    status: isOpen ? 'open' : 'closed',
    label: isOpen ? 'Aberta agora' : 'Fora do horário',
  };
}
