<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CitizenResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->citizen_id,
            'national_id_number' => $this->national_id_number,
            'full_name_kh' => $this->full_name_kh,
            'full_name_en' => $this->full_name_en,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'birth_place' => $this->whenLoaded('birthPlace', function () {
                // Village → Commune → District → Province: names live on each
                // level, so walk the chain (all eager-loaded to avoid N+1).
                $village = $this->birthPlace;
                $commune = $village?->commune;
                $district = $commune?->district;
                $province = $district?->province;

                return [
                    'village_id' => $village?->village_id,
                    'village_name' => $village?->village_name_en,
                    'commune_id' => $commune?->commune_id,
                    'commune_name' => $commune?->commune_name_en,
                    'district_id' => $district?->district_id,
                    'district_name' => $district?->district_name_en,
                    'province_id' => $province?->province_id,
                    'province_name' => $province?->province_name_en,
                ];
            }),
            'nationality' => $this->nationality,
            'occupation' => $this->occupation,
            'has_photo' => (bool) $this->photo_path,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
