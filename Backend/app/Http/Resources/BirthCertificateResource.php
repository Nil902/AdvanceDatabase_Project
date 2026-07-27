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
            // Phase 4.3 certificate detail
            'time_of_birth' => $this->time_of_birth,
            'birth_place_type' => $this->birth_place_type,
            'birth_facility_name' => $this->birth_facility_name,
            'attendant_type' => $this->attendant_type,
            'attendant_name' => $this->attendant_name,
            'attendant_license_no' => $this->attendant_license_no,
            'birth_weight_grams' => $this->birth_weight_grams,
            'gestational_age_weeks' => $this->gestational_age_weeks,
            'multiple_birth_type' => $this->multiple_birth_type,
            'birth_order' => $this->birth_order,
            'is_live_birth' => $this->is_live_birth,
            'parents_marital_status' => $this->parents_marital_status,
            'marriage_cert_reference' => $this->marriage_cert_reference,
            'registration_type' => $this->registration_type,
            'registration_justification' => $this->registration_justification,
            'registry_book' => [
                'volume' => $this->registry_book_volume,
                'page' => $this->registry_book_page,
                'entry' => $this->registry_book_entry,
            ],
            'citizen' => new CitizenResource($this->whenLoaded('citizen')),
            // Canonical parent record, falling back to the legacy citizen link for
            // certificates not yet backfilled (Phase 4.2).
            'mother' => $this->parentPayload($this->motherParent, $this->mother),
            'father' => $this->parentPayload($this->fatherParent, $this->father),
            'officer' => new RegistrationOfficerResource($this->whenLoaded('officer')),
            // The issuing officer's seal (Phase 4.5) — presence + id for the print.
            'officer_stamp' => $this->whenLoaded('officer', function () {
                $stamp = $this->officer?->activeStamp;

                return $stamp ? ['stamp_id' => $stamp->stamp_id, 'mime_type' => $stamp->mime_type] : null;
            }),
            // The declarant who reported the birth (Phase 4.4).
            'informant' => $this->whenLoaded('informant', fn () => $this->informant ? [
                'full_name' => $this->informant->full_name,
                'national_id_number' => $this->informant->national_id_number,
                'relationship_to_child' => $this->informant->relationship_to_child,
                'address' => $this->informant->address,
                'phone_number' => $this->informant->phone_number,
                'declaration_date' => optional($this->informant->declaration_date)->toDateString(),
            ] : null),
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
