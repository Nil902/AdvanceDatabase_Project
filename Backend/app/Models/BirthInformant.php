<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BirthInformant extends Model
{
    protected $primaryKey = 'informant_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'certificate_id', 'full_name', 'national_id_number',
        'relationship_to_child', 'address', 'phone_number', 'declaration_date',
    ];

    protected $casts = ['declaration_date' => 'date'];

    public function certificate()
    {
        return $this->belongsTo(BirthCertificate::class, 'certificate_id', 'certificate_id');
    }
}
