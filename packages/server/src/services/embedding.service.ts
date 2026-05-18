import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import fetch from 'node-fetch';
import { DbService } from '../db/db.service';

const OLLAMA = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const MODEL  = 'nomic-embed-text';

@Injectable()
export class EmbeddingService implements OnApplicationBootstrap {
  private readonly log = new Logger(EmbeddingService.name);
  private enabled = false;

  constructor(private readonly db: DbService) {}

  async onApplicationBootstrap() {
    // Check if Ollama is reachable
    try {
      const res = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        this.enabled = true;
        this.log.log(`Embeddings active (${OLLAMA}, model: ${MODEL})`);
        setImmediate(() => this.backfill());
      }
    } catch {
      this.log.log('Ollama not reachable — embeddings disabled (start Ollama to enable)');
    }
  }

  // Called fire-and-forget after entry creation
  embedAsync(entryId: string) {
    if (!this.enabled) return;
    setImmediate(() => this.embedOne(entryId));
  }

  private async embedOne(entryId: string) {
    const row = this.db.prepare(
      'SELECT title, body, transcript, place_name, music_title, music_artist FROM entries WHERE id = ?'
    ).get(entryId) as Record<string, string | null> | null;
    if (!row) return;

    const text = [row.title, row.body, row.transcript, row.place_name, row.music_title, row.music_artist]
      .filter(Boolean).join(' ').trim();
    if (!text) return;

    const vec = await this.generate(text);
    if (!vec) return;

    const buf = Buffer.from(new Float32Array(vec).buffer);
    this.db.prepare('UPDATE entries SET embedding = ? WHERE id = ?').run(buf, entryId);
  }

  private async backfill() {
    const rows = this.db.prepare(
      "SELECT id FROM entries WHERE embedding IS NULL AND (title IS NOT NULL OR body IS NOT NULL OR transcript IS NOT NULL OR place_name IS NOT NULL)"
    ).all() as { id: string }[];

    if (!rows.length) return;
    this.log.log(`Embedding backfill: ${rows.length} entries`);

    for (const { id } of rows) {
      await this.embedOne(id);
      // Small delay to avoid hammering Ollama
      await new Promise(r => setTimeout(r, 50));
    }
    this.log.log('Embedding backfill complete');
  }

  private async generate(text: string): Promise<number[] | null> {
    try {
      const res = await fetch(`${OLLAMA}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, prompt: text }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json() as { embedding?: number[] };
      return data.embedding ?? null;
    } catch {
      return null;
    }
  }
}
