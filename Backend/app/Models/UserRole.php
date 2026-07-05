<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserRole extends Model
{
    protected $primaryKey = 'role_id';
    const UPDATED_AT = null;

    protected $fillable = ['role_code', 'role_name_kh', 'role_name_en', 'description'];

    public function users()
    {
        return $this->hasMany(SystemUser::class, 'role_id', 'role_id');
    }
}
