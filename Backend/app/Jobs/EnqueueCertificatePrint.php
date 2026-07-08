<?php

namespace App\Jobs;

use App\Models\CertificatePrintingLog;
use App\Models\Mongo\PrintJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class EnqueueCertificatePrint implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private int $certificateId,
        private string $certificateType,
        private ?int $staffId = null
    ) {}

    public function handle(): void
    {
        $mongoJob = PrintJob::create([
            'job_type' => $this->certificateType,
            'reference_table' => $this->certificateType . '_certificates',
            'reference_id' => $this->certificateId,
            'status' => 'queued',
            'priority' => 'normal',
            'max_attempts' => 3,
            'current_attempt' => 0,
            'attempts' => [],
        ]);

        CertificatePrintingLog::create([
            'staff_id' => $this->staffId,
            'certificate_type' => $this->certificateType,
            'reference_id' => $this->certificateId,
            'mongo_log_id' => (string) $mongoJob->_id,
            'printed_at' => now(),
        ]);
    }
}
