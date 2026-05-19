import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DbService } from '../db/db.service';

@Injectable()
export class WhisperService implements OnApplicationBootstrap {
  private readonly log = new Logger(WhisperService.name);

  constructor(private readonly db: DbService) {}

  onApplicationBootstrap() {
    const bin   = process.env.WHISPER_BIN;
    const model = process.env.WHISPER_MODEL;
    if (!bin || !model || !fs.existsSync(bin) || !fs.existsSync(model)) {
      this.log.log('Whisper not configured — transcription disabled (set WHISPER_BIN + WHISPER_MODEL)');
      return;
    }
    this.log.log(`Whisper active (${path.basename(bin)}, ${path.basename(model)})`);
    setImmediate(() => this.backfill());
  }

  private backfill() {
    const rows = this.db.prepare(
      "SELECT id, media_path FROM entries WHERE type='audio' AND media_path IS NOT NULL AND transcript IS NULL"
    ).all() as { id: string; media_path: string }[];
    if (!rows.length) return;
    this.log.log(`Whisper backfill: ${rows.length} audio entries without transcripts`);
    for (const { id, media_path } of rows) {
      this.transcribeAsync(id, media_path);
    }
  }

  transcribeAsync(entryId: string, mediaPath: string) {
    const bin   = process.env.WHISPER_BIN;
    const model = process.env.WHISPER_MODEL;
    if (!bin || !model || !fs.existsSync(bin) || !fs.existsSync(model)) return;

    const dataDir = process.env.MEMOIR_DATA_DIR
      ? path.resolve(process.env.MEMOIR_DATA_DIR)
      : path.join(__dirname, '../../data');
    const absPath = path.join(dataDir, mediaPath);
    const wavPath = absPath.replace(/\.[^.]+$/, '_whisper.wav');

    execFile('ffmpeg', ['-i', absPath, '-ar', '16000', '-ac', '1', '-y', wavPath], (err) => {
      if (err) return;
      execFile(bin, ['-m', model, '-f', wavPath, '--output-txt', '--no-prints', '--output-file', wavPath], () => {
        fs.unlink(wavPath, () => {});
        const txtPath = `${wavPath}.txt`;
        if (!fs.existsSync(txtPath)) return;
        const transcript = fs.readFileSync(txtPath, 'utf8').trim();
        fs.unlink(txtPath, () => {});
        this.db.prepare('UPDATE entries SET transcript = ? WHERE id = ?').run(transcript, entryId);
      });
    });
  }
}
