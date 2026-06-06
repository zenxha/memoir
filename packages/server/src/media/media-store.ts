/**
 * MediaStore — single abstraction for post-ingest media artifact I/O.
 *
 * Multer owns multipart parsing (ingress) in MediaController.
 * MediaStore is the destination layer for everything else: thumbnail writes,
 * peaks json, existence checks, deletes. A future remote tier (NAS, cloud
 * bucket) implements this same interface — MediaService is oblivious.
 *
 * All ops are async (Promise-returning) even though the disk impl is mostly
 * sync. Keeping the contract async keeps the remote-tier swap drop-in
 * compatible (D-20).
 */
export interface MediaStore {
  /** Write a buffer to a logical name (relative under media/). Returns the stored relative path (e.g., 'media/thumb_x.jpg' or 'media/peaks/uuid.json'). */
  write(name: string, data: Buffer): Promise<string>;
  /** Read by relative path (e.g., 'media/peaks/uuid.json'). */
  read(relPath: string): Promise<Buffer>;
  /** Delete by relative path. No-op if missing (ENOENT swallowed). */
  delete(relPath: string): Promise<void>;
  /** Check existence by relative path. */
  exists(relPath: string): Promise<boolean>;
}
