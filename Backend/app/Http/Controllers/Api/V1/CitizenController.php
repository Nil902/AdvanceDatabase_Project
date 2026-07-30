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
use App\Services\PhotoStorageService;
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
            // Include the birth place so callers (e.g. the ID-card application
            // form) can show the applicant's particulars + address.
            ->with('birthPlace.commune.district.province')
            ->where(function ($query) use ($q) {
                $query->where('full_name_en', 'ILIKE', "%{$q}%")
                    ->orWhere('full_name_kh', 'LIKE', "%{$q}%")
                    ->orWhere('national_id_number', 'ILIKE', "%{$q}%");
            });

        // Phase 9: confine a scoped officer's lookups to their commune (no-op for
        // admins / unscoped accounts), via birth_place_village_id.
        //
        // No ORDER BY: a common substring (e.g. "sok") matches 100k+ rows, and
        // sorting that whole set before LIMIT turned a type-ahead into a ~2s
        // query on a 700k-row table. Dropping the sort lets the trigram bitmap
        // scan short-circuit at LIMIT (~10 ms). Callers are type-aheads that
        // don't need alphabetical order.
        $citizens = $jurisdiction->byVillageColumn($query, $request->user(), 'birth_place_village_id')
            ->limit(min((int) $request->get('limit', 10), 50))
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

    public function uploadPhoto(PhotoUploadRequest $request, PhotoStorageService $photos, int $id)
    {
        $citizen = $this->citizenService->findById($id);

        // Bytes → photos disk (R2/local), pointer → PG, metadata → Mongo. The
        // prior portrait (if any) is deleted first so we never orphan files.
        $ext = $request->file('photo')->extension() ?: 'jpg';
        $path = $photos->store(
            $request->file('photo'), "citizens/{$id}", "photo.{$ext}",
            ['reference_table' => $citizen->getTable(), 'reference_id' => $citizen->getKey(),
                'document_type' => 'citizen_portrait', 'uploaded_by_user_id' => $request->user()?->user_id],
            replacing: $citizen->photo_path,
        );
        $citizen->update(['photo_path' => $path]);

        return response()->json([
            'message' => 'Photo uploaded successfully',
            'path' => $path,
        ], 200);
    }

    // GET /citizens/{id}/photo — stream the stored portrait (auth-guarded; a face
    // photo is PII, so it is never exposed as a public URL).
    public function photo(PhotoStorageService $photos, int $id)
    {
        $citizen = $this->citizenService->findById($id);

        abort_if(! $photos->exists($citizen->photo_path), 404, 'No photo on file.');

        return $photos->response($citizen->photo_path);
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
