import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

const WMO: Record<number, string> = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 51: 'Light drizzle', 61: 'Light rain', 63: 'Rain',
  65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 80: 'Showers',
  95: 'Thunderstorm',
};

@Injectable()
export class WeatherService {
  async fetch(lat: number, lng: number, timestampMs: number): Promise<string | null> {
    try {
      const date = new Date(timestampMs).toISOString().split('T')[0];
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,weathercode&timezone=auto&start_date=${date}&end_date=${date}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json() as { daily?: { temperature_2m_max?: number[]; weathercode?: number[] } };
      const d = data.daily;
      if (!d) return null;
      return JSON.stringify({ temp: d.temperature_2m_max?.[0] ?? null, condition: WMO[d.weathercode?.[0] ?? -1] ?? null });
    } catch {
      return null;
    }
  }
}
