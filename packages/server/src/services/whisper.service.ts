import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DbService } from '../db/db.service';

@Injectable()
export class WhisperService {
  constructor(private readonly db: DbService) {}

  transcribeAsync(entryId: string, mediaPath: string) {
    const bin   = process.env.WHISPER_BIN;
    const model = process.env.WHISPER_MODEL;
    if (!bin || !model || !fs.existsSync(bin) || !fs.existsSync(model)) return;

    const absPath = path.join(__dirname, '../../data', mediaPath);
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
