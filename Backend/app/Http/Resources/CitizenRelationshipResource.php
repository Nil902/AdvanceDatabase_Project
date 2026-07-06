<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CitizenRelationshipResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->rel_id,
            'citizen_a'         => new CitizenResource($this->whenLoaded('citizenA')),
            'citizen_b'         => new CitizenResource($this->whenLoaded('citizenB')),
            'relationship_type' => $this->whenLoaded('relationshipType', function () {
                return [
                    'id'    => $this->relationshipType->rel_type_id,
                    'label' => $this->relationshipType->label,
                ];
            }),
            'verified'          => $this->verified,
            'created_at'        => $this->created_at?->toISOString(),
        ];
    }
}