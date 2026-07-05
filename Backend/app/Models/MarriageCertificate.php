<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarriageCertificate extends Model
{
    protected $primaryKey = 'certificate_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'spouse_a_id', 'spouse_b_id', 'marriage_date', 'issued_by',
        'certificate_number', 'location', 'status',
    ];

    protected $casts = ['marriage_date' => 'date'];

    public function spouseA()
    {
        return $this->belongsTo(Citizen::class, 'spouse_a_id', 'citizen_id');
    }

    public function spouseB()
    {
        return $this->belongsTo(Citizen::class, 'spouse_b_id', 'citizen_id');
    }

    public function issuedBy()
    {
        return $this->belongsTo(SystemUser::class, 'issued_by', 'user_id');
    }

    public function witnesses()
    {
        return $this->hasMany(MarriageWitness::class, 'certificate_id', 'certificate_id');
    }

    public function assetDeclarations()
    {
        return $this->hasMany(MarriageAssetDeclaration::class, 'certificate_id', 'certificate_id');
    }

    public function statusHistory()
    {
        return $this->hasMany(MarriageStatusHistory::class, 'marriage_cert_id', 'certificate_id');
    }

    public function images()
    {
        return $this->hasMany(MarriageCertificateImage::class, 'certificate_id', 'certificate_id');
    }

    public function divorce()
    {
        return $this->hasOne(DivorceCertificate::class, 'marriage_cert_id', 'certificate_id');
    }

    public function annulment()
    {
        return $this->hasOne(AnnulmentRecord::class, 'marriage_cert_id', 'certificate_id');
    }

    public function identityCards()
    {
        return $this->hasMany(IdentityCard::class, 'marriage_cert_id', 'certificate_id');
    }
}
