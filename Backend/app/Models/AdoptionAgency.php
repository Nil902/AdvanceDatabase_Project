<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdoptionAgency extends Model
{
    protected $primaryKey = 'agency_id';
    public $timestamps = false;

    protected $fillable = ['agency_name', 'license_number', 'country', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function orders()
    {
        return $this->hasMany(AdoptionOrder::class, 'agency_id', 'agency_id');
    }

    public function fosterPlacements()
    {
        return $this->hasMany(FosterCarePlacement::class, 'agency_id', 'agency_id');
    }
}
