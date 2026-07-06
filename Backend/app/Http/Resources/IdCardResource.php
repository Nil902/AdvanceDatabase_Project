<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class IdCardResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->card_id,
            'card_serial_number'=> $this->card_serial_number,
            'card_type'         => $this->card_type,
            'status'            => $this->status,
            'issue_date'        => $this->issue_date?->toDateString(),
            'expiry_date'       => $this->expiry_date?->toDateString(),
            'citizen'           => new CitizenResource($this->whenLoaded('citizen')),
            'marriage_cert_id'  => $this->marriage_cert_id,
            'biometric_ref'     => $this->biometric_ref,
            'replaces_card_id'  => $this->replaces_card_id,
            'created_at'        => $this->created_at?->toISOString(),
        ];
    }
}