<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdoptionOrder extends Model
{
    protected $primaryKey = 'order_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'child_id', 'adoptive_parent_a', 'adoptive_parent_b', 'agency_id',
        'order_date', 'court_reference', 'effective_date', 'issued_by',
    ];

    protected $casts = [
        'order_date' => 'date',
        'effective_date' => 'date',
    ];

    public function child()
    {
        return $this->belongsTo(Citizen::class, 'child_id', 'citizen_id');
    }

    public function adoptiveParentA()
    {
        return $this->belongsTo(Citizen::class, 'adoptive_parent_a', 'citizen_id');
    }

    public function adoptiveParentB()
    {
        return $this->belongsTo(Citizen::class, 'adoptive_parent_b', 'citizen_id');
    }

    public function agency()
    {
        return $this->belongsTo(AdoptionAgency::class, 'agency_id', 'agency_id');
    }

    public function issuedBy()
    {
        return $this->belongsTo(SystemUser::class, 'issued_by', 'user_id');
    }
}
