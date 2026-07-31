<?php

namespace App\Services;

use App\Models\FamilyDocumentAttachment;
use App\Models\Mongo\DocumentAttachment;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PDO;

/**
 * Stores a citizen's official documents across both databases:
 *
 *   record    → PostgreSQL  (family_document_attachments — the attachment row)
 *   bytes     → PostgreSQL  (document_attachment_images.image_data, a bytea blob)
 *   metadata  → MongoDB     (document_attachments, keyed by pg_attachment_id)
 *
 * The two PostgreSQL writes share a transaction so we never leave a record
 * without its bytes. The Mongo metadata write is best-effort (mirrors
 * PhotoStorageService): if Mongo is unreachable the document is still safely
 * persisted in Postgres, which is authoritative.
 *
 * Unlike PhotoStorageService (which puts bytes on object storage/R2), documents
 * are stored inline in PostgreSQL so the whole record lives in the relational
 * DB — hence the 8 MB upload cap in DocumentUploadRequest.
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

        $this->recordMetadata($attachment, $file, $checksum, $uploadedBy);

        return $attachment->load('images');
    }

    /** Upsert the Mongo metadata doc and link it back onto the PG row. Best-effort. */
    private function recordMetadata(FamilyDocumentAttachment $attachment, UploadedFile $file, string $checksum, int $uploadedBy): void
    {
        try {
            $doc = DocumentAttachment::updateOrCreate(
                ['pg_attachment_id' => $attachment->attachment_id],
                [
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
