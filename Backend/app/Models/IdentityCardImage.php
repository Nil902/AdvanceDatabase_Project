<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdentityCardImage extends Model
{
    protected $primaryKey = 'image_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'card_id', 'image_type', 'image_data', 'mime_type', 'file_name',
        'file_size_bytes', 'width_px', 'height_px', 'checksum_sha256',
        'uploaded_by', 'uploaded_at',
    ];

    protected $casts = ['uploaded_at' => 'datetime'];
    protected $hidden = ['image_data'];

    public function card()
    {
        return $this->belongsTo(IdentityCard::class, 'card_id', 'card_id');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(SystemUser::class, 'uploaded_by', 'user_id');
    }
}
