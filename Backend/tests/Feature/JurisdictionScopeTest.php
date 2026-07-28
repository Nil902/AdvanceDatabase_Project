<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Commune;
use App\Models\District;
use App\Models\Household;
use App\Models\Province;
use App\Models\SystemUser;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class JurisdictionScopeTest extends TestCase
{
    use RefreshDatabase;

    private function seedRole(): void
    {
        DB::table('user_roles')->insertOrIgnore([
            'role_id' => 1,
            'role_code' => 'admin',
            'role_name_en' => 'Administrator',
            'role_name_kh' => 'អ្នកគ្រប់គ្រង',
            'created_at' => now(),
        ]);
    }

    /** @return array{token:string} */
    private function makeUser(array $abilities, ?int $communeId, string $username): string
    {
        $this->seedRole();

        $user = SystemUser::create([
            'username' => $username,
            'email' => "{$username}@test.local",
            'password_hash' => Hash::make('secret123'),
            'full_name_en' => ucfirst($username),
            'role_id' => 1,
            'commune_id' => $communeId,
            'is_active' => true,
        ]);

        return $user->issueToken('test', $abilities)['token'];
    }

    private function villageInNewCommune(string $code): Village
    {
        $province = Province::create(['province_code' => "P{$code}", 'province_name_en' => "Prov {$code}"]);
        $district = District::create(['district_code' => "D{$code}", 'district_name_en' => "Dist {$code}", 'province_id' => $province->province_id]);
        $commune = Commune::create(['commune_code' => "C{$code}", 'commune_name_en' => "Comm {$code}", 'district_id' => $district->district_id]);

        return Village::create(['village_code' => "V{$code}", 'village_name_en' => "Vill {$code}", 'commune_id' => $commune->commune_id]);
    }

    private function householdIn(Village $village, string $number): Household
    {
        $head = Citizen::create([
            'full_name_kh' => 'ប្រធាន',
            'full_name_en' => "Head {$number}",
            'gender' => 'M',
            'date_of_birth' => '1980-01-01',
            'birth_place_village_id' => $village->village_id,
            'nationality' => 'Cambodian',
        ]);

        return Household::create([
            'household_number' => $number,
            'village_id' => $village->village_id,
            'household_head_id' => $head->citizen_id,
            'is_active' => true,
        ]);
    }

    public function test_admin_sees_households_in_every_commune(): void
    {
        $villageA = $this->villageInNewCommune('A');
        $villageB = $this->villageInNewCommune('B');
        $this->householdIn($villageA, 'HH-A');
        $this->householdIn($villageB, 'HH-B');

        $token = $this->makeUser(['*'], $villageA->commune_id, 'admin');

        $this->withToken($token)->getJson('/api/v1/households')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_scoped_officer_sees_only_their_commune(): void
    {
        $villageA = $this->villageInNewCommune('A');
        $villageB = $this->villageInNewCommune('B');
        $this->householdIn($villageA, 'HH-A');
        $this->householdIn($villageB, 'HH-B');

        $token = $this->makeUser(['household:read'], $villageA->commune_id, 'officer');

        $response = $this->withToken($token)->getJson('/api/v1/households')->assertOk();
        $response->assertJsonCount(1, 'data');
        $this->assertSame('HH-A', $response->json('data.0.household_number'));
    }

    public function test_officer_without_commune_sees_everything(): void
    {
        $villageA = $this->villageInNewCommune('A');
        $villageB = $this->villageInNewCommune('B');
        $this->householdIn($villageA, 'HH-A');
        $this->householdIn($villageB, 'HH-B');

        $token = $this->makeUser(['household:read'], null, 'national');

        $this->withToken($token)->getJson('/api/v1/households')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
