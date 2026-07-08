<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarriageWitness extends Model
{
    protected $primaryKey = 'witness_id';

    public $timestamps = false;

    protected $fillable = ['certificate_id', 'witness_name', 'national_id', 'phone_number'];

    public function certificate()
    {
        return $this->belongsTo(MarriageCertificate::class, 'certificate_id', 'certificate_id');
    }
}
