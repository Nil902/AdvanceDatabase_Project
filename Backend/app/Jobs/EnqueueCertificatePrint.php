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
        private string $certificateType
    ) {}

    public function handle(): void
    {
        PrintJob::create([
            'certificate_id' => $this->certificateId,
            'certificate_type' => $this->certificateType,
            'status' => 'queued',
            'queued_at' => now(),
        ]);

        CertificatePrintingLog::create([
            'certificate_id' => $this->certificateId,
            'certificate_type' => $this->certificateType,
            'action' => 'queued',
            'performed_at' => now(),
        ]);
    }
}
