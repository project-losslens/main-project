export function normalizeInternationalPhone(input: string): string | null {
  const compact = input.trim().replace(/[\s()-]/g, '')
  let normalized = compact

  if (/^07\d{8}$/.test(compact)) {
    normalized = `+254${compact.slice(1)}`
  } else if (/^254\d{9}$/.test(compact)) {
    normalized = `+${compact}`
  } else if (!compact.startsWith('+') && /^\d{8,15}$/.test(compact)) {
    normalized = `+${compact}`
  } else if (!compact.startsWith('+') || !/^\+\d{8,15}$/.test(compact)) {
    return null
  }

  return /^\+\d{8,15}$/.test(normalized) ? normalized : null
}
