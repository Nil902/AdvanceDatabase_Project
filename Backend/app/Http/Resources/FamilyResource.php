<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class FamilyResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->family_unit_id,
            'family_code' => $this->family_code,
            'head_citizen' => new CitizenResource($this->whenLoaded('headCitizen')),
            // Flattened to the shape the frontend family-management page consumes:
            // each member = { id, citizen, relationship-label }.
            'members' => $this->whenLoaded('members', function () {
                return $this->members->map(fn ($rel) => [
                    'id' => $rel->rel_id,
                    'citizen' => $rel->relationLoaded('citizenB') && $rel->citizenB
                        ? new CitizenResource($rel->citizenB)
                        : null,
                    'relationship' => $rel->relationLoaded('relationshipType')
                        ? $rel->relationshipType?->label
                        : null,
                ]);
            }),
            'member_count' => $this->when(isset($this->members_count), fn () => $this->members_count),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
