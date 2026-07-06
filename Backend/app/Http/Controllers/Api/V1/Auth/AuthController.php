<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\SystemUserResource;
use App\Models\SystemUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // POST /api/v1/auth/login
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = SystemUser::where(function ($query) use ($credentials) {
                $query->where('username', $credentials['username'])
                      ->orWhere('email', $credentials['username']);
            })
            ->whereNull('deleted_at')
            ->first();

        // Same generic message whether the user doesn't exist or the password
        // is wrong — don't leak which one it was.
        if (! $user || ! Hash::check($credentials['password'], $user->password_hash)) {
            $user?->registerFailedLogin();

            return response()->json(['message' => 'Invalid username or password.'], 401);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'This account has been deactivated.'], 403);
        }

        if ($user->isLocked()) {
            return response()->json([
                'message' => 'Account temporarily locked due to failed login attempts. Try again later.',
                'locked_until' => $user->locked_until,
            ], 423);
        }

        $user->registerSuccessfulLogin($request->ip());

        ['token' => $plainToken] = $user->issueToken(
            name: 'web-session',
            abilities: $this->abilitiesForRole($user->role_id),
            expiresInMinutes: 60 * 24 * 7, // 7 days
        );

        return response()->json([
            'user'  => new SystemUserResource($user->load('role')),
            'token' => $plainToken,
            'token_type' => 'Bearer',
        ]);
    }

    // POST /api/v1/auth/logout
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoke only the token that authenticated this specific request,
        // not every token the user holds (so other devices/sessions stay logged in).
        $user->currentToken?->revoke();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    // GET /api/v1/auth/me
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role', 'officer', 'commune');

        return response()->json(new SystemUserResource($user));
    }

    /**
     * Maps a role to the ability strings stored on its issued tokens.
     * role_id 1=admin, 2=supervisor, 3=registrar, 4=viewer — adjust to match
     * whatever you actually seed into user_roles.
     */
    private function abilitiesForRole(int $roleId): array
    {
        return match ($roleId) {
            1 => ['*'],
            2 => [
                'birth:create', 'birth:read', 'birth:update', 'birth:delete', 'birth:verify', 'birth:print',
                'id_card:create', 'id_card:read', 'id_card:update', 'id_card:dispatch',
                'household:create', 'household:read', 'household:update',
                'family:create', 'family:read', 'family:update',
                'reports:read',
            ],
            3 => [
                'birth:create', 'birth:read', 'birth:print',
                'id_card:create', 'id_card:read',
                'household:create', 'household:read',
                'family:create', 'family:read',
            ],
            default => [ // viewer
                'birth:read', 'id_card:read', 'household:read', 'family:read', 'reports:read',
            ],
        };
    }
}
