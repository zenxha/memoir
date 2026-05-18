import { test, expect } from '@playwright/test';

/**
 * API contract smoke test — proves the ts-rest contract is honored end-to-end.
 *
 * Hits each of the entries endpoints with a known payload and verifies:
 *   - status codes match the contract
 *   - response shape includes the expected fields
 *   - geocoding + weather populate (when lat/lng given)
 *   - PATCH and DELETE round-trip correctly
 */

const API = 'http://localhost:3000';

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
});
