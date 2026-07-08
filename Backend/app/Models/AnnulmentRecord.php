<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnnulmentRecord extends Model
{
    protected $primaryKey = 'annulment_id';

    const UPDATED_AT = null;

    protected $fillable = ['marriage_cert_id', 'reason', 'court_reference', 'annulled_date', 'issued_by'];

    protected $casts = ['annulled_date' => 'date'];

    public function marriageCertificate()
    {
        return $this->belongsTo(MarriageCertificate::class, 'marriage_cert_id', 'certificate_id');
    }

    public function issuedBy()
    {
        return $this->belongsTo(SystemUser::class, 'issued_by', 'user_id');
    }
}
