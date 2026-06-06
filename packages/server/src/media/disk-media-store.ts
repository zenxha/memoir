import { Injectable, Logger } from '@nestjs/common';
import { promises as fsp } from 'fs';
import * as path from 'path';
import type { MediaStore } from './media-store';

const DATA_DIR = process.env.MEMOIR_DATA_DIR
  ? path.resolve(process.env.MEMOIR_DATA_DIR)
  : path.join(__dirname, '../../data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');

@Injectable()
export class DiskMediaStore implements MediaStore {
  private readonly log = new Logger(DiskMediaStore.name);

  async write(name: string, data: Buffer): Promise<string> {
    // Accept either a bare name (`thumb_x.jpg`, lives under media/) or a
    // path-like name (`peaks/uuid.json`). In both cases, prepend `media/`
    // only when the caller hasn't already.
    const rel = name.startsWith('media/') ? name : `media/${name}`;
    const abs = this.resolveSafe(rel);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, data);
    return rel;
  }

  async read(relPath: string): Promise<Buffer> {
    return fsp.readFile(this.resolveSafe(relPath));
  }

  async delete(relPath: string): Promise<void> {
    try {
      await fsp.unlink(this.resolveSafe(relPath));
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
    }
  }

  async exists(relPath: string): Promise<boolean> {
    try {
      await fsp.access(this.resolveSafe(relPath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reject any relPath whose resolved absolute path escapes MEDIA_DIR
   * (i.e. ${DATA_DIR}/media). Prevents `../../etc/passwd` traversal AND
   * `../escape.bin` writes that would land outside the media subdir
   * (Security V12 / T-04-03-V12). The boundary is the media subdir, not
   * the data root, because every legitimate path handled by this store
   * is rooted under media/.
   */
  private resolveSafe(relPath: string): string {
    const abs = path.resolve(DATA_DIR, relPath);
    if (abs !== MEDIA_DIR && !abs.startsWith(MEDIA_DIR + path.sep)) {
      throw new Error(`path traversal rejected: ${relPath}`);
    }
    return abs;
  }
}
