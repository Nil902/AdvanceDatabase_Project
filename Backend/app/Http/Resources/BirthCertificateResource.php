<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class BirthCertificateResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->certificate_id,
            'certificate_number' => $this->certificate_number,
            'status' => $this->status,
            'issue_date' => $this->issue_date?->toDateString(),
            'registered_date' => $this->registered_date?->toDateString(),
            'remarks' => $this->remarks,
            'has_photo' => (bool) $this->photo_path,
            'citizen' => new CitizenResource($this->whenLoaded('citizen')),
            // Canonical parent record, falling back to the legacy citizen link for
            // certificates not yet backfilled (Phase 4.2).
            'mother' => $this->parentPayload($this->motherParent, $this->mother),
            'father' => $this->parentPayload($this->fatherParent, $this->father),
            'officer' => new RegistrationOfficerResource($this->whenLoaded('officer')),
            'images' => $this->whenLoaded('images', function () {
                return $this->images->map(fn ($img) => [
                    'id' => $img->image_id,
                    'mime_type' => $img->mime_type,
                    'file_name' => $img->file_name,
                    'uploaded_at' => $img->uploaded_at?->toISOString(),
                ]);
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * Prefer the canonical parents row; fall back to the legacy citizen link.
     */
    private function parentPayload($parent, $legacyCitizen): ?array
    {
        $source = $parent ?: $legacyCitizen;

        if (! $source) {
            return null;
        }

        return [
            'parent_id' => $parent->parent_id ?? null,
            'citizen_id' => $source->citizen_id,
            'national_id_number' => $source->national_id_number,
            'full_name_kh' => $source->full_name_kh,
            'full_name_en' => $source->full_name_en,
            'gender' => $source->gender,
            'nationality' => $source->nationality ?? null,
            'date_of_birth' => $source->date_of_birth
                ? Carbon::parse($source->date_of_birth)->toDateString()
                : null,
            'is_registered' => ($source->citizen_id ?? null) !== null,
        ];
    }
}
