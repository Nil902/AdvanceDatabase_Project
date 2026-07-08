<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuardianshipExpiryLog extends Model
{
    protected $primaryKey = 'expiry_id';

    public $timestamps = false;

    protected $fillable = ['guardianship_id', 'expiry_date', 'notified_at', 'action_taken'];

    protected $casts = [
        'expiry_date' => 'date',
        'notified_at' => 'datetime',
    ];

    public function guardianship()
    {
        return $this->belongsTo(LegalGuardianship::class, 'guardianship_id', 'guardianship_id');
    }
}
