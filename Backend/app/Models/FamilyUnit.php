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

    // Family members are modelled as citizen_relationships anchored on the head
    // (citizen_id_a = head, citizen_id_b = the member). See FamilyService.
    public function members()
    {
        return $this->hasMany(CitizenRelationship::class, 'citizen_id_a', 'head_citizen_id');
    }
}
