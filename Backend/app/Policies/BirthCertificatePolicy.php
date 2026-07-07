<?php

namespace App\Policies;

use App\Models\BirthCertificate;
use App\Models\SystemUser;

class BirthCertificatePolicy
{
    public function viewAny(SystemUser $user): bool
    {
        return $user->currentToken?->hasAbility('birth:read')
            || $user->currentToken?->hasAbility('*');
    }

    public function view(SystemUser $user, BirthCertificate $certificate): bool
    {
        return $user->currentToken?->hasAbility('birth:read')
            || $user->currentToken?->hasAbility('*');
    }

    public function create(SystemUser $user): bool
    {
        return $user->currentToken?->hasAbility('birth:create')
            || $user->currentToken?->hasAbility('*');
    }

    public function update(SystemUser $user, BirthCertificate $certificate): bool
    {
        return $user->currentToken?->hasAbility('birth:update')
            || $user->currentToken?->hasAbility('*');
    }

    public function delete(SystemUser $user, BirthCertificate $certificate): bool
    {
        return $user->currentToken?->hasAbility('birth:delete')
            || $user->currentToken?->hasAbility('*');
    }

    public function verify(SystemUser $user, BirthCertificate $certificate): bool
    {
        return $user->currentToken?->hasAbility('birth:verify')
            || $user->currentToken?->hasAbility('*');
    }

    public function print(SystemUser $user, BirthCertificate $certificate): bool
    {
        return $user->currentToken?->hasAbility('birth:print')
            || $user->currentToken?->hasAbility('*');
    }
}
