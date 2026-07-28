<?php

namespace Tests\Feature;

use App\Models\SystemUser;
use App\Models\UserActionLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthAuditTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): SystemUser
    {
        DB::table('user_roles')->insertOrIgnore([
            'role_id' => 1,
            'role_code' => 'admin',
            'role_name_en' => 'Administrator',
            'role_name_kh' => 'អ្នកគ្រប់គ្រង',
            'created_at' => now(),
        ]);

        return SystemUser::create([
            'username' => 'signin',
            'email' => 'signin@test.local',
            'password_hash' => Hash::make('secret123'),
            'full_name_en' => 'Sign In',
            'role_id' => 1,
            'is_active' => true,
        ]);
    }

    public function test_successful_login_writes_a_login_audit_row(): void
    {
        $user = $this->makeUser();

        $this->postJson('/api/v1/auth/login', [
            'username' => 'signin',
            'password' => 'secret123',
        ])->assertOk();

        $logs = UserActionLog::where('action', 'login')->get();

        $this->assertCount(1, $logs);
        $this->assertSame($user->user_id, $logs[0]->user_id);
        $this->assertSame('system_users', $logs[0]->target_table);
        $this->assertNotNull($logs[0]->hash);

        // Chain integrity must still hold after the auth-event row.
        $this->artisan('audit:verify')->assertSuccessful();
    }

    public function test_logout_writes_a_logout_audit_row(): void
    {
        $user = $this->makeUser();
        $token = $user->issueToken('test', ['*'])['token'];

        $this->withToken($token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->assertSame(1, UserActionLog::where('action', 'logout')->count());
    }
}
