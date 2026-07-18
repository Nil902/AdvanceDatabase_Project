<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BirthCertificate\StoreBirthCertificateRequest;
use App\Http\Requests\BirthCertificate\UpdateBirthCertificateRequest;
use App\Http\Resources\BirthCertificateResource;
use App\Jobs\EnqueueCertificatePrint;
use App\Models\BirthCertificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class BirthCertificateController extends Controller
{
    public function index(Request $request)
    {
        $certs = QueryBuilder::for(BirthCertificate::class)
            ->allowedFilters('status', AllowedFilter::exact('citizen_id'))
            ->allowedSorts('issue_date', 'registered_date')
            ->with(['citizen', 'officer'])
            ->paginate($request->get('per_page', 20));

        return BirthCertificateResource::collection($certs);
    }

    public function store(StoreBirthCertificateRequest $request)
    {
        $cert = DB::transaction(function () use ($request) {
            $cert = BirthCertificate::create($request->validated() + ['status' => 'issued']);

            return $cert;
        });

        Cache::tags(['birth_certificates'])->flush();

        return new BirthCertificateResource($cert->load(['citizen', 'mother', 'father']));
    }

    public function show(int $id)
    {
        $cert = Cache::tags(['birth_certificates'])->remember(
            "birth_cert:{$id}",
            now()->addMinutes(10),
            fn () => BirthCertificate::with(['citizen', 'mother', 'father', 'officer', 'images'])
                ->findOrFail($id)
        );

        return new BirthCertificateResource($cert);
    }

    public function update(UpdateBirthCertificateRequest $request, int $id)
    {
        $cert = BirthCertificate::findOrFail($id);
        $cert->update($request->validated());

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");

        return new BirthCertificateResource($cert->fresh(['citizen', 'mother', 'father']));
    }

    public function destroy(int $id)
    {
        $cert = BirthCertificate::findOrFail($id);
        $cert->update(['status' => 'cancelled']);

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");

        return response()->json(['message' => 'Certificate voided'], 200);
    }

    public function verify(int $id)
    {
        $cert = BirthCertificate::findOrFail($id);

        // Add actual verification logic (e.g., check officer stamp, signature)
        return response()->json(['verified' => true, 'certificate_id' => $cert->certificate_id]);
    }

    public function print(int $id)
    {
        $cert = BirthCertificate::findOrFail($id);
        // Dispatch print job (queue)
        EnqueueCertificatePrint::dispatch($cert->certificate_id, 'birth');

        return response()->json(['message' => 'Queued for printing'], 202);
    }

    // POST /birth-certificates/{id}/photo — attach/replace the certificate scan.
    // Stored on the persisted public disk; streamed back via photo() below.
    public function uploadPhoto(Request $request, int $id)
    {
        $request->validate(['photo' => 'required|image|max:4096']);

        $cert = BirthCertificate::findOrFail($id);

        if ($cert->photo_path) {
            Storage::disk('public')->delete($cert->photo_path);
        }

        $ext = $request->file('photo')->extension() ?: 'jpg';
        $cert->photo_path = $request->file('photo')->storeAs("birth-certificates/{$id}", "scan.{$ext}", 'public');
        $cert->save();

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");

        return new BirthCertificateResource($cert->fresh(['citizen', 'mother', 'father']));
    }

    // GET /birth-certificates/{id}/photo — stream the stored scan (auth-guarded).
    public function photo(int $id)
    {
        $cert = BirthCertificate::findOrFail($id);

        abort_if(! $cert->photo_path || ! Storage::disk('public')->exists($cert->photo_path), 404, 'No photo on file.');

        return Storage::disk('public')->response($cert->photo_path);
    }
}
