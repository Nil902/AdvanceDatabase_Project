<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FosterCarePlacement extends Model
{
    protected $primaryKey = 'placement_id';
    const UPDATED_AT = null;

    protected $fillable = ['child_id', 'foster_parent_id', 'agency_id', 'start_date', 'end_date', 'status'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function child()
    {
        return $this->belongsTo(Citizen::class, 'child_id', 'citizen_id');
    }

    public function fosterParent()
    {
        return $this->belongsTo(Citizen::class, 'foster_parent_id', 'citizen_id');
    }

    public function agency()
    {
        return $this->belongsTo(AdoptionAgency::class, 'agency_id', 'agency_id');
    }
}
