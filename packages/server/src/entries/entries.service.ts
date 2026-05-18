import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DbService } from '../db/db.service';
import { EventsGateway } from '../events/events.gateway';
import { GeocoderService } from '../services/geocoder.service';
import { WeatherService } from '../services/weather.service';
import { CreateEntrySchema, UpdateEntrySchema, Entry, PhotoSession } from '@memoir/contract';
import { z } from 'zod';

const SESSION_GAP_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_GAP_M  = 50;              // 50 metres

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class EntriesService {
  constructor(
    private readonly db: DbService,
    private readonly events: EventsGateway,
    private readonly geocoder: GeocoderService,
    private readonly weather: WeatherService,
  ) {}

  findAll(query: { type?: string; source?: string; limit?: number; offset?: number; since?: number }): Entry[] {
    const { type, source, limit = 200, offset = 0, since } = query;
    let sql = 'SELECT * FROM entries WHERE 1=1';
    const params: unknown[] = [];
    if (type)   { sql += ' AND type = ?';       params.push(type); }
    if (source) { sql += ' AND source = ?';     params.push(source); }
    if (since)  { sql += ' AND created_at > ?'; params.push(since); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return (this.db.prepare(sql).all(...params) as Record<string, unknown>[]).map(this.parse);
  }

  findOne(id: string): Entry | null {
    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as Record<string, unknown> | null;
    return row ? this.parse(row) : null;
  }

  async create(dto: z.infer<typeof CreateEntrySchema>): Promise<Entry> {
    const id = randomUUID();
    const now = dto.created_at ?? Date.now();
    const { lat, lng } = dto;

    const [place_name, weather] = (lat != null && lng != null)
      ? await Promise.all([this.geocoder.reverse(lat, lng), this.weather.fetch(lat, lng, now)])
      : [null, null];

    this.db.prepare(`
      INSERT INTO entries
        (id, created_at, source, type, lat, lng, accuracy, altitude, place_name,
         title, body, duration_ms, waveform, music_title, music_artist, music_key,
         tags, weather, device_id, external_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, now, dto.source ?? 'native', dto.type,
      lat ?? null, lng ?? null, dto.accuracy ?? null, dto.altitude ?? null, place_name,
      dto.title ?? null, dto.body ?? null, dto.duration_ms ?? null,
      dto.waveform ? JSON.stringify(dto.waveform) : null,
      dto.music_title ?? null, dto.music_artist ?? null, dto.music_key ?? null,
      dto.tags ? JSON.stringify(dto.tags) : '[]',
      weather, dto.device_id ?? null,
      (dto as any).external_id ?? null,
    );

    const entry = this.findOne(id)!;
    this.events.broadcast('entry:new', entry);
    return entry;
  }

  update(id: string, dto: z.infer<typeof UpdateEntrySchema>): Entry | null {
    const allowed = ['title', 'body', 'lat', 'lng', 'place_name', 'music_title', 'music_artist', 'music_key', 'tags'] as const;
    const pairs = (Object.keys(dto) as (typeof allowed[number])[])
      .filter(k => allowed.includes(k) && dto[k] !== undefined);
    if (!pairs.length) return this.findOne(id);
    const set = pairs.map(k => `${k} = ?`).join(', ');
    const vals = pairs.map(k => k === 'tags' ? JSON.stringify(dto[k]) : dto[k]);
    this.db.prepare(`UPDATE entries SET ${set} WHERE id = ?`).run(...vals, id);
    const entry = this.findOne(id);
    if (entry) this.events.broadcast('entry:updated', entry);
    return entry;
  }

  remove(id: string) {
    this.db.prepare('DELETE FROM entries WHERE id = ?').run(id);
    this.events.broadcast('entry:deleted', { id });
  }

  findSessions(): PhotoSession[] {
    type PhotoRow = { id: string; created_at: number; lat: number; lng: number; place_name: string | null };
    const photos = this.db.prepare(
      `SELECT id, created_at, lat, lng, place_name
       FROM entries
       WHERE type = 'photo' AND lat IS NOT NULL AND lng IS NOT NULL
       ORDER BY created_at ASC`,
    ).all() as PhotoRow[];

    if (photos.length < 2) return [];

    const sessions: PhotoSession[] = [];
    let group: PhotoRow[] = [photos[0]];

    const flush = () => {
      if (group.length < 2) return;
      const lats = group.map(p => p.lat);
      const lngs = group.map(p => p.lng);
      sessions.push({
        entry_ids:   group.map(p => p.id),
        lat_center:  lats.reduce((a, b) => a + b, 0) / lats.length,
        lng_center:  lngs.reduce((a, b) => a + b, 0) / lngs.length,
        started_at:  group[0].created_at,
        ended_at:    group[group.length - 1].created_at,
        place_name:  group[0].place_name,
        frame_count: group.length,
      });
    };

    for (let i = 1; i < photos.length; i++) {
      const prev = group[group.length - 1];
      const curr = photos[i];
      const newSession =
        curr.created_at - prev.created_at > SESSION_GAP_MS ||
        haversineM(prev.lat, prev.lng, curr.lat, curr.lng) > SESSION_GAP_M;
      if (newSession) { flush(); group = [curr]; }
      else            { group.push(curr); }
    }
    flush();
    return sessions;
  }

  existsByExternalId(externalId: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM entries WHERE external_id = ?').get(externalId);
  }

  // Nearest native entry within the time window — used by importers to infer location
  nearestLocation(ts: number, windowMs = 30 * 60 * 1000): { lat: number; lng: number } | null {
    const row = this.db.prepare(`
      SELECT lat, lng FROM entries
      WHERE source = 'native' AND lat IS NOT NULL AND lng IS NOT NULL
        AND ABS(created_at - ?) <= ?
      ORDER BY ABS(created_at - ?) ASC
      LIMIT 1
    `).get(ts, windowMs, ts) as { lat: number; lng: number } | null;
    return row ?? null;
  }

  private parse(row: Record<string, unknown>): Entry {
    return {
      ...row,
      tags:        row['tags']     ? JSON.parse(row['tags'] as string)     : [],
      waveform:    row['waveform'] ? JSON.parse(row['waveform'] as string) : null,
      weather:     row['weather']  ? JSON.parse(row['weather'] as string)  : null,
      external_id: (row['external_id'] as string | null) ?? null,
    } as Entry;
  }
}
