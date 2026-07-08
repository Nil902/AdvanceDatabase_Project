<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CardStatusLog extends Model
{
    protected $primaryKey = 'log_id';

    public $timestamps = false; // uses changed_at instead

    protected $fillable = ['card_id', 'previous_status', 'new_status', 'reason', 'changed_by', 'changed_at'];

    protected $casts = ['changed_at' => 'datetime'];

    public function card()
    {
        return $this->belongsTo(IdentityCard::class, 'card_id', 'card_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(SystemUser::class, 'changed_by', 'user_id');
    }
}
