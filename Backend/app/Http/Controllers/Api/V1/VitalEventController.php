<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\VitalEvent\MarriageRequest;
use App\Http\Requests\VitalEvent\DivorceRequest;
use App\Http\Requests\VitalEvent\BirthRequest;
use App\Http\Requests\VitalEvent\DeathRequest;
use App\Models\MarriageCertificate;
use App\Models\DivorceCertificate;
use App\Models\BirthCertificate;
use App\Models\Citizen;
use App\Models\CitizenMaritalStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VitalEventController extends Controller
{
    public function marriage(MarriageRequest $request)
    {
        $data = $request->validated();

        $cert = DB::transaction(function () use ($data, $request) {
            $cert = MarriageCertificate::create([
                'spouse_a_id' => $data['spouse_a_id'],
                'spouse_b_id' => $data['spouse_b_id'],
                'marriage_date' => $data['marriage_date'],
                'issued_by' => $request->user()->user_id,
                'certificate_number' => $data['certificate_number'] ?? $this->generateCertNumber('M'),
                'location' => $data['location'] ?? null,
                'status' => 'active',
            ]);

            $this->updateMaritalStatus($data['spouse_a_id'], 'married', $data['marriage_date'], $request->user()->user_id);
            $this->updateMaritalStatus($data['spouse_b_id'], 'married', $data['marriage_date'], $request->user()->user_id);

            return $cert;
        });

        return response()->json([
            'message' => 'Marriage recorded',
            'certificate' => $cert,
        ], 201);
    }

    public function divorce(DivorceRequest $request)
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $request) {
            $marriage = MarriageCertificate::where('certificate_id', $data['marriage_cert_id'])
                ->where('status', 'active')
                ->firstOrFail();

            $marriage->update(['status' => 'divorced']);

            DivorceCertificate::create([
                'marriage_cert_id' => $marriage->certificate_id,
                'ruling_date' => $data['ruling_date'],
                'court_reference' => $data['court_reference'] ?? null,
                'issued_by' => $request->user()->user_id,
            ]);

            $this->updateMaritalStatus($marriage->spouse_a_id, 'divorced', $data['ruling_date'], $request->user()->user_id);
            $this->updateMaritalStatus($marriage->spouse_b_id, 'divorced', $data['ruling_date'], $request->user()->user_id);
        });

        return response()->json(['message' => 'Divorce recorded'], 201);
    }

    public function birth(BirthRequest $request)
    {
        $data = $request->validated();

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

        return response()->json(['message' => 'Birth recorded', 'certificate' => $cert], 201);
    }

    public function death(DeathRequest $request)
    {
        $data = $request->validated();

        DB::transaction(function () use ($data) {
            $citizen = Citizen::findOrFail($data['citizen_id']);
            $citizen->update(['deceased_at' => now()]);
        });

        return response()->json(['message' => 'Death recorded'], 201);
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
