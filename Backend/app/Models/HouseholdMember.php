<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HouseholdMember extends Model
{
    protected $primaryKey = 'hhm_id';

    public $timestamps = false;

    protected $fillable = ['household_id', 'citizen_id', 'relation_to_head', 'joined_date', 'left_date'];

    protected $casts = [
        'joined_date' => 'date',
        'left_date' => 'date',
    ];

    public function household()
    {
        return $this->belongsTo(Household::class, 'household_id', 'household_id');
    }

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }
}
