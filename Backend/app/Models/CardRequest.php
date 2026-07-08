<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CardRequest extends Model
{
    protected $primaryKey = 'request_id';

    public $timestamps = false; // uses request_date instead

    protected $fillable = [
        'citizen_id', 'request_type', 'request_status', 'request_date',
        'processed_by', 'processed_at', 'result_card_id', 'notes',
    ];

    protected $casts = [
        'request_date' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function processedBy()
    {
        return $this->belongsTo(SystemUser::class, 'processed_by', 'user_id');
    }

    public function resultCard()
    {
        return $this->belongsTo(IdentityCard::class, 'result_card_id', 'card_id');
    }
}
