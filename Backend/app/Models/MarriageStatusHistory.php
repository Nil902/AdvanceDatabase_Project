<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarriageStatusHistory extends Model
{
    protected $primaryKey = 'status_history_id';
    public $timestamps = false; // uses changed_at instead

    protected $fillable = ['marriage_cert_id', 'status', 'changed_at', 'changed_by', 'reason'];

    protected $casts = ['changed_at' => 'datetime'];

    public function certificate()
    {
        return $this->belongsTo(MarriageCertificate::class, 'marriage_cert_id', 'certificate_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(SystemUser::class, 'changed_by', 'user_id');
    }
}
