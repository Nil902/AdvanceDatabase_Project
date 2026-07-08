<?php

namespace App\Models;

use App\Models\Mongo\CitizenBiometricDocument;
use Illuminate\Database\Eloquent\Model;

// Postgres metadata row only — the actual biometric payload lives in
// MongoDB (see App\Models\Mongo\CitizenBiometricDocument), linked via mongo_document_id.
class CitizenBiometric extends Model
{
    protected $primaryKey = 'biometric_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'citizen_id', 'mongo_document_id', 'fingerprint_taken_date',
        'taken_by_officer_id', 'quality_score', 'fingers_captured',
    ];

    protected $casts = ['fingerprint_taken_date' => 'datetime'];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function takenByOfficer()
    {
        return $this->belongsTo(RegistrationOfficer::class, 'taken_by_officer_id', 'officer_id');
    }

    // Convenience accessor to pull the full Mongo document on demand
    public function mongoDocument()
    {
        $class = CitizenBiometricDocument::class;

        // Prefer static find if available, otherwise try an instance method.
        if (method_exists($class, 'find')) {
            return $class::find($this->mongo_document_id);
        }

        $instance = app($class);
        if (method_exists($instance, 'find')) {
            return $instance->find($this->mongo_document_id);
        }

        // Fallback: unable to locate document by conventional methods
        return null;
    }
}
