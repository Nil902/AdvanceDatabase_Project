<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DivorceCertificate extends Model
{
    protected $primaryKey = 'divorce_id';
    const UPDATED_AT = null;

    protected $fillable = ['marriage_cert_id', 'ruling_date', 'court_reference', 'issued_by'];

    protected $casts = ['ruling_date' => 'date'];

    public function marriageCertificate()
    {
        return $this->belongsTo(MarriageCertificate::class, 'marriage_cert_id', 'certificate_id');
    }

    public function issuedBy()
    {
        return $this->belongsTo(SystemUser::class, 'issued_by', 'user_id');
    }

    public function settlement()
    {
        return $this->hasOne(DivorceSettlement::class, 'divorce_id', 'divorce_id');
    }
}
