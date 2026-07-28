<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\MarriageCertificate;
use App\Models\MarriageStatusHistory;
use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MarriageDivorceTest extends TestCase
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
            'username' => 'registrar',
            'email' => 'registrar@test.local',
            'password_hash' => Hash::make('secret123'),
            'full_name_en' => 'Registrar',
            'role_id' => 1,
            'is_active' => true,
        ]);

        return $user->issueToken('test', ['*'])['token'];
    }

    private function makeCitizen(array $overrides = []): Citizen
    {
        return Citizen::create(array_merge([
            'full_name_kh' => 'តេស្ត',
            'full_name_en' => 'Test Person',
            'gender' => 'M',
            'date_of_birth' => '1990-01-01',
            'nationality' => 'Cambodian',
        ], $overrides));
    }

    public function test_marriage_succeeds_for_two_eligible_adults(): void
    {
        $token = $this->actingToken();
        $a = $this->makeCitizen();
        $b = $this->makeCitizen(['gender' => 'F']);

        $this->withToken($token)
            ->postJson('/api/v1/vital-events/marriage', [
                'spouse_a_id' => $a->citizen_id,
                'spouse_b_id' => $b->citizen_id,
                'marriage_date' => '2020-06-01',
                'witnesses' => [
                    ['witness_name' => 'Witness One'],
                ],
            ])
            ->assertCreated();

        $cert = MarriageCertificate::first();
        $this->assertSame('active', $cert->status);
        $this->assertCount(1, $cert->witnesses);
        $this->assertDatabaseHas('marriage_status_histories', [
            'marriage_cert_id' => $cert->certificate_id,
            'status' => 'active',
        ]);
    }

    public function test_marriage_rejected_when_a_spouse_is_deceased(): void
    {
        $token = $this->actingToken();
        $a = $this->makeCitizen(['date_of_death' => '2019-01-01']);
        $b = $this->makeCitizen(['gender' => 'F']);

        $this->withToken($token)
            ->postJson('/api/v1/vital-events/marriage', [
                'spouse_a_id' => $a->citizen_id,
                'spouse_b_id' => $b->citizen_id,
                'marriage_date' => '2020-06-01',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('spouse_a_id');
    }

    public function test_marriage_rejected_when_a_spouse_is_underage(): void
    {
        $token = $this->actingToken();
        $a = $this->makeCitizen(['date_of_birth' => '2010-01-01']); // 10 on marriage date
        $b = $this->makeCitizen(['gender' => 'F']);

        $this->withToken($token)
            ->postJson('/api/v1/vital-events/marriage', [
                'spouse_a_id' => $a->citizen_id,
                'spouse_b_id' => $b->citizen_id,
                'marriage_date' => '2020-06-01',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('spouse_a_id');
    }

    public function test_marriage_rejected_when_a_spouse_is_already_married(): void
    {
        $token = $this->actingToken();
        $a = $this->makeCitizen();
        $b = $this->makeCitizen(['gender' => 'F']);
        $c = $this->makeCitizen(['gender' => 'F']);

        $this->withToken($token)->postJson('/api/v1/vital-events/marriage', [
            'spouse_a_id' => $a->citizen_id,
            'spouse_b_id' => $b->citizen_id,
            'marriage_date' => '2019-01-01',
        ])->assertCreated();

        $this->withToken($token)->postJson('/api/v1/vital-events/marriage', [
            'spouse_a_id' => $a->citizen_id,
            'spouse_b_id' => $c->citizen_id,
            'marriage_date' => '2020-06-01',
        ])->assertStatus(422)->assertJsonValidationErrors('spouse_a_id');
    }

    public function test_divorce_succeeds_on_an_active_marriage(): void
    {
        $token = $this->actingToken();
        $a = $this->makeCitizen();
        $b = $this->makeCitizen(['gender' => 'F']);

        $this->withToken($token)->postJson('/api/v1/vital-events/marriage', [
            'spouse_a_id' => $a->citizen_id,
            'spouse_b_id' => $b->citizen_id,
            'marriage_date' => '2019-01-01',
        ])->assertCreated();

        $cert = MarriageCertificate::first();

        $this->withToken($token)->postJson('/api/v1/vital-events/divorce', [
            'marriage_cert_id' => $cert->certificate_id,
            'ruling_date' => '2022-03-01',
            'court_reference' => 'CASE-42',
        ])->assertCreated();

        $this->assertSame('divorced', $cert->fresh()->status);
        $this->assertTrue(
            MarriageStatusHistory::where('marriage_cert_id', $cert->certificate_id)
                ->where('status', 'divorced')->exists()
        );
    }

    public function test_divorce_rejected_when_marriage_not_active(): void
    {
        $token = $this->actingToken();
        $a = $this->makeCitizen();
        $b = $this->makeCitizen(['gender' => 'F']);

        $this->withToken($token)->postJson('/api/v1/vital-events/marriage', [
            'spouse_a_id' => $a->citizen_id,
            'spouse_b_id' => $b->citizen_id,
            'marriage_date' => '2019-01-01',
        ])->assertCreated();

        $cert = MarriageCertificate::first();

        // First divorce succeeds.
        $this->withToken($token)->postJson('/api/v1/vital-events/divorce', [
            'marriage_cert_id' => $cert->certificate_id,
            'ruling_date' => '2022-03-01',
        ])->assertCreated();

        // Second divorce on the now-inactive marriage is rejected.
        $this->withToken($token)->postJson('/api/v1/vital-events/divorce', [
            'marriage_cert_id' => $cert->certificate_id,
            'ruling_date' => '2023-03-01',
        ])->assertStatus(422)->assertJsonValidationErrors('marriage_cert_id');
    }

    public function test_divorce_rejected_when_ruling_predates_marriage(): void
    {
        $token = $this->actingToken();
        $a = $this->makeCitizen();
        $b = $this->makeCitizen(['gender' => 'F']);

        $this->withToken($token)->postJson('/api/v1/vital-events/marriage', [
            'spouse_a_id' => $a->citizen_id,
            'spouse_b_id' => $b->citizen_id,
            'marriage_date' => '2019-01-01',
        ])->assertCreated();

        $cert = MarriageCertificate::first();

        $this->withToken($token)->postJson('/api/v1/vital-events/divorce', [
            'marriage_cert_id' => $cert->certificate_id,
            'ruling_date' => '2018-01-01',
        ])->assertStatus(422)->assertJsonValidationErrors('ruling_date');
    }

    public function test_death_rejected_for_already_deceased_citizen(): void
    {
        $token = $this->actingToken();
        $citizen = $this->makeCitizen(['date_of_death' => '2020-01-01']);

        $this->withToken($token)->postJson('/api/v1/vital-events/death', [
            'citizen_id' => $citizen->citizen_id,
            'death_date' => '2021-01-01',
        ])->assertStatus(422)->assertJsonValidationErrors('citizen_id');
    }

    public function test_death_rejected_when_before_birth(): void
    {
        $token = $this->actingToken();
        $citizen = $this->makeCitizen(['date_of_birth' => '1990-01-01']);

        $this->withToken($token)->postJson('/api/v1/vital-events/death', [
            'citizen_id' => $citizen->citizen_id,
            'death_date' => '1980-01-01',
        ])->assertStatus(422)->assertJsonValidationErrors('death_date');
    }
}
