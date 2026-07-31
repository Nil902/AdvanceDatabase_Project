<?php

namespace App\Services;

use App\Models\DocumentAttachmentImage;
use App\Models\FamilyDocumentAttachment;
use App\Models\Mongo\DocumentAttachment;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PDO;

/**
 * Stores a citizen's official documents across every store:
 *
 *   record    → PostgreSQL  (family_document_attachments — the attachment row)
 *   bytes     → PostgreSQL  (document_attachment_images.image_data, a bytea blob)
 *   bytes     → Object store (R2 in prod, local 'public' in dev — the bucket)
 *   metadata  → MongoDB     (document_attachments, keyed by pg_attachment_id)
 *
 * The two PostgreSQL writes share a transaction so we never leave a record
 * without its bytes; PostgreSQL is authoritative. The R2 mirror and the Mongo
 * metadata write both run after commit and are best-effort (mirrors
 * PhotoStorageService): if either store is unreachable the document is still
 * safely persisted in Postgres. The R2 disk comes from config('filesystems.photos'),
 * the same bucket as citizen photos. The 8 MB cap (DocumentUploadRequest) keeps
 * the inline PG copy reasonable.
 */
class CitizenDocumentService
{
    /**
     * Persist one uploaded document for a citizen and return the PG attachment
     * (with its images relation loaded).
     */
    public function store(int $citizenId, UploadedFile $file, string $documentType, int $uploadedBy): FamilyDocumentAttachment
    {
        $checksum = @hash_file('sha256', $file->getRealPath()) ?: '';

        $attachment = DB::transaction(function () use ($citizenId, $file, $documentType, $uploadedBy, $checksum) {
            $attachment = FamilyDocumentAttachment::create([
                'reference_table' => 'citizens',
                'reference_id' => $citizenId,
                'document_type' => $documentType,
                'uploaded_by' => $uploadedBy,
                'uploaded_at' => now(),
            ]);

            // The bytes go into a PostgreSQL `bytea` column. Binding a raw binary
            // string through Eloquent/PDO on a UTF-8 connection throws "invalid
            // byte sequence for encoding UTF8", so we bind the file handle as a
            // LOB — the canonical, driver-safe way to write bytea.
            $handle = fopen($file->getRealPath(), 'rb');

            try {
                $pdo = DB::connection()->getPdo();
                $stmt = $pdo->prepare(
                    'INSERT INTO document_attachment_images
                        (attachment_id, image_data, mime_type, file_name, file_size_bytes, page_number, checksum_sha256, uploaded_by, uploaded_at)
                     VALUES (:attachment_id, :image_data, :mime_type, :file_name, :file_size_bytes, NULL, :checksum, :uploaded_by, :uploaded_at)'
                );
                $stmt->bindValue(':attachment_id', $attachment->attachment_id, PDO::PARAM_INT);
                $stmt->bindValue(':image_data', $handle, PDO::PARAM_LOB);
                $stmt->bindValue(':mime_type', $file->getClientMimeType());
                $stmt->bindValue(':file_name', $file->getClientOriginalName());
                $stmt->bindValue(':file_size_bytes', $file->getSize(), PDO::PARAM_INT);
                $stmt->bindValue(':checksum', $checksum);
                $stmt->bindValue(':uploaded_by', $uploadedBy, PDO::PARAM_INT);
                $stmt->bindValue(':uploaded_at', now()->toDateTimeString());
                $stmt->execute();
            } finally {
                fclose($handle);
            }

            return $attachment;
        });

        // Mirror the bytes into the bucket (R2), then record metadata in Mongo.
        // Both run post-commit and are best-effort — Postgres already holds the
        // authoritative copy.
        $objectKey = $this->mirrorToBucket($attachment, $file);

        $this->recordMetadata($attachment, $file, $checksum, $uploadedBy, $objectKey);

        return $attachment->load('images');
    }

    /** The bucket disk that mirrors documents (same one used for photos). */
    private function bucketDisk(): string
    {
        return config('filesystems.photos', 'public');
    }

    /**
     * Copy the uploaded bytes into object storage under a deterministic key and
     * persist the pointer on the PG row. Best-effort: an R2 outage must not fail
     * the upload (the PG copy is authoritative). Returns the object key or null.
     */
    private function mirrorToBucket(FamilyDocumentAttachment $attachment, UploadedFile $file): ?string
    {
        $disk = $this->bucketDisk();
        $ext = $file->getClientOriginalExtension() ?: 'bin';
        $key = "documents/citizens/{$attachment->reference_id}/{$attachment->attachment_id}.{$ext}";

        try {
            Storage::disk($disk)->put($key, file_get_contents($file->getRealPath()));
            $attachment->update(['object_key' => $key, 'storage_disk' => $disk]);

            return $key;
        } catch (\Throwable $e) {
            Log::warning('Document bucket mirror failed — PG copy is still valid', [
                'pg_attachment_id' => $attachment->attachment_id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Delete one of a citizen's documents from every store (PG record + bytes,
     * R2 mirror, Mongo metadata). Scoped to the citizen so an attachment_id from
     * another record can't be deleted here (returns false → caller 404s). The two
     * PG deletes share a transaction; the R2 and Mongo deletes are best-effort.
     */
    public function delete(int $citizenId, int $attachmentId): bool
    {
        $attachment = FamilyDocumentAttachment::query()
            ->whereKey($attachmentId)
            ->where('reference_table', 'citizens')
            ->where('reference_id', $citizenId)
            ->first();

        if (! $attachment) {
            return false;
        }

        $objectKey = $attachment->object_key;
        $disk = $attachment->storage_disk ?: $this->bucketDisk();

        DB::transaction(function () use ($attachment) {
            // Images carry an FK to the attachment with no cascade, so delete the
            // bytes first, then the record.
            DocumentAttachmentImage::where('attachment_id', $attachment->attachment_id)->delete();
            $attachment->delete();
        });

        // Remove the bucket mirror (best-effort — never orphan-block a delete).
        if ($objectKey) {
            try {
                Storage::disk($disk)->delete($objectKey);
            } catch (\Throwable $e) {
                Log::warning('Document bucket delete failed', [
                    'object_key' => $objectKey,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        try {
            DocumentAttachment::where('pg_attachment_id', $attachmentId)->delete();
        } catch (\Throwable $e) {
            Log::warning('Document metadata delete (MongoDB) failed — PG rows are already gone', [
                'pg_attachment_id' => $attachmentId,
                'error' => $e->getMessage(),
            ]);
        }

        return true;
    }

    /** Upsert the Mongo metadata doc and link it back onto the PG row. Best-effort. */
    private function recordMetadata(FamilyDocumentAttachment $attachment, UploadedFile $file, string $checksum, int $uploadedBy, ?string $objectKey): void
    {
        try {
            $doc = DocumentAttachment::updateOrCreate(
                ['pg_attachment_id' => $attachment->attachment_id],
                [
                    'object_key' => $objectKey,
                    'disk' => $objectKey ? $this->bucketDisk() : null,
                    'reference_table' => $attachment->reference_table,
                    'reference_id' => $attachment->reference_id,
                    'document_type' => $attachment->document_type,
                    'file_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'file_size_bytes' => $file->getSize(),
                    'checksum_sha256' => $checksum,
                    'uploaded_by_user_id' => $uploadedBy,
                    'uploaded_at' => now(),
                    'schema_version' => 1,
                ]
            );

            // Store the Mongo _id on the PG row so the two stores can be joined
            // from either side (matches certificate_printing_logs.mongo_log_id).
            $attachment->update(['mongo_document_id' => (string) $doc->getKey()]);
        } catch (\Throwable $e) {
            Log::warning('Document metadata write (MongoDB) failed — PG record + bytes are still valid', [
                'pg_attachment_id' => $attachment->attachment_id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
