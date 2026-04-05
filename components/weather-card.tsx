import type { WeatherData } from '@/app/actions/weather';

export function WeatherCard({ weather }: { weather: WeatherData }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
      <span className="text-3xl leading-none" aria-hidden="true">
        {weather.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{weather.description}</p>
        <p className="text-xs text-muted-foreground">
          {weather.tempMax}° / {weather.tempMin}°C
          {weather.precipitationProbability > 0 && (
            <> · {weather.precipitationProbability}% rain</>
          )}
        </p>
      </div>
    </div>
  );
}
