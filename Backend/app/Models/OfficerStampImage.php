<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OfficerStampImage extends Model
{
    protected $primaryKey = 'stamp_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'officer_id', 'image_data', 'mime_type', 'width_px', 'height_px',
        'file_size_bytes', 'checksum_sha256', 'is_active', 'uploaded_by',
        'uploaded_at', 'replaced_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'uploaded_at' => 'datetime',
        'replaced_at' => 'datetime',
    ];

    protected $hidden = ['image_data']; // don't dump raw binary in default JSON output

    public function officer()
    {
        return $this->belongsTo(RegistrationOfficer::class, 'officer_id', 'officer_id');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(SystemUser::class, 'uploaded_by', 'user_id');
    }
}
