<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarriageAssetDeclaration extends Model
{
    protected $primaryKey = 'asset_id';

    public $timestamps = false; // uses declared_at instead

    protected $fillable = ['certificate_id', 'details', 'declared_at'];

    protected $casts = ['declared_at' => 'datetime'];

    public function certificate()
    {
        return $this->belongsTo(MarriageCertificate::class, 'certificate_id', 'certificate_id');
    }
}
