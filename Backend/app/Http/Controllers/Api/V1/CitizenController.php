<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Citizen\AssignNidRequest;
use App\Http\Requests\Citizen\FingerprintUploadRequest;
use App\Http\Requests\Citizen\PhotoUploadRequest;
use App\Http\Requests\Citizen\StoreCitizenRequest;
use App\Http\Requests\Citizen\UpdateCitizenRequest;
use App\Http\Resources\CitizenResource;
use App\Jobs\LogReadEvent;
use App\Models\Citizen;
use App\Services\CitizenService;
use App\Services\JurisdictionScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CitizenController extends Controller
{
    public function __construct(
        private CitizenService $citizenService
    ) {}

    // GET /citizens/search?q= — type-ahead lookup by name (KH/EN) or national id.
    public function search(Request $request, JurisdictionScope $jurisdiction)
    {
        $q = trim((string) $request->get('q', ''));

        if ($q === '') {
            return CitizenResource::collection([]);
        }

        $query = Citizen::query()
            ->where(function ($query) use ($q) {
                $query->where('full_name_en', 'ILIKE', "%{$q}%")
                    ->orWhere('full_name_kh', 'LIKE', "%{$q}%")
                    ->orWhere('national_id_number', 'ILIKE', "%{$q}%");
            });

        // Phase 9: confine a scoped officer's lookups to their commune (no-op for
        // admins / unscoped accounts), via birth_place_village_id.
        $citizens = $jurisdiction->byVillageColumn($query, $request->user(), 'birth_place_village_id')
            ->orderBy('full_name_en')
            ->limit((int) $request->get('limit', 10))
            ->get();

        // Audit the lookup (unauthorized citizen search is a common real abuse).
        LogReadEvent::record($request, 'citizen', 'citizens', null, ['query' => $q]);

        return CitizenResource::collection($citizens);
    }

    // POST /citizens — register a new person (e.g. a newborn during birth
    // registration). Returns the created citizen so the caller can link it.
    public function store(StoreCitizenRequest $request)
    {
        $citizen = $this->citizenService->create($request->validated());

        return (new CitizenResource($citizen))->response()->setStatusCode(201);
    }

    public function update(UpdateCitizenRequest $request, int $id)
    {
        $citizen = $this->citizenService->findById($id);
        $citizen = $this->citizenService->update($citizen, $request->validated());

        return new CitizenResource($citizen);
    }

    public function uploadPhoto(PhotoUploadRequest $request, int $id)
    {
        $citizen = $this->citizenService->findById($id);

        // Replace any prior portrait so we don't orphan files on the disk.
        if ($citizen->photo_path) {
            Storage::disk('public')->delete($citizen->photo_path);
        }

        $path = $request->file('photo')->store("citizens/{$id}/photos", 'public');
        $citizen->update(['photo_path' => $path]);

        return response()->json([
            'message' => 'Photo uploaded successfully',
            'path' => $path,
        ], 200);
    }

    // GET /citizens/{id}/photo — stream the stored portrait (auth-guarded; a face
    // photo is PII, so it is never exposed as a public URL).
    public function photo(int $id)
    {
        $citizen = $this->citizenService->findById($id);

        abort_if(! $citizen->photo_path || ! Storage::disk('public')->exists($citizen->photo_path), 404, 'No photo on file.');

        return Storage::disk('public')->response($citizen->photo_path);
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
