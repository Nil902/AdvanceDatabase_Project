<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DivorceSettlement extends Model
{
    protected $primaryKey = 'settlement_id';

    public $timestamps = false; // uses recorded_at instead

    protected $fillable = ['divorce_id', 'terms', 'child_custody', 'asset_division', 'recorded_at'];

    protected $casts = ['recorded_at' => 'datetime'];

    public function divorce()
    {
        return $this->belongsTo(DivorceCertificate::class, 'divorce_id', 'divorce_id');
    }
}
