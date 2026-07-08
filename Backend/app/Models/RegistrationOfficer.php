<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationOfficer extends Model
{
    protected $primaryKey = 'officer_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'officer_code', 'full_name_kh', 'full_name_en', 'position',
        'phone_number', 'active_stamp_id', 'commune_id', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function commune()
    {
        return $this->belongsTo(Commune::class, 'commune_id', 'commune_id');
    }

    public function activeStamp()
    {
        return $this->belongsTo(OfficerStampImage::class, 'active_stamp_id', 'stamp_id');
    }

    public function stampImages()
    {
        return $this->hasMany(OfficerStampImage::class, 'officer_id', 'officer_id');
    }

    public function issuedBirthCertificates()
    {
        return $this->hasMany(BirthCertificate::class, 'issued_by_officer_id', 'officer_id');
    }
}
