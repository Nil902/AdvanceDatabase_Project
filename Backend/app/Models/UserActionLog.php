<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserActionLog extends Model
{
    protected $primaryKey = 'log_id';
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'session_token', 'action', 'target_table', 'target_id',
        'old_value', 'new_value', 'ip_address', 'user_agent', 'performed_at',
    ];

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
        'performed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }
}
