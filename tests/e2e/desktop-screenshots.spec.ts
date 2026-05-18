import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Desktop screenshot capture — exercises the UI and saves PNGs for visual self-review.
 *
 * Each screenshot lands in tests/screenshots/. When changes affect visuals,
 * Claude (or anyone reviewing) opens these PNGs and compares against docs/design/proposal.html.
 *
 * Tests do NOT assert on visuals — they only assert the page rendered without crashing.
 * Visual judgment stays human.
 */

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const API = 'http://localhost:3000';

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe('desktop UI — visual capture', () => {
  test('home view renders with no entries', async ({ page }) => {
    await page.goto('/');
    // Wait for the React root to mount + Mantine theme to apply.
    await page.waitForSelector('body', { state: 'attached' });
    // Give the globe / mapbox a moment to settle.
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-empty.png'),
      fullPage: false,
    });
  });

  test('home view renders with seeded entries', async ({ page, request }) => {
    // Seed a few entries across types
    const seeds = [
      { type: 'audio', lat: 37.7749, lng: -122.4194, accuracy: 10 }, // SF Mission
      { type: 'photo', lat: 37.7693, lng: -122.4824, accuracy: 8 },  // SF Sunset
      { type: 'moment', lat: 37.8044, lng: -122.2712, accuracy: 12 }, // Oakland
      { type: 'note', lat: 37.7858, lng: -122.4065, accuracy: 6, body: 'a thought' }, // SF
    ];
    const ids: string[] = [];
    for (const s of seeds) {
      const r = await request.post(`${API}/api/entries`, { data: s });
      const e = await r.json();
      ids.push(e.id);
    }

    await page.goto('/');
    await page.waitForSelector('body', { state: 'attached' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-seeded.png'),
      fullPage: false,
    });

    // cleanup
    for (const id of ids) await request.delete(`${API}/api/entries/${id}`);
  });

  test('page does not throw uncaught errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter benign errors (mapbox token missing in test env is expected)
    const real = errors.filter(
      e => !e.includes('mapbox') && !e.includes('Mapbox') && !e.includes('access token')
    );
    expect(real, `Uncaught errors on page load:\n${real.join('\n')}`).toEqual([]);
  });
});
