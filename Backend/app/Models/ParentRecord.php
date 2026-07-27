<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Maps to the "parents" table. Named ParentRecord (not Parent) to avoid
// any confusion with PHP's `parent::` keyword.
class ParentRecord extends Model
{
    protected $table = 'parents';

    protected $primaryKey = 'parent_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'citizen_id', 'national_id_number', 'full_name_kh', 'full_name_en', 'gender',
        'nationality', 'date_of_birth', 'birth_place_village_id', 'phone_number', 'occupation',
    ];

    protected $casts = ['date_of_birth' => 'date'];

    public function birthPlaceVillage()
    {
        return $this->belongsTo(Village::class, 'birth_place_village_id', 'village_id');
    }

    // A parent record may reference a registered citizen (else null — foreign,
    // deceased, or otherwise unregistered parents hold their own details here).
    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function citizenLinks()
    {
        return $this->hasMany(CitizenParent::class, 'parent_id', 'parent_id');
    }
}
