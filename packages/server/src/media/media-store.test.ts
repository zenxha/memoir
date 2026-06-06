import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * DiskMediaStore contract — exercised against a temp DATA_DIR.
 *
 *   - write/read/exists/delete roundtrip
 *   - write creates intermediate subdirs (peaks/, etc.)
 *   - delete is a no-op for missing files
 *   - path traversal is rejected by resolveSafe (Security V12)
 *   - exists for a nonexistent file returns false without throwing
 *
 * Module-scope `DATA_DIR` in disk-media-store.ts is captured at import time
 * from process.env.MEMOIR_DATA_DIR. We mkdtemp + setenv + vi.resetModules +
 * dynamic import in beforeEach so each test owns its own DATA_DIR.
 */

let tmpDir: string;
let DiskMediaStore: typeof import('./disk-media-store').DiskMediaStore;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoir-mstore-'));
  process.env.MEMOIR_DATA_DIR = tmpDir;
  vi.resetModules();
  ({ DiskMediaStore } = await import('./disk-media-store'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.MEMOIR_DATA_DIR;
});

describe('DiskMediaStore', () => {
  it('write → read → exists → delete roundtrip', async () => {
    const store = new DiskMediaStore();
    const stored = await store.write('foo.bin', Buffer.from('hi'));
    expect(stored).toBe('media/foo.bin');

    const buf = await store.read('media/foo.bin');
    expect(Buffer.compare(buf, Buffer.from('hi'))).toBe(0);

    expect(await store.exists('media/foo.bin')).toBe(true);

    await store.delete('media/foo.bin');
    expect(await store.exists('media/foo.bin')).toBe(false);
  });

  it('write creates intermediate subdirs', async () => {
    const store = new DiskMediaStore();
    const stored = await store.write('peaks/abc.json', Buffer.from('{}'));
    expect(stored).toBe('media/peaks/abc.json');

    const abs = path.join(tmpDir, 'media', 'peaks', 'abc.json');
    expect(fs.existsSync(abs)).toBe(true);
    expect(fs.readFileSync(abs, 'utf8')).toBe('{}');
  });

  it('delete is a no-op for missing files', async () => {
    const store = new DiskMediaStore();
    await expect(store.delete('media/nope.bin')).resolves.toBeUndefined();
  });

  it('rejects path traversal on read/write/delete (Security V12)', async () => {
    const store = new DiskMediaStore();
    await expect(store.read('../etc/passwd')).rejects.toThrow(/path traversal/);
    await expect(store.write('../escape.bin', Buffer.from(''))).rejects.toThrow(
      /path traversal/,
    );
    await expect(store.delete('../../../escape.bin')).rejects.toThrow(
      /path traversal/,
    );
  });

  it('exists returns false (no throw) for a nonexistent file', async () => {
    const store = new DiskMediaStore();
    expect(await store.exists('media/missing.bin')).toBe(false);
  });
});
