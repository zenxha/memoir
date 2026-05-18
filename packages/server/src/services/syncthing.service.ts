import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { EntriesService } from '../entries/entries.service';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);

@Injectable()
export class SyncthingService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(SyncthingService.name);
  private watcher: fs.FSWatcher | null = null;

  constructor(private readonly entries: EntriesService) {}

  onApplicationBootstrap() {
    const dir = process.env.SYNCTHING_MEDIA_DIR;
    if (!dir || !fs.existsSync(dir)) {
      this.log.log('SYNCTHING_MEDIA_DIR not set or missing — photo ingest disabled');
      return;
    }
    this.log.log(`Syncthing ingest watching ${dir}`);
    this.watcher = fs.watch(dir, { persistent: false }, (event, filename) => {
      if (event !== 'rename' || !filename) return;
      const ext = path.extname(filename).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) return;
      const full = path.join(dir, filename);
      // Brief delay — let Syncthing finish writing before we read
      setTimeout(() => this.ingest(full, filename), 2000);
    });
  }

  onModuleDestroy() {
    this.watcher?.close();
  }

  private async ingest(fullPath: string, filename: string) {
    if (!fs.existsSync(fullPath)) return;

    const externalId = `syncthing:${filename}`;
    if (this.entries.existsByExternalId(externalId)) return;

    let lat: number | null   = null;
    let lng: number | null   = null;
    let createdAt: number    = Date.now();

    try {
      // Dynamic import — exifr is ESM
      const exifr = await import('exifr');
      const exif  = await exifr.default.parse(fullPath, {
        pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef'],
      });
      if (exif?.DateTimeOriginal) createdAt = new Date(exif.DateTimeOriginal).getTime();
      if (exif?.latitude != null)  lat = exif.latitude;
      if (exif?.longitude != null) lng = exif.longitude;
      // exifr resolves GPS refs automatically via .parse() with gps:true
      const gps = await exifr.default.gps(fullPath).catch(() => null);
      if (gps?.latitude != null)  lat = gps.latitude;
      if (gps?.longitude != null) lng = gps.longitude;
    } catch (err) {
      this.log.warn(`EXIF parse failed for ${filename}: ${(err as Error).message}`);
    }

    try {
      await this.entries.create({
        type:        'photo',
        source:      'syncthing',
        created_at:  createdAt,
        media_path:  fullPath,
        external_id: externalId,
        ...(lat != null && lng != null ? { lat, lng } : {}),
      } as any);
      this.log.log(`Syncthing ingested ${filename}`);
    } catch (err) {
      this.log.warn(`Failed to ingest ${filename}: ${(err as Error).message}`);
    }
  }
}
