<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Citizen extends Model
{
    protected $primaryKey = 'citizen_id';

    protected $fillable = [
        'national_id_number', 'full_name_kh', 'full_name_en', 'gender',
        'date_of_birth', 'date_of_death', 'birth_place_village_id', 'nationality', 'occupation',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'date_of_death' => 'date',
    ];

    public function birthPlaceVillage()
    {
        return $this->belongsTo(Village::class, 'birth_place_village_id', 'village_id');
    }

    public function birthCertificate()
    {
        return $this->hasOne(BirthCertificate::class, 'citizen_id', 'citizen_id');
    }

    public function birthCertificatesAsMother()
    {
        return $this->hasMany(BirthCertificate::class, 'mother_citizen_id', 'citizen_id');
    }

    public function birthCertificatesAsFather()
    {
        return $this->hasMany(BirthCertificate::class, 'father_citizen_id', 'citizen_id');
    }

    public function identityCards()
    {
        return $this->hasMany(IdentityCard::class, 'citizen_id', 'citizen_id');
    }

    public function addresses()
    {
        return $this->hasMany(CitizenAddress::class, 'citizen_id', 'citizen_id');
    }

    public function maritalStatuses()
    {
        return $this->hasMany(CitizenMaritalStatus::class, 'citizen_id', 'citizen_id');
    }

    public function biometrics()
    {
        return $this->hasMany(CitizenBiometric::class, 'citizen_id', 'citizen_id');
    }

    public function citizenParents()
    {
        return $this->hasMany(CitizenParent::class, 'citizen_id', 'citizen_id');
    }

    public function householdMemberships()
    {
        return $this->hasMany(HouseholdMember::class, 'citizen_id', 'citizen_id');
    }

    public function headedHouseholds()
    {
        return $this->hasMany(Household::class, 'household_head_id', 'citizen_id');
    }

    public function civilStatusHistory()
    {
        return $this->hasMany(CivilStatusHistory::class, 'citizen_id', 'citizen_id');
    }

    public function nationalityHistory()
    {
        return $this->hasMany(NationalityHistory::class, 'citizen_id', 'citizen_id');
    }
}
