import type { WeatherData } from '@/app/actions/weather'

export function WeatherCard({ weather }: { weather: WeatherData }) {
  return (
    <div className="bg-muted/30 flex items-center gap-4 rounded-lg border px-4 py-3">
      <span className="text-3xl leading-none" aria-hidden="true">
        {weather.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{weather.description}</p>
        <p className="text-muted-foreground text-xs">
          {weather.tempMax}° / {weather.tempMin}°C
          {weather.precipitationProbability > 0 && <> · {weather.precipitationProbability}% rain</>}
        </p>
      </div>
    </div>
  )
}
