import { Inject, Injectable } from '@nestjs/common';
import * as path from 'path';
import sharp from 'sharp';
import { DbService } from '../db/db.service';
import { WhisperService } from '../services/whisper.service';
import { PeaksService } from '../services/peaks.service';
import type { MediaStore } from './media-store';

const MEDIA_DIR = process.env.MEMOIR_DATA_DIR
  ? path.resolve(process.env.MEMOIR_DATA_DIR, 'media')
  : path.join(__dirname, '../../data/media');

@Injectable()
export class MediaService {
  constructor(
    private readonly db: DbService,
    private readonly whisper: WhisperService,
    private readonly peaks: PeaksService,
    @Inject('MediaStore') private readonly store: MediaStore,
  ) {}

  async processUpload(file: Express.Multer.File, entryId?: string): Promise<{ path: string; thumb: string | null }> {
    const relativePath = `media/${file.filename}`;
    let thumb: string | null = null;

    if (file.mimetype.startsWith('image/')) {
      const thumbName = `thumb_${file.filename.replace(/\.[^.]+$/, '.jpg')}`;
      try {
        const thumbBuf = await sharp(file.path).rotate().resize(400).jpeg({ quality: 75 }).toBuffer();
        await this.store.write(thumbName, thumbBuf);
        thumb = `media/${thumbName}`;
      } catch { /* non-fatal */ }
    }

    if (entryId) {
      this.db.prepare('UPDATE entries SET media_path = ?, media_thumb = ? WHERE id = ?')
        .run(relativePath, thumb, entryId);

      const isAudio = file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4';
      if (isAudio) this.whisper.transcribeAsync(entryId, relativePath);
      if (isAudio) this.peaks.generateAsync(entryId, relativePath);
    }

    return { path: relativePath, thumb };
  }

  // Used by MediaController.serveFile for res.sendFile (which needs an absolute path).
  // All other I/O goes through `this.store`.
  getFilePath(filename: string): string {
    return path.join(MEDIA_DIR, filename);
  }

  async exists(filename: string): Promise<boolean> {
    return this.store.exists(`media/${filename}`);
  }
}
