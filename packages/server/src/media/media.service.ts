import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { DbService } from '../db/db.service';
import { WhisperService } from '../services/whisper.service';

const MEDIA_DIR = process.env.MEMOIR_DATA_DIR
  ? path.resolve(process.env.MEMOIR_DATA_DIR, 'media')
  : path.join(__dirname, '../../data/media');

@Injectable()
export class MediaService {
  constructor(
    private readonly db: DbService,
    private readonly whisper: WhisperService,
  ) {}

  async processUpload(file: Express.Multer.File, entryId?: string): Promise<{ path: string; thumb: string | null }> {
    const relativePath = `media/${file.filename}`;
    let thumb: string | null = null;

    if (file.mimetype.startsWith('image/')) {
      const thumbName = `thumb_${file.filename.replace(/\.[^.]+$/, '.jpg')}`;
      try {
        await sharp(file.path).rotate().resize(400).jpeg({ quality: 75 }).toFile(path.join(MEDIA_DIR, thumbName));
        thumb = `media/${thumbName}`;
      } catch { /* non-fatal */ }
    }

    if (entryId) {
      this.db.prepare('UPDATE entries SET media_path = ?, media_thumb = ? WHERE id = ?')
        .run(relativePath, thumb, entryId);

      const isAudio = file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4';
      if (isAudio) this.whisper.transcribeAsync(entryId, relativePath);
    }

    return { path: relativePath, thumb };
  }

  getFilePath(filename: string): string {
    return path.join(MEDIA_DIR, filename);
  }

  exists(filename: string): boolean {
    return fs.existsSync(this.getFilePath(filename));
  }
}
