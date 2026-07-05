<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RelationshipVerificationRequest extends Model
{
    protected $primaryKey = 'request_id';
    const UPDATED_AT = null;

    protected $fillable = ['requester_name', 'requester_user_id', 'target_citizen_id', 'purpose', 'status'];

    public function requesterUser()
    {
        return $this->belongsTo(SystemUser::class, 'requester_user_id', 'user_id');
    }

    public function targetCitizen()
    {
        return $this->belongsTo(Citizen::class, 'target_citizen_id', 'citizen_id');
    }
}
