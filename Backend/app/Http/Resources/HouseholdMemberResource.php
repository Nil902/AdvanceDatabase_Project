<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class HouseholdMemberResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->hhm_id,
            'household_id' => $this->household_id,
            'citizen' => new CitizenResource($this->whenLoaded('citizen')),
            'relation_to_head' => $this->relation_to_head,
            'joined_date' => $this->joined_date?->toDateString(),
            'left_date' => $this->left_date?->toDateString(),
            'is_current' => is_null($this->left_date),
        ];
    }
}
