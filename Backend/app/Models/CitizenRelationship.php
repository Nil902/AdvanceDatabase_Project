<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CitizenRelationship extends Model
{
    protected $primaryKey = 'rel_id';

    const UPDATED_AT = null;

    protected $fillable = ['citizen_id_a', 'citizen_id_b', 'rel_type_id', 'verified'];

    protected $casts = ['verified' => 'boolean'];

    public function citizenA()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id_a', 'citizen_id');
    }

    public function citizenB()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id_b', 'citizen_id');
    }

    public function relationshipType()
    {
        return $this->belongsTo(RelationshipType::class, 'rel_type_id', 'rel_type_id');
    }
}
