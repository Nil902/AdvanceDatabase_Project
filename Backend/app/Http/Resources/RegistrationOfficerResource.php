<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class RegistrationOfficerResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->officer_id,
            'officer_code' => $this->officer_code,
            'full_name_kh' => $this->full_name_kh,
            'full_name_en' => $this->full_name_en,
            'position' => $this->position,
            'phone_number' => $this->phone_number,
            'commune_id' => $this->commune_id,
            'is_active' => $this->is_active,
        ];
    }
}
