<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\SystemUserResource;
use App\Models\SystemUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

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
            expiresInMinutes: 60 * 24 * 7,
        );

        return response()->json([
            'user' => new SystemUserResource($user->load('role')),
            'token' => $plainToken,
            'token_type' => 'Bearer',
        ]);
    }

    // POST /api/v1/auth/logout
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentToken?->revoke();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    // GET /api/v1/auth/me
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role', 'officer', 'commune');

        return response()->json(new SystemUserResource($user));
    }

    // PUT /api/v1/auth/me — self-service profile update. Any authenticated user
    // (admin or registrar) may edit their own name, contact details and password.
    // Role, status and account ownership are intentionally NOT editable here —
    // those stay admin-only via SystemUserController@update.
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'full_name_en' => 'sometimes|nullable|string|max:255',
            'full_name_kh' => 'sometimes|nullable|string|max:255',
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('system_users', 'email')->ignore($user->user_id, 'user_id')],
            'phone_number' => 'sometimes|nullable|string|max:30',
            'password' => 'nullable|string|min:8',
        ]);

        $user->fill(collect($data)->except('password')->all());

        if (! empty($data['password'])) {
            $user->password_hash = Hash::make($data['password']);
            $user->password_changed_at = now();
        }

        $user->save();

        return response()->json(new SystemUserResource($user->load('role')));
    }

    private function abilitiesForRole(int $roleId): array
    {
        // Full set of registrar-portal abilities. Every route the portal calls
        // is covered here so both supervisors (2) and registrars (3) can operate
        // the portal without hitting a 403 (e.g. household:update for member
        // removal / address changes).
        $portalAbilities = [
            'birth:create', 'birth:read', 'birth:update', 'birth:delete', 'birth:verify', 'birth:print',
            'id_card:create', 'id_card:read', 'id_card:update', 'id_card:dispatch',
            'household:create', 'household:read', 'household:update',
            'family:create', 'family:read', 'family:update',
            'citizen:read', 'citizen:update',
            'reports:read',
        ];

        return match ($roleId) {
            1 => ['*'],                 // admin — full system access
            2 => $portalAbilities,      // supervisor
            3 => $portalAbilities,      // registrar
            default => [                // viewer — read-only
                'birth:read', 'id_card:read', 'household:read', 'family:read', 'citizen:read', 'reports:read',
            ],
        };
    }
}
