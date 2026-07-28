<?php

namespace App\Services;

use App\Models\Mongo\DocumentAttachment;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Centralizes the three-store write/delete for PII photos and scans:
 *
 *   bytes      → object storage (R2 in prod, local 'public' in dev)
 *   pointer    → PostgreSQL  (the caller saves the returned path onto its model)
 *   metadata   → MongoDB     (DocumentAttachment, keyed by object_key == path)
 *
 * PostgreSQL is authoritative. The Mongo metadata write is best-effort: if Mongo
 * is unreachable the upload still succeeds (the file + PG pointer are valid, and
 * `php artisan photos:reconcile` can backfill the metadata later). This avoids
 * coupling a citizen photo upload to the availability of the secondary DB.
 *
 * Which disk is used comes from config('filesystems.photos') (env PHOTO_DISK),
 * so flipping local ⇄ R2 needs no code change.
 */
class PhotoStorageService
{
    /** The disk that backs photos/scans (default 'public'; 'r2' in prod). */
    public function disk(): string
    {
        return config('filesystems.photos', 'public');
    }

    /**
     * Store (or replace) a photo. Deletes the object being replaced first so we
     * never orphan bytes, then writes the new object and its metadata doc.
     *
     * @param  array{reference_table?:string,reference_id?:int|string,document_type?:string,uploaded_by_user_id?:int}  $meta
     * @return string  The stored object key — persist this on the PG model.
     */
    public function store(UploadedFile $file, string $directory, string $filename, array $meta = [], ?string $replacing = null): string
    {
        if ($replacing) {
            $this->delete($replacing);
        }

        $disk = $this->disk();
        // Hash before the temp file is gone (it survives until request end).
        $checksum = @hash_file('sha256', $file->getRealPath()) ?: null;

        $path = $file->storeAs($directory, $filename, $disk);

        $this->recordMetadata($path, $disk, $file, $checksum, $meta);

        return $path;
    }

    /** Delete an object and its metadata doc. Both steps are fault-tolerant. */
    public function delete(?string $path): void
    {
        if (! $path) {
            return;
        }

        try {
            Storage::disk($this->disk())->delete($path);
        } catch (\Throwable $e) {
            Log::warning('Photo object delete failed', ['object_key' => $path, 'error' => $e->getMessage()]);
        }

        try {
            DocumentAttachment::where('object_key', $path)->delete();
        } catch (\Throwable $e) {
            Log::warning('Photo metadata delete (MongoDB) failed', ['object_key' => $path, 'error' => $e->getMessage()]);
        }
    }

    public function exists(?string $path): bool
    {
        return (bool) $path && Storage::disk($this->disk())->exists($path);
    }

    /** Stream the object back through the app (keeps PII behind the auth guard). */
    public function response(string $path)
    {
        return Storage::disk($this->disk())->response($path);
    }

    /** Upsert the Mongo metadata doc for a stored object. Best-effort. */
    private function recordMetadata(string $path, string $disk, UploadedFile $file, ?string $checksum, array $meta): void
    {
        try {
            DocumentAttachment::updateOrCreate(
                ['object_key' => $path],
                [
                    'disk' => $disk,
                    'reference_table' => $meta['reference_table'] ?? null,
                    'reference_id' => $meta['reference_id'] ?? null,
                    'document_type' => $meta['document_type'] ?? null,
                    'file_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'file_size_bytes' => $file->getSize(),
                    'checksum_sha256' => $checksum,
                    'uploaded_by_user_id' => $meta['uploaded_by_user_id'] ?? null,
                    'uploaded_at' => now(),
                    'schema_version' => 1,
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('Photo metadata write (MongoDB) failed — file + PG pointer are still valid', [
                'object_key' => $path,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
