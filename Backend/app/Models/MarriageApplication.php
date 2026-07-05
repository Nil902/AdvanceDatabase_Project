<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarriageApplication extends Model
{
    protected $primaryKey = 'application_id';
    public $timestamps = false; // uses submitted_at instead

    protected $fillable = ['applicant_a', 'applicant_b', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at', 'notes'];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function applicantA()
    {
        return $this->belongsTo(Citizen::class, 'applicant_a', 'citizen_id');
    }

    public function applicantB()
    {
        return $this->belongsTo(Citizen::class, 'applicant_b', 'citizen_id');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(SystemUser::class, 'reviewed_by', 'user_id');
    }
}
