<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Village extends Model
{
    protected $primaryKey = 'village_id';

    const UPDATED_AT = null;

    protected $fillable = ['village_code', 'village_name_kh', 'village_name_en', 'commune_id'];

    public function commune()
    {
        return $this->belongsTo(Commune::class, 'commune_id', 'commune_id');
    }

    public function households()
    {
        return $this->hasMany(Household::class, 'village_id', 'village_id');
    }

    public function citizens()
    {
        return $this->hasMany(Citizen::class, 'birth_place_village_id', 'village_id');
    }
}
