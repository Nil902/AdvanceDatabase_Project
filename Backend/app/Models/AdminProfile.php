<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminProfile extends Model
{
    protected $primaryKey = 'profile_id';

    protected $fillable = [
        'user_id', 'access_level', 'province_id', 'can_manage_users',
        'can_view_reports', 'can_export_data', 'notes',
    ];

    protected $casts = [
        'can_manage_users' => 'boolean',
        'can_view_reports' => 'boolean',
        'can_export_data' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }

    public function province()
    {
        return $this->belongsTo(Province::class, 'province_id', 'province_id');
    }
}
