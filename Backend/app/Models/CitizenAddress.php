<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CitizenAddress extends Model
{
    protected $primaryKey = 'address_id';
    public $timestamps = false;

    protected $fillable = [
        'citizen_id', 'street', 'city', 'province', 'postal_code',
        'country', 'is_current', 'valid_from', 'valid_to',
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'valid_from' => 'datetime',
        'valid_to' => 'datetime',
    ];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }
}
