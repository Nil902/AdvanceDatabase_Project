<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LegalGuardianship extends Model
{
    protected $primaryKey = 'guardianship_id';
    const UPDATED_AT = null;

    protected $fillable = ['minor_id', 'guardian_id', 'start_date', 'end_date', 'court_order_ref', 'status', 'granted_by'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function minor()
    {
        return $this->belongsTo(Citizen::class, 'minor_id', 'citizen_id');
    }

    public function guardian()
    {
        return $this->belongsTo(Citizen::class, 'guardian_id', 'citizen_id');
    }

    public function grantedBy()
    {
        return $this->belongsTo(SystemUser::class, 'granted_by', 'user_id');
    }

    public function expiryLogs()
    {
        return $this->hasMany(GuardianshipExpiryLog::class, 'guardianship_id', 'guardianship_id');
    }
}
