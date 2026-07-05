<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentAttachmentImage extends Model
{
    protected $primaryKey = 'image_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'attachment_id', 'image_data', 'mime_type', 'file_name',
        'file_size_bytes', 'page_number', 'checksum_sha256',
        'uploaded_by', 'uploaded_at',
    ];

    protected $casts = ['uploaded_at' => 'datetime'];
    protected $hidden = ['image_data'];

    public function attachment()
    {
        return $this->belongsTo(FamilyDocumentAttachment::class, 'attachment_id', 'attachment_id');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(SystemUser::class, 'uploaded_by', 'user_id');
    }
}
