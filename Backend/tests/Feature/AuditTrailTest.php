<?php

namespace Tests\Feature;

use App\Models\BirthCertificate;
use App\Models\Citizen;
use App\Models\SystemUser;
use App\Models\UserActionLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuditTrailTest extends TestCase
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

        // Created outside an HTTP request → the observer skips it (no actor).
        $user = SystemUser::create([
            'username' => 'auditor',
            'email' => 'auditor@test.local',
            'password_hash' => Hash::make('secret123'),
            'full_name_en' => 'Auditor',
            'role_id' => 1,
            'is_active' => true,
        ]);

        return $user->issueToken('test', ['*'])['token'];
    }

    private function makeCitizen(): Citizen
    {
        return Citizen::create([
            'full_name_kh' => 'តេស្ត',
            'full_name_en' => 'Test Person',
            'gender' => 'M',
            'date_of_birth' => '1990-01-01',
            'nationality' => 'Cambodian',
        ]);
    }

    public function test_creating_a_birth_certificate_writes_exactly_one_audit_row(): void
    {
        $token = $this->actingToken();
        $citizen = $this->makeCitizen();

        $this->withToken($token)
            ->postJson('/api/v1/birth-certificates', [
                'citizen_id' => $citizen->citizen_id,
                'certificate_number' => 'BC-TEST-1',
                // mother + informant are legally required (Phase 4.4).
                'mother' => [
                    'full_name_kh' => 'ម្តាយ',
                    'full_name_en' => 'Mother',
                    'gender' => 'F',
                ],
                'informant' => [
                    'full_name' => 'Informant',
                    'relationship_to_child' => 'mother',
                    'declaration_date' => now()->toDateString(),
                ],
            ])
            ->assertCreated();

        $logs = UserActionLog::where('target_table', 'birth_certificates')
            ->where('action', 'created')->get();

        $this->assertCount(1, $logs);
        $this->assertNull($logs[0]->old_value);
        $this->assertSame('issued', $logs[0]->new_value['status']);
        // target_id is the certificate's own primary key, not the citizen id.
        $this->assertSame(BirthCertificate::first()->certificate_id, $logs[0]->target_id);
        $this->assertNotNull($logs[0]->hash);

        $this->artisan('audit:verify')->assertSuccessful();
    }

    public function test_updating_a_birth_certificate_records_before_and_after(): void
    {
        $token = $this->actingToken();
        $citizen = $this->makeCitizen();

        // Seeded directly (no actor) so only the API update is audited.
        $cert = BirthCertificate::create([
            'citizen_id' => $citizen->citizen_id,
            'certificate_number' => 'BC-TEST-2',
            'status' => 'issued',
        ]);

        $this->withToken($token)
            ->putJson("/api/v1/birth-certificates/{$cert->certificate_id}", [
                'remarks' => 'Corrected spelling',
            ])
            ->assertOk();

        $logs = UserActionLog::where('target_table', 'birth_certificates')
            ->where('action', 'updated')->get();

        $this->assertCount(1, $logs);
        $this->assertNull($logs[0]->old_value['remarks']);
        $this->assertSame('Corrected spelling', $logs[0]->new_value['remarks']);
    }

    public function test_voiding_a_birth_certificate_writes_one_audit_row(): void
    {
        $token = $this->actingToken();
        $citizen = $this->makeCitizen();

        $cert = BirthCertificate::create([
            'citizen_id' => $citizen->citizen_id,
            'certificate_number' => 'BC-TEST-3',
            'status' => 'issued',
        ]);

        $this->withToken($token)
            ->deleteJson("/api/v1/birth-certificates/{$cert->certificate_id}")
            ->assertOk();

        // Voiding is an update (status → cancelled), captured as one 'updated' row.
        $logs = UserActionLog::where('target_table', 'birth_certificates')
            ->where('action', 'updated')->get();

        $this->assertCount(1, $logs);
        $this->assertSame('issued', $logs[0]->old_value['status']);
        $this->assertSame('cancelled', $logs[0]->new_value['status']);
    }
}
