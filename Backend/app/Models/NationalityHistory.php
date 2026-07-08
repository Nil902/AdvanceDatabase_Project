<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NationalityHistory extends Model
{
    protected $primaryKey = 'nat_history_id';

    const UPDATED_AT = null;

    protected $fillable = ['citizen_id', 'nationality_id', 'change_date', 'reason', 'recorded_by'];

    protected $casts = ['change_date' => 'date'];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function nationality()
    {
        return $this->belongsTo(NationalityStatus::class, 'nationality_id', 'nationality_id');
    }

    public function recordedBy()
    {
        return $this->belongsTo(SystemUser::class, 'recorded_by', 'user_id');
    }
}
