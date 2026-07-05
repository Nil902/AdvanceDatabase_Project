<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CitizenMaritalStatus extends Model
{
    protected $primaryKey = 'status_id';
    public $timestamps = false;

    protected $fillable = ['citizen_id', 'status', 'effective_date', 'recorded_by'];

    protected $casts = ['effective_date' => 'datetime'];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function recordedBy()
    {
        return $this->belongsTo(SystemUser::class, 'recorded_by', 'user_id');
    }
}
