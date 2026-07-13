<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Household extends Model
{
    protected $primaryKey = 'household_id';

    // This table names its creation column "created_date", not "created_at"
    const CREATED_AT = 'created_date';

    const UPDATED_AT = 'updated_at';

    protected $fillable = [
        'household_number', 'book_serial', 'village_id', 'household_head_id',
        'house_no', 'krom_no', 'police_station', 'address_detail',
        'issued_at', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'issued_at' => 'date',
    ];

    public function village()
    {
        return $this->belongsTo(Village::class, 'village_id', 'village_id');
    }

    public function householdHead()
    {
        return $this->belongsTo(Citizen::class, 'household_head_id', 'citizen_id');
    }

    // Alias used by HouseholdResource ('head' => whenLoaded('headCitizen')).
    public function headCitizen()
    {
        return $this->belongsTo(Citizen::class, 'household_head_id', 'citizen_id');
    }

    public function members()
    {
        return $this->hasMany(HouseholdMember::class, 'household_id', 'household_id');
    }

    public function moveHistoryFrom()
    {
        return $this->hasMany(MoveHistory::class, 'from_household_id', 'household_id');
    }

    public function moveHistoryTo()
    {
        return $this->hasMany(MoveHistory::class, 'to_household_id', 'household_id');
    }
}
