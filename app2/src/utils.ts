export function formatTemp(temp: number | null | undefined): string {
  if (temp === null || temp === undefined) return '--'
  return temp.toFixed(1)
}

export function formatHumidity(humidity: number | null | undefined): string {
  if (humidity === null || humidity === undefined) return '--'
  return Math.round(humidity).toString()
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return 'Not running'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function formatDurationOriginal(seconds: number | null | undefined): string {
  if (!seconds) return 'Not running'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function isValidMac(mac: string): boolean {
  if (!mac) return false
  // Normalize: remove colons/dashes and convert to lowercase
  const clean = mac.toLowerCase().replace(/[:\-]/g, '')
  if (clean.length !== 12) return false
  // Check all characters are hex
  return /^[0-9a-f]{12}$/.test(clean)
}

export function normalizeMac(mac: string): string {
  if (!mac) return ''
  // Remove separators and convert to lowercase
  const clean = mac.toLowerCase().replace(/[:\-]/g, '')
  // Format with colons: aa:bb:cc:dd:ee:ff
  return clean.match(/.{1,2}/g)?.join(':') || ''
}
