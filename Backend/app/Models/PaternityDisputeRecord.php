<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaternityDisputeRecord extends Model
{
    protected $primaryKey = 'dispute_id';
    const UPDATED_AT = null;

    protected $fillable = ['child_id', 'claimant_id', 'dna_result', 'dna_test_date', 'court_reference', 'resolved_at'];

    protected $casts = [
        'dna_test_date' => 'date',
        'resolved_at' => 'datetime',
    ];

    public function child()
    {
        return $this->belongsTo(Citizen::class, 'child_id', 'citizen_id');
    }

    public function claimant()
    {
        return $this->belongsTo(Citizen::class, 'claimant_id', 'citizen_id');
    }
}
