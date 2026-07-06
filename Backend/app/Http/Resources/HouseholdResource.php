<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class HouseholdResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->household_id,
            'household_number'  => $this->household_number,
            'book_serial'       => $this->book_serial,
            'village_id'        => $this->village_id,
            'household_head_id' => $this->household_head_id,
            'head'              => new CitizenResource($this->whenLoaded('headCitizen')),
            'house_no'          => $this->house_no,
            'krom_no'           => $this->krom_no,
            'police_station'    => $this->police_station,
            'address_detail'    => $this->address_detail,
            'issued_at'         => $this->issued_at?->toDateString(),
            'is_active'         => $this->is_active,
            'members_count'     => $this->when(isset($this->members_count), $this->members_count),
            'created_date'      => $this->created_date?->toISOString(),
            'updated_at'        => $this->updated_at?->toISOString(),
        ];
    }
}