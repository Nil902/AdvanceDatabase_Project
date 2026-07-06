<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BirthCertificateResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->certificate_id,
            'certificate_number'=> $this->certificate_number,
            'status'            => $this->status,
            'issue_date'        => $this->issue_date?->toDateString(),
            'registered_date'   => $this->registered_date?->toDateString(),
            'remarks'           => $this->remarks,
            'citizen'           => new CitizenResource($this->whenLoaded('citizen')),
            'mother'            => new CitizenResource($this->whenLoaded('mother')),
            'father'            => new CitizenResource($this->whenLoaded('father')),
            'officer'           => new RegistrationOfficerResource($this->whenLoaded('officer')),
            'images'            => $this->whenLoaded('images', function () {
                return $this->images->map(fn ($img) => [
                    'id'        => $img->image_id,
                    'mime_type' => $img->mime_type,
                    'file_name' => $img->file_name,
                    'uploaded_at' => $img->uploaded_at?->toISOString(),
                ]);
            }),
            'created_at'        => $this->created_at?->toISOString(),
            'updated_at'        => $this->updated_at?->toISOString(),
        ];
    }
}