<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Citizen\AssignNidRequest;
use App\Http\Requests\Citizen\FingerprintUploadRequest;
use App\Http\Requests\Citizen\PhotoUploadRequest;
use App\Http\Requests\Citizen\UpdateCitizenRequest;
use App\Http\Resources\CitizenResource;
use App\Models\Citizen;
use App\Services\CitizenService;
use Illuminate\Http\Request;

class CitizenController extends Controller
{
    public function __construct(
        private CitizenService $citizenService
    ) {}

    // GET /citizens/search?q= — type-ahead lookup by name (KH/EN) or national id.
    public function search(Request $request)
    {
        $q = trim((string) $request->get('q', ''));

        if ($q === '') {
            return CitizenResource::collection([]);
        }

        $citizens = Citizen::query()
            ->where(function ($query) use ($q) {
                $query->where('full_name_en', 'ILIKE', "%{$q}%")
                    ->orWhere('full_name_kh', 'LIKE', "%{$q}%")
                    ->orWhere('national_id_number', 'ILIKE', "%{$q}%");
            })
            ->orderBy('full_name_en')
            ->limit((int) $request->get('limit', 10))
            ->get();

        return CitizenResource::collection($citizens);
    }

    public function update(UpdateCitizenRequest $request, int $id)
    {
        $citizen = $this->citizenService->findById($id);
        $citizen = $this->citizenService->update($citizen, $request->validated());

        return new CitizenResource($citizen);
    }

    public function uploadPhoto(PhotoUploadRequest $request, int $id)
    {
        $this->citizenService->findById($id);

        $path = $request->file('photo')->store("citizens/{$id}/photos", 'public');

        return response()->json([
            'message' => 'Photo uploaded successfully',
            'path' => $path,
        ], 200);
    }

    public function uploadFingerprint(FingerprintUploadRequest $request, int $id)
    {
        $this->citizenService->findById($id);
        $this->citizenService->storeFingerprint($id, $request->validated());

        return response()->json(['message' => 'Fingerprint recorded'], 201);
    }

    public function assignNid(AssignNidRequest $request, int $id)
    {
        $citizen = $this->citizenService->findById($id);

        if ($citizen->national_id_number) {
            return response()->json(['message' => 'Citizen already has a NID'], 422);
        }

        $nid = $this->citizenService->assignNationalId($citizen);

        return response()->json(['national_id_number' => $nid], 200);
    }
}
