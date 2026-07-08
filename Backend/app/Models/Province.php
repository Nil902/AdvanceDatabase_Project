<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Province extends Model
{
    protected $primaryKey = 'province_id';

    const UPDATED_AT = null;

    protected $fillable = ['province_code', 'province_name_kh', 'province_name_en'];

    public function districts()
    {
        return $this->hasMany(District::class, 'province_id', 'province_id');
    }

    public function adminProfiles()
    {
        return $this->hasMany(AdminProfile::class, 'province_id', 'province_id');
    }
}
