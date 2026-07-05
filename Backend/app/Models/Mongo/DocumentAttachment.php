<?php

namespace App\Models\Mongo;

use Jenssegers\Mongodb\Eloquent\Model;

// Collection: document_attachments (MongoDB)
// Metadata only — binary file data lives in PostgreSQL document_attachment_images.
class DocumentAttachment extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'document_attachments';

    protected $fillable = [
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
