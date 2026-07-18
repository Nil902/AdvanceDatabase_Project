<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BirthCertificate extends Model
{
    protected $primaryKey = 'certificate_id';

    protected $fillable = [
        'citizen_id', 'mother_citizen_id', 'father_citizen_id',
        'certificate_number', 'issue_date', 'issued_by_officer_id',
        'registered_date', 'status', 'remarks', 'photo_path',
    ];

    protected $casts = [
        'issue_date' => 'datetime',
        'registered_date' => 'datetime',
    ];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function mother()
    {
        return $this->belongsTo(Citizen::class, 'mother_citizen_id', 'citizen_id');
    }

    public function father()
    {
        return $this->belongsTo(Citizen::class, 'father_citizen_id', 'citizen_id');
    }

    public function officer()
    {
        return $this->belongsTo(RegistrationOfficer::class, 'issued_by_officer_id', 'officer_id');
    }

    public function images()
    {
        return $this->hasMany(BirthCertificateImage::class, 'certificate_id', 'certificate_id');
    }
}
