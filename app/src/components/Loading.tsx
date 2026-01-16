export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
      <div className="w-10 h-10 border-[3px] border-border-visible border-t-cool rounded-full animate-spin" />
      <span className="text-text-secondary text-sm">Connecting to PicoThermostat...</span>
    </div>
  )
}
