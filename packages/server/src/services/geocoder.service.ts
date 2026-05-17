import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class GeocoderService {
  async reverse(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Memoir/1.0 (personal archive)' } });
      if (!res.ok) return null;
      const data = await res.json() as { address?: Record<string, string>; display_name?: string };
      const a = data.address ?? {};
      return a['neighbourhood'] ?? a['suburb'] ?? a['quarter'] ?? a['city_district'] ??
             a['town'] ?? a['city'] ?? a['county'] ?? data.display_name ?? null;
    } catch {
      return null;
    }
  }
}
