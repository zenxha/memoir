/**
 * PeaksService — fire-and-forget audiowaveform pipeline.
 *
 * Mirrors WhisperService structurally:
 *   - OnApplicationBootstrap probes the `audiowaveform` binary on $PATH.
 *   - If absent, `enabled` stays false and every generateAsync() call is a no-op.
 *   - If present, backfills any audio entry with media_path NOT NULL AND
 *     peaks_path IS NULL (throttled ~75ms between rows), then services single
 *     generateAsync calls fired from MediaService.processUpload.
 *
 * Output JSON shape (per audiowaveform --bits 8):
 *   { version, channels, sample_rate, samples_per_pixel, bits: 8, length,
 *     data: [int8...] }
 *
 * **PITFALL 2 — WaveSurfer.js consumers MUST normalize the int8 data**
 * audiowaveform emits signed int8 (-128..+127) interleaved min/max sample pairs.
 * WaveSurfer.js expects normalized -1..+1 floats. Phase 5 consumers must divide
 * by 128 client-side (`peaks.map(p => p / 128)`) OR set `normalize: true` on the
 * WaveSurfer instance (less reliable for pre-computed peaks).
 * See .planning/phases/04-foundation/04-RESEARCH.md Pitfall 2.
 */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DbService } from '../db/db.service';

const PEAKS_PPS = 20;
const PEAKS_BITS = 8;
const ENTRY_ID_SAFE = /^[0-9a-zA-Z_-]+$/;

@Injectable()
export class PeaksService implements OnApplicationBootstrap {
  private readonly log = new Logger(PeaksService.name);
  private enabled = false;

  constructor(private readonly db: DbService) {}

  onApplicationBootstrap() {
    execFile('audiowaveform', ['--version'], (err) => {
      if (err) {
        this.log.log(
          'audiowaveform binary not found — peaks generation disabled (brew install audiowaveform to enable)',
        );
        return;
      }
      this.enabled = true;
      this.log.log('Peaks active (audiowaveform)');
      setImmediate(() => this.backfill());
    });
  }

  generateAsync(entryId: string, mediaPath: string) {
    if (!this.enabled) return;
    setImmediate(() => this.generateOne(entryId, mediaPath));
  }

  private generateOne(entryId: string, mediaPath: string) {
    if (!ENTRY_ID_SAFE.test(entryId)) {
      this.log.warn(`peaks: refusing unsafe entryId ${entryId}`);
      return;
    }

    const dataDir = process.env.MEMOIR_DATA_DIR
      ? path.resolve(process.env.MEMOIR_DATA_DIR)
      : path.join(__dirname, '../../data');
    const absInput = path.join(dataDir, mediaPath);
    const peaksDir = path.join(dataDir, 'media', 'peaks');
    fs.mkdirSync(peaksDir, { recursive: true });
    const peaksAbs = path.join(peaksDir, `${entryId}.json`);
    const peaksRel = `media/peaks/${entryId}.json`;

    execFile(
      'audiowaveform',
      [
        '-i', absInput,
        '-o', peaksAbs,
        '--pixels-per-second', String(PEAKS_PPS),
        '--bits', String(PEAKS_BITS),
      ],
      (err) => {
        if (err || !fs.existsSync(peaksAbs)) {
          this.log.warn(`peaks gen failed for ${entryId}: ${err?.message ?? 'no output file'}`);
          return;
        }
        this.db
          .prepare('UPDATE entries SET peaks_path = ? WHERE id = ?')
          .run(peaksRel, entryId);
      },
    );
  }

  private backfill() {
    const rows = this.db
      .prepare(
        `SELECT id, media_path FROM entries
         WHERE type = 'audio' AND media_path IS NOT NULL AND peaks_path IS NULL
         ORDER BY created_at DESC`,
      )
      .all() as { id: string; media_path: string }[];
    if (!rows.length) return;
    this.log.log(`Peaks backfill: ${rows.length} entries`);
    let i = 0;
    const tick = () => {
      if (i >= rows.length) {
        this.log.log('Peaks backfill complete');
        return;
      }
      const { id, media_path } = rows[i++];
      this.generateOne(id, media_path);
      setTimeout(tick, 75);
    };
    tick();
  }
}
