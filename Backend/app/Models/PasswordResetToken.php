<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordResetToken extends Model
{
    protected $table = 'system_password_reset_tokens';
    protected $primaryKey = 'id';
    const UPDATED_AT = null;

    protected $fillable = ['user_id', 'token_hash', 'expires_at', 'used_at'];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }
}
