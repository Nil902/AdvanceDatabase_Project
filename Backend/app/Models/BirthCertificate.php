<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BirthCertificate extends Model
{
    protected $primaryKey = 'certificate_id';

    protected $fillable = [
        'citizen_id', 'mother_citizen_id', 'father_citizen_id',
        'mother_parent_id', 'father_parent_id',
        'certificate_number', 'issue_date', 'issued_by_officer_id',
        'registered_date', 'status', 'remarks', 'photo_path',
        // Phase 4.3 detail fields
        'time_of_birth', 'birth_place_type', 'birth_facility_name',
        'attendant_type', 'attendant_name', 'attendant_license_no',
        'birth_weight_grams', 'gestational_age_weeks', 'multiple_birth_type',
        'birth_order', 'is_live_birth', 'parents_marital_status',
        'marriage_cert_reference', 'registration_type', 'registration_justification',
        'registry_book_volume', 'registry_book_page', 'registry_book_entry',
    ];

    protected $casts = [
        'issue_date' => 'datetime',
        'registered_date' => 'datetime',
        'is_live_birth' => 'boolean',
        'birth_weight_grams' => 'integer',
        'gestational_age_weeks' => 'integer',
        'birth_order' => 'integer',
    ];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    // Legacy direct-to-citizen parent links. Retained during the Phase 4.2
    // transition; superseded by motherParent()/fatherParent() (→ parents table).
    public function mother()
    {
        return $this->belongsTo(Citizen::class, 'mother_citizen_id', 'citizen_id');
    }

    public function father()
    {
        return $this->belongsTo(Citizen::class, 'father_citizen_id', 'citizen_id');
    }

    // Canonical parent links (Phase 4.2) — a parents row, which may itself
    // reference a registered citizen via parents.citizen_id.
    public function motherParent()
    {
        return $this->belongsTo(ParentRecord::class, 'mother_parent_id', 'parent_id');
    }

    public function fatherParent()
    {
        return $this->belongsTo(ParentRecord::class, 'father_parent_id', 'parent_id');
    }

    public function officer()
    {
        return $this->belongsTo(RegistrationOfficer::class, 'issued_by_officer_id', 'officer_id');
    }

    public function images()
    {
        return $this->hasMany(BirthCertificateImage::class, 'certificate_id', 'certificate_id');
    }

    // The declarant who legally reported the birth (Phase 4.4).
    public function informant()
    {
        return $this->hasOne(BirthInformant::class, 'certificate_id', 'certificate_id');
    }
}
