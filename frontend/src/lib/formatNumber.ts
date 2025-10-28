export function formatNumber(value: unknown, digits = 1, fallback = '-') {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num.toFixed(digits);
}

export function formatNumberLocale(value: unknown, digits = 0, locale = 'pt-BR', fallback = '-') {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatCurrency(value: unknown, digits = 2, locale = 'pt-BR', currency = 'BRL', fallback = '-') {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  try {
    return num.toLocaleString(locale, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  } catch (e) {
    return num.toFixed(digits);
  }
}

export function formatPercent(value: unknown, digits = 1, fallback = '-') {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return (num * 100).toFixed(digits);
}
