<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Citizen\AssignNidRequest;
use App\Http\Requests\Citizen\FingerprintUploadRequest;
use App\Http\Requests\Citizen\PhotoUploadRequest;
use App\Http\Requests\Citizen\UpdateCitizenRequest;
use App\Http\Resources\CitizenResource;
use App\Models\Citizen;
use App\Models\CitizenBiometric;
use App\Models\Mongo\CitizenBiometricDocument;

class CitizenController extends Controller
{
    public function update(UpdateCitizenRequest $request, int $id)
    {
        $citizen = Citizen::findOrFail($id);
        $citizen->update($request->validated());

        return new CitizenResource($citizen);
    }

    public function uploadPhoto(PhotoUploadRequest $request, int $id)
    {
        $citizen = Citizen::findOrFail($id);

        $path = $request->file('photo')->store("citizens/{$id}/photos", 'public');

        return response()->json([
            'message' => 'Photo uploaded successfully',
            'path' => $path,
        ], 200);
    }

    public function uploadFingerprint(FingerprintUploadRequest $request, int $id)
    {
        $validated = $request->validated();
        $citizen = Citizen::findOrFail($id);

        $mongoDoc = CitizenBiometricDocument::create([
            'citizen_id' => $id,
            'template_data' => $validated['template_data'],
            'finger_positions' => $validated['finger_positions'],
            'captured_at' => now(),
        ]);

        CitizenBiometric::create([
            'citizen_id' => $id,
            'mongo_document_id' => (string) $mongoDoc->_id,
            'fingerprint_taken_date' => now(),
        ]);

        return response()->json(['message' => 'Fingerprint recorded'], 201);
    }

    public function assignNid(AssignNidRequest $request, int $id)
    {
        $citizen = Citizen::findOrFail($id);

        if ($citizen->national_id_number) {
            return response()->json(['message' => 'Citizen already has a NID'], 422);
        }

        $nid = $this->generateNationalIdNumber($citizen);
        $citizen->update(['national_id_number' => $nid]);

        return response()->json(['national_id_number' => $nid], 200);
    }

    private function generateNationalIdNumber(Citizen $citizen): string
    {
        return 'NID' . str_pad($citizen->citizen_id, 8, '0', STR_PAD_LEFT);
    }
}
