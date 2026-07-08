<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Legacy table — migrate to SystemUser where possible.
class StaffAccount extends Model
{
    protected $primaryKey = 'staff_id';

    public $timestamps = false;

    protected $fillable = ['full_name', 'role'];

    public function auditLogs()
    {
        return $this->hasMany(SystemAuditLog::class, 'staff_id', 'staff_id');
    }

    public function printingLogs()
    {
        return $this->hasMany(CertificatePrintingLog::class, 'staff_id', 'staff_id');
    }
}
