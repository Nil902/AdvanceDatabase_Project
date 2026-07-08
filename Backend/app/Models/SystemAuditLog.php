<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Legacy table — superseded by UserActionLog.
class SystemAuditLog extends Model
{
    protected $table = 'system_audit_logs';

    protected $primaryKey = 'log_id';

    public $timestamps = false;

    protected $fillable = ['staff_id', 'action_type', 'performed_at'];

    protected $casts = ['performed_at' => 'datetime'];

    public function staff()
    {
        return $this->belongsTo(StaffAccount::class, 'staff_id', 'staff_id');
    }
}
