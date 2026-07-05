<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilyUnit extends Model
{
    protected $primaryKey = 'family_unit_id';
    const UPDATED_AT = null;

    protected $fillable = ['family_code', 'head_citizen_id'];

    public function headCitizen()
    {
        return $this->belongsTo(Citizen::class, 'head_citizen_id', 'citizen_id');
    }
}
