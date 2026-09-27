/**
 * Format angka Indonesia (ribuan ".", desimal ","). Diport dari aplikasi PANTAS.
 */

/**
 * Membaca angka seperti yang diketik auditor. Menerima "742,5" maupun "742.5"
 * dan titik ribuan ("8.000"). Null bila bukan angka.
 */
export function parseAngka(input) {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  const trimmed = String(input).trim()
  if (trimmed === '') return null

  const lastComma = trimmed.lastIndexOf(',')
  const lastDot = trimmed.lastIndexOf('.')
  let normalised
  if (lastComma > lastDot) {
    normalised = trimmed.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    const decimals = trimmed.length - lastDot - 1
    normalised = lastComma === -1 && decimals === 3 && /^-?\d{1,3}(\.\d{3})+$/.test(trimmed) && !/^-?0\./.test(trimmed)
      ? trimmed.replace(/\./g, '')
      : trimmed.replace(/,/g, '')
  } else {
    normalised = trimmed
  }

  if (!/^[-+]?\d*\.?\d*$/.test(normalised) || normalised === '' || normalised === '-' || normalised === '+') return null
  const value = Number(normalised)
  return Number.isFinite(value) ? value : null
}

function formatDecimal(value, fractionDigits) {
  const safe = Number.isFinite(value) ? value : 0
  const negative = safe < 0
  const [whole, fraction] = Math.abs(safe).toFixed(fractionDigits).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const body = fraction ? `${grouped},${fraction}` : grouped
  return negative ? `-${body}` : body
}

export function formatNumber(value, fractionDigits = 0) {
  return formatDecimal(value, fractionDigits)
}

/** 0.7456 -> "0,7456" */
export function formatDensity(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return formatDecimal(value, 4)
}

/** Selisih bertanda: "+0,0006" / "-0,0031". */
export function formatSigned(value, fractionDigits = 4, suffix = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const body = formatDecimal(Math.abs(value), fractionDigits)
  if (Number(body.replace(/\./g, '').replace(',', '.')) === 0) return `${body}${suffix}`
  return `${value > 0 ? '+' : '-'}${body}${suffix}`
}
