<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CivilStatusHistory extends Model
{
    protected $primaryKey = 'history_id';

    const UPDATED_AT = null;

    protected $fillable = ['citizen_id', 'status_id', 'effective_date', 'recorded_by'];

    protected $casts = ['effective_date' => 'date'];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function status()
    {
        return $this->belongsTo(CivilStatusLookup::class, 'status_id', 'status_id');
    }

    public function recordedBy()
    {
        return $this->belongsTo(SystemUser::class, 'recorded_by', 'user_id');
    }
}
