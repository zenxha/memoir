import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import fetch from 'node-fetch';
import { DbService } from '../db/db.service';

const OLLAMA = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const MODEL = process.env.EMBED_MODEL ?? 'nomic-embed-text';

// Known 768-dim models — used to surface a boot-time warning if EMBED_MODEL
// is set to something the entries_vec virtual table can't accept (Pitfall 5).
const KNOWN_768_MODELS = new Set([
  'nomic-embed-text',
  'nomic-embed-text-v1',
  'nomic-embed-text:latest',
]);

// Embedding-worker retry policy (Pitfall 8):
// - On success, throttle the next pull by NORMAL_THROTTLE_MS.
// - On Ollama-unreachable failure, retry the SAME row after BACKOFF_MS.
// - After CIRCUIT_BREAK_FAILURES consecutive failures, extend the wait to
//   CIRCUIT_BREAK_MS (~1h) to stop hot-looping CPU/log spam.
const NORMAL_THROTTLE_MS = 50;
const BACKOFF_MS = 30_000;
const CIRCUIT_BREAK_FAILURES = 10;
const CIRCUIT_BREAK_MS = 3_600_000;

@Injectable()
export class EmbeddingService implements OnApplicationBootstrap {
  private readonly log = new Logger(EmbeddingService.name);
  private enabled = false;

  constructor(private readonly db: DbService) {}

  async onApplicationBootstrap() {
    try {
      const res = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        this.enabled = true;
        this.log.log(`Embeddings active (${OLLAMA}, model: ${MODEL})`);
        if (!KNOWN_768_MODELS.has(MODEL)) {
          this.log.warn(
            `EMBED_MODEL='${MODEL}' is not a known 768-dim model — vec0 writes may fail (Pitfall 5)`,
          );
        }
        setImmediate(() => this.backfill());
      }
    } catch {
      this.log.log('Ollama not reachable — embeddings disabled (start Ollama to enable)');
    }
  }

  // Called fire-and-forget after entry creation. Backoff state is NOT shared
  // with single-shot calls — only the backfill loop tracks consecutive failures.
  embedAsync(entryId: string) {
    if (!this.enabled) return;
    setImmediate(() => this.embedOne(entryId));
  }

  // Public so a future Phase 6 RecallService can inject EmbeddingService and
  // reuse the Ollama call without duplicating fetch logic (D-MECH-02).
  public async generate(text: string): Promise<number[] | null> {
    try {
      const res = await fetch(`${OLLAMA}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, prompt: text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { embedding?: number[] };
      return data.embedding ?? null;
    } catch {
      return null;
    }
  }

  // Embed one row. Returns true on a generate() success (even if dim mismatch
  // caused the vec0 write to be skipped), false on generate() failure so the
  // worker can advance its consecutive-failure counter (Pitfall 8).
  private async embedOne(entryId: string): Promise<boolean> {
    const row = this.db
      .prepare('SELECT rowid, title, body, transcript FROM entries WHERE id = ?')
      .get(entryId) as
      | { rowid: number; title: string | null; body: string | null; transcript: string | null }
      | null;
    if (!row) return true; // missing row is not a generate failure — skip silently

    const text = [row.title, row.body, row.transcript].filter(Boolean).join(' \n ').trim();
    if (!text) return true; // nothing to embed — not a failure

    const vec = await this.generate(text);
    if (!vec) return false;

    const buf = Buffer.from(new Float32Array(vec).buffer);
    const dimOk = vec.length === 768;
    if (!dimOk) {
      this.log.warn(
        `Embedding dim mismatch for ${entryId}: got ${vec.length}, expected 768 — skipping vec0 mirror`,
      );
    }

    const tx = this.db.transaction(() => {
      this.db
        .prepare('UPDATE entries SET embedding = ?, embedding_model = ? WHERE id = ?')
        .run(buf, MODEL, entryId);
      if (dimOk) {
        // vec0 requires a BigInt for the rowid PRIMARY KEY binding — passing a
        // plain JS Number raises "Only integers are allows for primary key
        // values on entries_vec" even when `typeof rowid === 'number'` (Pitfall 1).
        this.db
          .prepare('INSERT OR REPLACE INTO entries_vec(rowid, embedding) VALUES (?, ?)')
          .run(BigInt(row.rowid), buf);
      }
    });
    tx();
    return true;
  }

  // Unified FIFO worker (D-04, D-05): covers BOTH the initial backfill case
  // (`embedding IS NULL`) AND the regenerate-after-model-swap case
  // (`embedding_model != MODEL`). Ordered newest-first so the most recent
  // captures become searchable first after a swap.
  private async backfill() {
    let consecutiveFailures = 0;
    let warnedThisBurst = false;

    while (this.enabled) {
      const row = this.db
        .prepare(
          `SELECT id FROM entries
           WHERE (embedding IS NULL AND (title IS NOT NULL OR body IS NOT NULL OR transcript IS NOT NULL))
              OR (embedding IS NOT NULL AND embedding_model != ?)
           ORDER BY created_at DESC
           LIMIT 1`,
        )
        .get(MODEL) as { id: string } | undefined;

      if (!row) return; // nothing left to do

      const ok = await this.embedOne(row.id);

      if (ok) {
        if (consecutiveFailures > 0) {
          this.log.log('Ollama recovered — embedding worker resuming');
        }
        consecutiveFailures = 0;
        warnedThisBurst = false;
        await new Promise<void>(r => setTimeout(r, NORMAL_THROTTLE_MS));
      } else {
        consecutiveFailures += 1;
        if (!warnedThisBurst) {
          this.log.warn('Ollama unreachable — embedding worker entering backoff');
          warnedThisBurst = true;
        }
        const delay =
          consecutiveFailures >= CIRCUIT_BREAK_FAILURES ? CIRCUIT_BREAK_MS : BACKOFF_MS;
        await new Promise<void>(r => setTimeout(r, delay));
      }
    }
  }
}
