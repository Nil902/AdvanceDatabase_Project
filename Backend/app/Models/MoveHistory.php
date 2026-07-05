<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MoveHistory extends Model
{
    protected $table = 'move_history';
    protected $primaryKey = 'id';
    public $timestamps = false; // uses recorded_at instead

    protected $fillable = [
        'resident_id', 'from_household_id', 'to_household_id',
        'move_date', 'reason', 'authorized_by', 'recorded_by_user', 'recorded_at',
    ];

    protected $casts = [
        'move_date' => 'date',
        'recorded_at' => 'datetime',
    ];

    public function resident()
    {
        return $this->belongsTo(Citizen::class, 'resident_id', 'citizen_id');
    }

    public function fromHousehold()
    {
        return $this->belongsTo(Household::class, 'from_household_id', 'household_id');
    }

    public function toHousehold()
    {
        return $this->belongsTo(Household::class, 'to_household_id', 'household_id');
    }

    public function recordedBy()
    {
        return $this->belongsTo(SystemUser::class, 'recorded_by_user', 'user_id');
    }
}
