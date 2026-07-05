<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SystemUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->user_id,
            'username' => $this->username,
            'email' => $this->email,
            'full_name_kh' => $this->full_name_kh,
            'full_name_en' => $this->full_name_en,
            'phone_number' => $this->phone_number,
            'avatar_url' => $this->avatar_url,
            'is_active' => $this->is_active,
            'must_change_password' => $this->must_change_password,
            'last_login_at' => $this->last_login_at,
            'role' => $this->whenLoaded('role', fn () => [
                'role_id' => $this->role->role_id,
                'role_code' => $this->role->role_code,
                'role_name' => $this->role->role_name_en ?? $this->role->role_name_kh,
            ]),
            'officer' => $this->whenLoaded('officer', fn () => [
                'officer_id' => $this->officer->officer_id,
                'officer_name' => $this->officer->officer_name_en ?? $this->officer->officer_name_kh,
            ]),
            'commune' => $this->whenLoaded('commune', fn () => [
                'commune_id' => $this->commune->commune_id,
                'commune_name' => $this->commune->commune_name_en ?? $this->commune->commune_name_kh,
            ]),
        ];
    }
}
