<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CertificatePrintingLog extends Model
{
    protected $primaryKey = 'print_id';
    public $timestamps = false; // uses printed_at instead

    protected $fillable = ['staff_id', 'certificate_type', 'reference_id', 'mongo_log_id', 'printed_at'];

    protected $casts = ['printed_at' => 'datetime'];

    public function staff()
    {
        return $this->belongsTo(StaffAccount::class, 'staff_id', 'staff_id');
    }

    // Convenience accessor to pull the full print job document from Mongo
    public function mongoPrintJob()
    {
        return \App\Models\Mongo\PrintJob::where('pg_print_id', $this->print_id)->first();
    }
}
