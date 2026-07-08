<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Commune extends Model
{
    protected $primaryKey = 'commune_id';

    const UPDATED_AT = null;

    protected $fillable = ['commune_code', 'commune_name_kh', 'commune_name_en', 'district_id'];

    public function district()
    {
        return $this->belongsTo(District::class, 'district_id', 'district_id');
    }

    public function villages()
    {
        return $this->hasMany(Village::class, 'commune_id', 'commune_id');
    }

    public function registrationOfficers()
    {
        return $this->hasMany(RegistrationOfficer::class, 'commune_id', 'commune_id');
    }

    public function systemUsers()
    {
        return $this->hasMany(SystemUser::class, 'commune_id', 'commune_id');
    }
}
