<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BirthCertificateImage extends Model
{
    protected $primaryKey = 'image_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'certificate_id', 'image_data', 'mime_type', 'file_name',
        'file_size_bytes', 'checksum_sha256', 'uploaded_by', 'uploaded_at',
    ];

    protected $casts = ['uploaded_at' => 'datetime'];
    protected $hidden = ['image_data'];

    public function certificate()
    {
        return $this->belongsTo(BirthCertificate::class, 'certificate_id', 'certificate_id');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(SystemUser::class, 'uploaded_by', 'user_id');
    }
}
