<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class District extends Model
{
    protected $primaryKey = 'district_id';
    const UPDATED_AT = null;

    protected $fillable = ['district_code', 'district_name_kh', 'district_name_en', 'province_id'];

    public function province()
    {
        return $this->belongsTo(Province::class, 'province_id', 'province_id');
    }

    public function communes()
    {
        return $this->hasMany(Commune::class, 'district_id', 'district_id');
    }
}
