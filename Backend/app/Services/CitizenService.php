<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\CitizenBiometric;
use App\Models\Mongo\CitizenBiometricDocument;
use Illuminate\Support\Facades\Cache;

class CitizenService
{
    public function create(array $data): Citizen
    {
        $citizen = Citizen::create($data);
        Cache::tags(['citizens'])->flush();

        return $citizen;
    }

    public function findById(int $id): Citizen
    {
        // NOTE: do not cache the Eloquent model here. This cache store deserializes
        // cached models as __PHP_Incomplete_Class, which then violates the : Citizen
        // return type and 500s on a cache hit (same reason HouseholdService::getMembers
        // and the demographics report avoid caching Collections/models).
        return Citizen::findOrFail($id);
    }

    public function update(Citizen $citizen, array $data): Citizen
    {
        $citizen->update($data);
        Cache::tags(['citizens'])->forget("citizen:{$citizen->citizen_id}");

        return $citizen->fresh();
    }

    public function storeFingerprint(int $citizenId, array $validated): void
    {
        $mongoDoc = CitizenBiometricDocument::create([
            'citizen_id' => $citizenId,
            'fingerprint_templates' => $validated['template_data'],
            'fingers_captured_mask' => $validated['finger_positions'],
            'captured_at' => now(),
        ]);

        CitizenBiometric::create([
            'citizen_id' => $citizenId,
            'mongo_document_id' => (string) $mongoDoc->_id,
            'fingerprint_taken_date' => now(),
        ]);
    }

    public function assignNationalId(Citizen $citizen): string
    {
        $nid = 'NID'.str_pad($citizen->citizen_id, 8, '0', STR_PAD_LEFT);
        $citizen->update(['national_id_number' => $nid]);
        Cache::tags(['citizens'])->forget("citizen:{$citizen->citizen_id}");

        return $nid;
    }
}
