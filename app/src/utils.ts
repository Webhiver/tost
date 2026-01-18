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
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}
