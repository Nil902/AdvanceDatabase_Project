<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\CitizenResource;
use App\Http\Resources\CitizenRelationshipResource;

class FamilyResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->family_unit_id,
            'family_code'       => $this->family_code,
            'head_citizen'      => new CitizenResource($this->whenLoaded('headCitizen')),
            'members'           => $this->whenLoaded('members', function () {
                return CitizenRelationshipResource::collection($this->members);
            }),
            'created_at'        => $this->created_at?->toISOString(),
        ];
    }
}