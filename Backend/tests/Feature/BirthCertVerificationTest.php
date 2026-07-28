<?php

namespace Tests\Feature;

use App\Models\BirthCertificate;
use App\Models\Citizen;
use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BirthCertVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function actingToken(): string
    {
        DB::table('user_roles')->insertOrIgnore([
            'role_id' => 1,
            'role_code' => 'admin',
            'role_name_en' => 'Administrator',
            'role_name_kh' => 'អ្នកគ្រប់គ្រង',
            'created_at' => now(),
        ]);

        $user = SystemUser::create([
            'username' => 'verifier',
            'email' => 'verifier@test.local',
            'password_hash' => Hash::make('secret123'),
            'full_name_en' => 'Verifier',
            'role_id' => 1,
            'is_active' => true,
        ]);

        return $user->issueToken('test', ['*'])['token'];
    }

    private function makeCert(array $overrides = []): BirthCertificate
    {
        $citizen = Citizen::create([
            'full_name_kh' => 'កូន',
            'full_name_en' => 'Child',
            'gender' => 'M',
            'date_of_birth' => '2015-01-01',
            'nationality' => 'Cambodian',
        ]);

        return BirthCertificate::create(array_merge([
            'citizen_id' => $citizen->citizen_id,
            'certificate_number' => 'BC-VER-'.$citizen->citizen_id,
            'registered_date' => now(),
            'status' => 'issued',
        ], $overrides));
    }

    public function test_verify_marks_certificate_verified(): void
    {
        $token = $this->actingToken();
        $cert = $this->makeCert();

        $this->withToken($token)
            ->postJson("/api/v1/birth-certificates/{$cert->certificate_id}/verify")
            ->assertOk()
            ->assertJsonPath('data.is_verified', true);

        $this->assertNotNull($cert->fresh()->verified_at);
    }

    public function test_cancelled_certificate_cannot_be_verified(): void
    {
        $token = $this->actingToken();
        $cert = $this->makeCert(['status' => 'cancelled']);

        $this->withToken($token)
            ->postJson("/api/v1/birth-certificates/{$cert->certificate_id}/verify")
            ->assertStatus(422);
    }

    public function test_amending_verified_certificate_requires_reason(): void
    {
        $token = $this->actingToken();
        $cert = $this->makeCert(['verified_at' => now(), 'verified_by' => 1]);

        $this->withToken($token)
            ->patchJson("/api/v1/birth-certificates/{$cert->certificate_id}", [
                'remarks' => 'typo fix',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('amendment_reason');
    }

    public function test_amendment_with_reason_clears_verification(): void
    {
        $token = $this->actingToken();
        $cert = $this->makeCert(['verified_at' => now(), 'verified_by' => 1]);

        $this->withToken($token)
            ->patchJson("/api/v1/birth-certificates/{$cert->certificate_id}", [
                'remarks' => 'corrected spelling',
                'amendment_reason' => 'Name misspelled on original entry',
            ])
            ->assertOk()
            ->assertJsonPath('data.is_verified', false);

        $fresh = $cert->fresh();
        $this->assertNull($fresh->verified_at);
        $this->assertSame('Name misspelled on original entry', $fresh->last_amendment_reason);
    }
}
