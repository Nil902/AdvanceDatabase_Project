<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

// Collection: document_attachments (MongoDB)
// Metadata only — the binary file lives in object storage (R2/local disk),
// referenced by `object_key` (== the PostgreSQL photo_path/avatar_path). This
// is the join key that ties Postgres ⇄ R2 ⇄ Mongo together.
class DocumentAttachment extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'document_attachments';

    protected $fillable = [
        // Object-storage pointer (the join key across all three stores).
        'object_key', 'disk',
        'pg_attachment_id', 'pg_image_id', 'reference_table', 'reference_id',
        'document_type', 'file_name', 'mime_type', 'file_size_bytes',
        'extracted_text', 'page_count', 'checksum_sha256', 'tags', 'language',
        'access_level', 'expires_at', 'retention_policy',
        'uploaded_by_user_id', 'uploaded_at', 'verified_by_user_id', 'verified_at',
        'is_superseded', 'superseded_by', 'schema_version',
    ];

    protected $casts = [
        'tags' => 'array',
        'expires_at' => 'datetime',
        'uploaded_at' => 'datetime',
        'verified_at' => 'datetime',
        'is_superseded' => 'boolean',
    ];
}
