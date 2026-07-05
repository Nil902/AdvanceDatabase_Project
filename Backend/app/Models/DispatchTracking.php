<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DispatchTracking extends Model
{
    protected $table = 'dispatch_tracking';
    protected $primaryKey = 'tracking_id';
    public $timestamps = false; // uses triggered_at instead

    protected $fillable = [
        'card_id', 'triggered_by', 'triggered_at', 'print_facility',
        'tracking_number', 'distribution_point', 'dispatch_status',
        'dispatched_at', 'delivered_at',
    ];

    protected $casts = [
        'triggered_at' => 'datetime',
        'dispatched_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function card()
    {
        return $this->belongsTo(IdentityCard::class, 'card_id', 'card_id');
    }

    public function triggeredBy()
    {
        return $this->belongsTo(SystemUser::class, 'triggered_by', 'user_id');
    }
}
