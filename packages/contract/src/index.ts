import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const EntryType = z.enum(['audio', 'photo', 'note', 'moment']);

export const WeatherSchema = z.object({
  temp: z.number().nullable(),
  condition: z.string().nullable(),
});

export const EntrySchema = z.object({
  id: z.string(),
  created_at: z.number(),
  imported_at: z.number().nullable(),
  source: z.string(),
  type: EntryType,
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  accuracy: z.number().nullable(),
  altitude: z.number().nullable(),
  place_name: z.string().nullable(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  duration_ms: z.number().nullable(),
  media_path: z.string().nullable(),
  media_thumb: z.string().nullable(),
  waveform: z.array(z.number()).nullable(),
  transcript: z.string().nullable(),
  music_title: z.string().nullable(),
  music_artist: z.string().nullable(),
  music_key: z.string().nullable(),
  tags: z.array(z.string()),
  weather: WeatherSchema.nullable(),
  device_id: z.string().nullable(),
});

export type Entry = z.infer<typeof EntrySchema>;
export type EntryType = z.infer<typeof EntryType>;

export const CreateEntrySchema = z.object({
  type: EntryType,
  created_at: z.number().optional(),
  source: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  altitude: z.number().nullable().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  duration_ms: z.number().nullable().optional(),
  waveform: z.array(z.number()).nullable().optional(),
  music_title: z.string().optional(),
  music_artist: z.string().optional(),
  music_key: z.string().optional(),
  tags: z.array(z.string()).optional(),
  device_id: z.string().optional(),
});

export const UpdateEntrySchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  place_name: z.string().optional(),
  music_title: z.string().optional(),
  music_artist: z.string().optional(),
  music_key: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const UploadResponseSchema = z.object({
  path: z.string(),
  thumb: z.string().nullable(),
});

export const contract = c.router({
  entries: c.router({
    list: {
      method: 'GET',
      path: '/api/entries',
      query: z.object({
        type: z.string().optional(),
        source: z.string().optional(),
        limit: z.coerce.number().optional(),
        offset: z.coerce.number().optional(),
        since: z.coerce.number().optional(),
      }),
      responses: { 200: z.array(EntrySchema) },
    },
    get: {
      method: 'GET',
      path: '/api/entries/:id',
      pathParams: z.object({ id: z.string() }),
      responses: {
        200: EntrySchema,
        404: z.object({ error: z.string() }),
      },
    },
    create: {
      method: 'POST',
      path: '/api/entries',
      body: CreateEntrySchema,
      responses: { 201: EntrySchema },
    },
    update: {
      method: 'PATCH',
      path: '/api/entries/:id',
      pathParams: z.object({ id: z.string() }),
      body: UpdateEntrySchema,
      responses: {
        200: EntrySchema,
        404: z.object({ error: z.string() }),
      },
    },
    remove: {
      method: 'DELETE',
      path: '/api/entries/:id',
      pathParams: z.object({ id: z.string() }),
      body: c.noBody(),
      responses: { 204: c.noBody() },
    },
  }),
  media: c.router({
    serve: {
      method: 'GET',
      path: '/api/media/:filename',
      pathParams: z.object({ filename: z.string() }),
      responses: { 200: c.otherResponse({ contentType: 'application/octet-stream', body: z.unknown() }) },
    },
  }),
});
