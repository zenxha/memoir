import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DbService } from '../db/db.service';
import { EventsGateway } from '../events/events.gateway';
import { GeocoderService } from '../services/geocoder.service';
import { WeatherService } from '../services/weather.service';
import { CreateEntrySchema, UpdateEntrySchema, Entry } from '@memoir/contract';
import { z } from 'zod';

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
         tags, weather, device_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, now, dto.source ?? 'native', dto.type,
      lat ?? null, lng ?? null, dto.accuracy ?? null, dto.altitude ?? null, place_name,
      dto.title ?? null, dto.body ?? null, dto.duration_ms ?? null,
      dto.waveform ? JSON.stringify(dto.waveform) : null,
      dto.music_title ?? null, dto.music_artist ?? null, dto.music_key ?? null,
      dto.tags ? JSON.stringify(dto.tags) : '[]',
      weather, dto.device_id ?? null,
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

  private parse(row: Record<string, unknown>): Entry {
    return {
      ...row,
      tags:    row['tags']    ? JSON.parse(row['tags'] as string)    : [],
      waveform: row['waveform'] ? JSON.parse(row['waveform'] as string) : null,
      weather:  row['weather']  ? JSON.parse(row['weather'] as string)  : null,
    } as Entry;
  }
}
