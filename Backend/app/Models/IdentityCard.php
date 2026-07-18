<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdentityCard extends Model
{
    protected $primaryKey = 'card_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'citizen_id', 'card_serial_number', 'card_type', 'status',
        'issue_date', 'expiry_date', 'marriage_cert_id', 'biometric_ref',
        'issued_by', 'replaces_card_id', 'photo_path',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'expiry_date' => 'date',
    ];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function marriageCertificate()
    {
        return $this->belongsTo(MarriageCertificate::class, 'marriage_cert_id', 'certificate_id');
    }

    public function issuedBy()
    {
        return $this->belongsTo(SystemUser::class, 'issued_by', 'user_id');
    }

    public function replacesCard()
    {
        return $this->belongsTo(IdentityCard::class, 'replaces_card_id', 'card_id');
    }

    public function images()
    {
        return $this->hasMany(IdentityCardImage::class, 'card_id', 'card_id');
    }

    public function statusLogs()
    {
        return $this->hasMany(CardStatusLog::class, 'card_id', 'card_id');
    }

    public function dispatch()
    {
        return $this->hasOne(DispatchTracking::class, 'card_id', 'card_id');
    }

    public function requests()
    {
        return $this->hasMany(CardRequest::class, 'result_card_id', 'card_id');
    }
}
