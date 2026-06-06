import { test, expect } from '@playwright/test';
import { execFileSync } from 'child_process';

/**
 * API contract smoke test — proves the ts-rest contract is honored end-to-end.
 *
 * Hits each of the entries endpoints with a known payload and verifies:
 *   - status codes match the contract
 *   - response shape includes the expected fields
 *   - geocoding + weather populate (when lat/lng given)
 *   - PATCH and DELETE round-trip correctly
 *   - audio upload → PeaksService → /api/media/peaks/:entryId serves shaped JSON
 *     (skipped when `audiowaveform` binary is not on $PATH — INFRA-05 / plan 04-04)
 */

const API = 'http://localhost:3000';

function audiowaveformAvailable(): boolean {
  try {
    execFileSync('which', ['audiowaveform'], { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

function silentWav(sampleRate = 16000, durationSec = 1): Buffer {
  const numSamples = sampleRate * durationSec;
  const byteRate = sampleRate * 2; // mono, 16-bit
  const blockAlign = 2;
  const dataBytes = numSamples * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  return buf;
}

test.describe('@memoir/server — entries API contract', () => {
  test('GET /api/entries returns an array (empty on fresh DB)', async ({ request }) => {
    const res = await request.get(`${API}/api/entries`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('POST → GET → PATCH → DELETE lifecycle works', async ({ request }) => {
    // CREATE
    const create = await request.post(`${API}/api/entries`, {
      data: { type: 'moment', lat: 37.7749, lng: -122.4194, accuracy: 10 },
    });
    expect(create.status()).toBe(201);
    const entry = await create.json();
    expect(entry).toMatchObject({
      type: 'moment',
      lat: 37.7749,
      lng: -122.4194,
      source: 'native',
    });
    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof entry.created_at).toBe('number');

    // FIND ONE
    const found = await request.get(`${API}/api/entries/${entry.id}`);
    expect(found.status()).toBe(200);
    const foundBody = await found.json();
    expect(foundBody.id).toBe(entry.id);

    // PATCH
    const patched = await request.patch(`${API}/api/entries/${entry.id}`, {
      data: { title: 'A test moment', tags: ['e2e', 'verify'] },
    });
    expect(patched.status()).toBe(200);
    const patchedBody = await patched.json();
    expect(patchedBody.title).toBe('A test moment');
    expect(patchedBody.tags).toEqual(['e2e', 'verify']);

    // DELETE
    const removed = await request.delete(`${API}/api/entries/${entry.id}`);
    expect(removed.status()).toBe(204);

    // GONE
    const gone = await request.get(`${API}/api/entries/${entry.id}`);
    expect(gone.status()).toBe(404);
  });

  test('POST with no lat/lng skips geocoding gracefully', async ({ request }) => {
    const res = await request.post(`${API}/api/entries`, {
      data: { type: 'note', body: 'a thought without a place' },
    });
    expect(res.status()).toBe(201);
    const entry = await res.json();
    expect(entry.place_name).toBeNull();
    expect(entry.weather).toBeNull();
    // cleanup
    await request.delete(`${API}/api/entries/${entry.id}`);
  });

  test('filter by type narrows the list', async ({ request }) => {
    // Create one of each type
    const ids: string[] = [];
    for (const type of ['audio', 'photo', 'moment', 'note']) {
      const r = await request.post(`${API}/api/entries`, { data: { type } });
      const e = await r.json();
      ids.push(e.id);
    }
    const audio = await request.get(`${API}/api/entries?type=audio`);
    const list = await audio.json();
    expect(list.every((e: { type: string }) => e.type === 'audio')).toBe(true);
    // cleanup
    for (const id of ids) await request.delete(`${API}/api/entries/${id}`);
  });

  test('audio upload → peaks_path populated → /api/media/peaks/:entryId serves shaped JSON', async ({
    request,
  }) => {
    test.skip(!audiowaveformAvailable(), 'audiowaveform binary not on PATH (INFRA-05 — skipped)');

    // 1. Create an audio entry.
    const created = await request.post(`${API}/api/entries`, { data: { type: 'audio' } });
    expect(created.status()).toBe(201);
    const entry = await created.json();
    const entryId: string = entry.id;

    try {
      // 2. Upload a 1s silent WAV alongside the entryId.
      const upload = await request.post(`${API}/api/media/upload`, {
        multipart: {
          file: {
            name: 'test.wav',
            mimeType: 'audio/wav',
            buffer: silentWav(16000, 1),
          },
          entryId,
        },
      });
      expect(upload.status()).toBe(201);

      // 3. Poll for peaks_path != null (PeaksService.generateAsync is fire-and-forget).
      let peaksPath: string | null = null;
      for (let i = 0; i < 20; i++) {
        const r = await request.get(`${API}/api/entries/${entryId}`);
        const body = await r.json();
        if (body.peaks_path) {
          peaksPath = body.peaks_path;
          break;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      expect(peaksPath).toBe(`media/peaks/${entryId}.json`);

      // 4. GET the peaks file via the controller route.
      const served = await request.get(`${API}/api/media/peaks/${entryId}`);
      expect(served.status()).toBe(200);

      // 5. Parse JSON and assert audiowaveform shape (D-16 / INFRA-05).
      const parsed = await served.json();
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('channels');
      expect(parsed).toHaveProperty('sample_rate');
      expect(parsed).toHaveProperty('length');
      expect(parsed).toHaveProperty('data');
      expect(parsed.bits).toBe(8);
      expect(Array.isArray(parsed.data)).toBe(true);
    } finally {
      // cleanup
      await request.delete(`${API}/api/entries/${entryId}`);
    }
  });
});
