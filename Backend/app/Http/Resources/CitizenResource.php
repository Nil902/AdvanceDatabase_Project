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
                return [
                    'village_id' => $this->birthPlace->village_id,
                    'village_name' => $this->birthPlace->village_name_en,
                    'commune_id' => $this->birthPlace->commune_id,
                    'commune_name' => $this->birthPlace->commune_name_en,
                    'district_id' => $this->birthPlace->district_id,
                    'district_name' => $this->birthPlace->district_name_en,
                    'province_id' => $this->birthPlace->province_id,
                    'province_name' => $this->birthPlace->province_name_en,
                ];
            }),
            'nationality' => $this->nationality,
            'occupation' => $this->occupation,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
