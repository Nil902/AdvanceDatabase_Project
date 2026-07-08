<?php

namespace App\Services;

use App\Models\BirthCertificate;
use App\Models\Citizen;
use App\Models\CitizenMaritalStatus;
use App\Models\DivorceCertificate;
use App\Models\MarriageCertificate;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VitalEventService
{
    public function recordMarriage(array $data, int $issuedBy): MarriageCertificate
    {
        $cert = DB::transaction(function () use ($data, $issuedBy) {
            $cert = MarriageCertificate::create([
                'spouse_a_id' => $data['spouse_a_id'],
                'spouse_b_id' => $data['spouse_b_id'],
                'marriage_date' => $data['marriage_date'],
                'issued_by' => $issuedBy,
                'certificate_number' => $data['certificate_number'] ?? $this->generateCertNumber('M'),
                'location' => $data['location'] ?? null,
                'status' => 'active',
            ]);

            $this->updateMaritalStatus($data['spouse_a_id'], 'married', $data['marriage_date'], $issuedBy);
            $this->updateMaritalStatus($data['spouse_b_id'], 'married', $data['marriage_date'], $issuedBy);

            return $cert;
        });

        Cache::tags(['vital_events'])->flush();

        return $cert;
    }

    public function recordDivorce(array $data, int $issuedBy): void
    {
        DB::transaction(function () use ($data, $issuedBy) {
            $marriage = MarriageCertificate::where('certificate_id', $data['marriage_cert_id'])
                ->where('status', 'active')
                ->firstOrFail();

            $marriage->update(['status' => 'divorced']);

            DivorceCertificate::create([
                'marriage_cert_id' => $marriage->certificate_id,
                'ruling_date' => $data['ruling_date'],
                'court_reference' => $data['court_reference'] ?? null,
                'issued_by' => $issuedBy,
            ]);

            $this->updateMaritalStatus($marriage->spouse_a_id, 'divorced', $data['ruling_date'], $issuedBy);
            $this->updateMaritalStatus($marriage->spouse_b_id, 'divorced', $data['ruling_date'], $issuedBy);
        });

        Cache::tags(['vital_events'])->flush();
    }

    public function recordBirth(array $data): BirthCertificate
    {
        $cert = BirthCertificate::create([
            'citizen_id' => $data['citizen_id'],
            'mother_citizen_id' => $data['mother_citizen_id'] ?? null,
            'father_citizen_id' => $data['father_citizen_id'] ?? null,
            'certificate_number' => $data['certificate_number'] ?? $this->generateCertNumber('B'),
            'issue_date' => $data['issue_date'] ?? now(),
            'issued_by_officer_id' => $data['issued_by_officer_id'] ?? null,
            'registered_date' => now(),
            'status' => 'issued',
            'remarks' => $data['remarks'] ?? null,
        ]);

        Cache::tags(['birth_certificates'])->flush();

        return $cert;
    }

    public function recordDeath(array $data): void
    {
        DB::transaction(function () use ($data) {
            $citizen = Citizen::findOrFail($data['citizen_id']);
            $citizen->update(['date_of_death' => $data['date_of_death'] ?? now()]);

            $deceasedStatus = \App\Models\CivilStatusLookup::where('label', 'deceased')->first();

            \App\Models\CivilStatusHistory::create([
                'citizen_id' => $citizen->citizen_id,
                'status_id' => $deceasedStatus?->status_id,
                'effective_date' => $data['date_of_death'] ?? now(),
                'recorded_by' => $data['recorded_by'] ?? null,
            ]);
        });

        Cache::tags(['citizens'])->forget("citizen:{$data['citizen_id']}");
    }

    private function updateMaritalStatus(int $citizenId, string $status, $effectiveDate, int $recordedBy): void
    {
        CitizenMaritalStatus::create([
            'citizen_id' => $citizenId,
            'status' => $status,
            'effective_date' => $effectiveDate,
            'recorded_by' => $recordedBy,
        ]);
    }

    private function generateCertNumber(string $prefix): string
    {
        return $prefix . date('Ymd') . strtoupper(Str::random(6));
    }
}
