<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RelationshipType extends Model
{
    protected $primaryKey = 'rel_type_id';

    public $timestamps = false;

    protected $fillable = ['label'];

    public function citizenRelationships()
    {
        return $this->hasMany(CitizenRelationship::class, 'rel_type_id', 'rel_type_id');
    }
}
