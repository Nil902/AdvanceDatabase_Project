<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Fills the "people profile" and civil-life tables that GenerateSampleData
 * leaves empty, so the dataset exercises real multi-table JOINs and the query
 * cache under load. Attaches to the *existing* citizen population (no new
 * citizens) and, like GenerateSampleData, uses plain-PHP randomisation +
 * chunked bulk inserts (no Faker — prod image is --no-dev).
 *
 * PostgreSQL it populates:
 *   registration_officers, citizen_addresses, citizen_marital_statuses,
 *   parents (+ citizen_parents), marriage_certificates (+ marriage_witnesses),
 *   divorce_certificates, legal_guardianships, birth_informants,
 *   card_status_logs, and citizens.photo_path. Seeds nationality_statuses /
 *   adoption_agencies reference rows if empty.
 *
 * MongoDB it populates:
 *   citizen_profiles — one rich profile document per citizen (contact, socials,
 *   address, education, employment, emergency contact, demographics).
 *
 *   php artisan data:profiles                 # ~100k citizens + all the above
 *   php artisan data:profiles --all           # attach to every existing citizen
 *   php artisan data:profiles --fresh         # truncate profile/vital tables first
 *   php artisan data:profiles --mongo=0       # skip Mongo profiles
 */
class GenerateProfileData extends Command
{
    protected $signature = 'data:profiles
        {--citizens=100000 : Attach profiles to this many existing citizens (ignored with --all)}
        {--all : Attach profiles to EVERY existing citizen}
        {--new-only : Only target citizens/birth-certs/cards that are NOT already profiled (idempotent forward-fill — re-run to add the next batch without duplicates)}
        {--officers=2000 : Registration officers to create}
        {--marriages=60000 : Marriage certificates to create}
        {--divorce-rate=0.2 : Fraction of marriages that also get a divorce record}
        {--guardianships=15000 : Legal guardianships to create}
        {--informants=100000 : Birth informants to create (capped at #birth certificates)}
        {--card-logs=100000 : Card status-log rows to create (capped at #identity cards)}
        {--photo-rate=1.0 : Fraction of profile citizens given a photo_path}
        {--mongo=1 : Also generate MongoDB citizen_profiles (1/0)}
        {--fresh : Truncate the profile/vital tables before inserting}';

    protected $description = 'Populate people-profile & civil-life tables (PostgreSQL + MongoDB) for performance/cache testing';

    private const CHUNK = 2000;

    private array $khGiven = ['សុខ', 'ចាន់', 'ដារា', 'សុភា', 'រតនា', 'វិចិត្រ', 'សំណាង', 'ពិសិដ្ឋ', 'សុវណ្ណ', 'មករា', 'ស្រីនិច', 'បូរ៉ា', 'ចន្ថា', 'នីតា', 'សុគន្ធា'];

    private array $khFamily = ['ហេង', 'លី', 'អ៊ុន', 'ស៊ុន', 'ជា', 'គឹម', 'ម៉ៅ', 'ព្រំ', 'នួន', 'យ៉ង', 'ខៀវ', 'ធី', 'អ៉ាង', 'សេង', 'ទេព'];

    private array $enGiven = ['Sok', 'Chan', 'Dara', 'Sophea', 'Ratana', 'Vichet', 'Samnang', 'Piseth', 'Sovann', 'Makara', 'Sreynich', 'Bora', 'Chantha', 'Nita', 'Sokunthea'];

    private array $enFamily = ['Heng', 'Ly', 'Un', 'Sun', 'Chea', 'Kim', 'Mao', 'Prom', 'Nuon', 'Yong', 'Kheav', 'Thy', 'Ang', 'Seng', 'Tep'];

    private array $occupations = ['Farmer', 'Teacher', 'Merchant', 'Student', 'Civil Servant', 'Driver', 'Nurse', 'Engineer', 'Tailor', 'Police Officer', 'Construction Worker', 'Shop Owner', 'Doctor', 'Accountant', 'Fisherman'];

    private array $provinces = ['Phnom Penh', 'Kandal', 'Siem Reap', 'Battambang', 'Kampong Cham', 'Takeo', 'Prey Veng', 'Kampot', 'Pursat', 'Svay Rieng'];

    private array $streets = ['St. 271', 'National Road 1', 'St. 63', 'Monivong Blvd', 'St. 51', 'Sisowath Quay', 'St. 310', 'National Road 5', 'St. 105', 'Norodom Blvd'];

    public function handle(): int
    {
        // Loading the citizen-id pool + building chunked inserts is memory-heavy
        // once the population reaches several hundred thousand. Raise the limit
        // for this CLI run (well within the droplet's RAM+swap) so it doesn't
        // hit the default 256M ceiling.
        @ini_set('memory_limit', '1024M');

        $run = now()->format('ymdHis');

        // ── Reference data (idempotent) ──────────────────────────────────
        $this->seedNationalityStatuses();
        $this->seedAdoptionAgencies();

        $userIds = DB::table('system_users')->pluck('user_id')->all();
        if (empty($userIds)) {
            $this->error('No system_users found — cannot set audit/issuer FKs. Aborting.');

            return self::FAILURE;
        }
        $communeIds = DB::table('communes')->pluck('commune_id')->all();
        if (empty($communeIds)) {
            $this->error('No communes found — seed geography first. Aborting.');

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            $this->warn('Truncating profile / civil-life LEAF tables…');
            // Leaf-only: nothing in the core schema references these, so a CASCADE
            // stays contained. Deliberately EXCLUDED: `parents` (referenced by
            // birth_certificates.mother/father_parent_id) and `marriage_certificates`
            // (referenced by identity_cards.marriage_cert_id) — truncating either
            // would CASCADE-wipe those core tables. They stay append-only instead.
            DB::statement('TRUNCATE citizen_addresses, citizen_marital_statuses, citizen_parents, marriage_witnesses, divorce_certificates, legal_guardianships, birth_informants, card_status_logs RESTART IDENTITY CASCADE');
            // Only clear generator-set photos, never real uploaded ones.
            DB::statement("UPDATE citizens SET photo_path = NULL WHERE photo_path LIKE 'photos/citizen/%'");
        }

        // Whole population, sorted — used both as the profile target set and as
        // the random pool for spouse / guardian / member picks.
        $this->info('Loading citizen population…');
        $allIds = DB::table('citizens')->orderBy('citizen_id')->pluck('citizen_id')->all();
        $poolCount = count($allIds);
        if ($poolCount === 0) {
            $this->error('No citizens found — run `php artisan data:generate` first. Aborting.');

            return self::FAILURE;
        }

        $newOnly = (bool) $this->option('new-only');
        $target = $this->option('all') ? $poolCount : min((int) $this->option('citizens'), $poolCount);
        if ($newOnly) {
            // Forward-fill: only citizens that don't already have an address row
            // (our per-citizen profile anchor). Re-running keeps adding the next
            // batch instead of duplicating already-profiled citizens.
            $profileIds = DB::table('citizens as c')
                ->whereNotExists(function ($q) {
                    $q->select(DB::raw(1))->from('citizen_addresses as ca')->whereColumn('ca.citizen_id', 'c.citizen_id');
                })
                ->orderBy('c.citizen_id')->limit($target)->pluck('c.citizen_id')->all();
            $this->info("Population: {$poolCount} citizens — attaching profiles to ".count($profileIds)." not-yet-profiled citizens (--new-only).");
        } else {
            $profileIds = array_slice($allIds, 0, $target);
            $this->info("Population: {$poolCount} citizens — attaching profiles to {$target}.");
        }

        // ── 1. Registration officers ─────────────────────────────────────
        $this->generateOfficers((int) $this->option('officers'), $communeIds, $run);

        // ── 2. Per-citizen profile tables ────────────────────────────────
        $this->generateAddresses($profileIds);
        $this->generateMaritalStatuses($profileIds, $userIds);
        $this->generateParents($profileIds);
        $this->setPhotoPaths($profileIds, (float) $this->option('photo-rate'));

        // ── 3. Vital records (draw parties from the whole pool) ───────────
        $this->generateMarriages((int) $this->option('marriages'), (float) $this->option('divorce-rate'), $allIds, $userIds, $run);
        $this->generateGuardianships((int) $this->option('guardianships'), $allIds, $userIds);

        // ── 4. Attach to existing birth certs / id cards ─────────────────
        $this->generateBirthInformants((int) $this->option('informants'), $newOnly);
        $this->generateCardStatusLogs((int) $this->option('card-logs'), $userIds, $newOnly);

        // ── 5. MongoDB rich people-profiles ──────────────────────────────
        if ((int) $this->option('mongo')) {
            $this->generateMongoProfiles($profileIds, $run);
        }

        $this->newLine();
        $this->info('✅ Profile & civil-life data generation complete.');

        return self::SUCCESS;
    }

    private function seedNationalityStatuses(): void
    {
        if (DB::table('nationality_statuses')->exists()) {
            return;
        }
        $this->info('Seeding nationality_statuses…');
        DB::table('nationality_statuses')->insert(array_map(
            fn ($l) => ['label' => $l],
            ['Cambodian', 'Naturalized', 'Foreign Resident', 'Stateless', 'Dual National']
        ));
    }

    private function seedAdoptionAgencies(): void
    {
        if (DB::table('adoption_agencies')->exists()) {
            return;
        }
        $this->info('Seeding adoption_agencies…');
        $names = ['Angkor Child Care', 'Mekong Family Services', 'Hope Adoption Agency', 'Cambodia Children Trust'];
        DB::table('adoption_agencies')->insert(array_map(fn ($n, $i) => [
            'agency_name' => $n,
            'license_number' => 'AG-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
            'country' => 'Cambodia',
            'is_active' => true,
        ], $names, array_keys($names)));
    }

    private function generateOfficers(int $n, array $communeIds, string $run): void
    {
        if ($n <= 0) {
            return;
        }
        $cCount = count($communeIds);
        $positions = ['Registrar', 'Deputy Registrar', 'Records Officer', 'Field Officer', 'Commune Clerk'];
        $this->info("Generating {$n} registration officers…");
        $this->bulkInsert('registration_officers', $n, fn ($i) => [
            'officer_code' => "OFF-{$run}-{$i}",
            'full_name_kh' => $this->khFamily[array_rand($this->khFamily)].' '.$this->khGiven[array_rand($this->khGiven)],
            'full_name_en' => $this->enGiven[array_rand($this->enGiven)].' '.$this->enFamily[array_rand($this->enFamily)],
            'position' => $positions[array_rand($positions)],
            'phone_number' => '0'.random_int(10, 99).random_int(100000, 999999),
            'commune_id' => $communeIds[random_int(0, $cCount - 1)],
            'is_active' => true,
            'created_at' => now(),
        ]);
    }

    private function generateAddresses(array $ids): void
    {
        $this->info('Generating citizen_addresses…');
        $bar = $this->output->createProgressBar(count($ids));
        $rows = [];
        foreach ($ids as $cid) {
            $rows[] = [
                'citizen_id' => $cid,
                'street' => $this->streets[array_rand($this->streets)].' #'.random_int(1, 500),
                'city' => $this->provinces[array_rand($this->provinces)],
                'province' => $this->provinces[array_rand($this->provinces)],
                'postal_code' => (string) random_int(10000, 99999),
                'country' => 'Cambodia',
                'is_current' => true,
                'valid_from' => now()->subDays(random_int(30, 5000)),
                'valid_to' => null,
            ];
            if (count($rows) >= self::CHUNK) {
                DB::table('citizen_addresses')->insert($rows);
                $bar->advance(count($rows));
                $rows = [];
            }
        }
        if ($rows) {
            DB::table('citizen_addresses')->insert($rows);
            $bar->advance(count($rows));
        }
        $bar->finish();
        $this->newLine();
    }

    private function generateMaritalStatuses(array $ids, array $userIds): void
    {
        $this->info('Generating citizen_marital_statuses…');
        $statuses = ['single', 'married', 'divorced', 'widowed'];
        $uCount = count($userIds);
        $bar = $this->output->createProgressBar(count($ids));
        $rows = [];
        foreach ($ids as $cid) {
            $rows[] = [
                'citizen_id' => $cid,
                'status' => $statuses[array_rand($statuses)],
                'effective_date' => now()->subDays(random_int(0, 6000)),
                'recorded_by' => $userIds[random_int(0, $uCount - 1)],
            ];
            if (count($rows) >= self::CHUNK) {
                DB::table('citizen_marital_statuses')->insert($rows);
                $bar->advance(count($rows));
                $rows = [];
            }
        }
        if ($rows) {
            DB::table('citizen_marital_statuses')->insert($rows);
            $bar->advance(count($rows));
        }
        $bar->finish();
        $this->newLine();
    }

    /**
     * Two parent records (mother + father) per citizen, linked via
     * citizen_parents. Ids are read back per batch to build the links.
     */
    private function generateParents(array $ids): void
    {
        $this->info('Generating parents + citizen_parents…');
        $bar = $this->output->createProgressBar(count($ids));
        foreach (array_chunk($ids, self::CHUNK) as $chunk) {
            $parentRows = [];
            foreach ($chunk as $cid) {
                $parentRows[] = $this->parentRow('F', $cid);
                $parentRows[] = $this->parentRow('M', $cid);
            }
            // Insert the batch, then read back exactly the ids we just created.
            // Serial ids increase with insertion order, so sorting the newest
            // N ascending restores the (mother, father, mother, father, …) order
            // of $parentRows — robust even if the sequence had gaps.
            DB::table('parents')->insert($parentRows);
            $ordered = DB::table('parents')->orderByDesc('parent_id')->limit(count($parentRows))->pluck('parent_id')->all();
            sort($ordered);
            $links = [];
            $k = 0;
            foreach ($chunk as $cid) {
                $motherPid = $ordered[$k] ?? null;
                $fatherPid = $ordered[$k + 1] ?? null;
                $k += 2;
                if ($motherPid) {
                    $links[] = ['citizen_id' => $cid, 'parent_id' => $motherPid, 'relationship_type' => 'mother'];
                }
                if ($fatherPid) {
                    $links[] = ['citizen_id' => $cid, 'parent_id' => $fatherPid, 'relationship_type' => 'father'];
                }
            }
            if ($links) {
                DB::table('citizen_parents')->insert($links);
            }
            $bar->advance(count($chunk));
        }
        $bar->finish();
        $this->newLine();
    }

    private function parentRow(string $gender, int $cid): array
    {
        return [
            'national_id_number' => null,
            'full_name_kh' => $this->khFamily[array_rand($this->khFamily)].' '.$this->khGiven[array_rand($this->khGiven)],
            'full_name_en' => $this->enGiven[array_rand($this->enGiven)].' '.$this->enFamily[array_rand($this->enFamily)],
            'gender' => $gender,
            'date_of_birth' => Carbon::create(random_int(1940, 1990), random_int(1, 12), random_int(1, 28))->toDateString(),
            'phone_number' => '0'.random_int(10, 99).random_int(100000, 999999),
            'occupation' => $this->occupations[array_rand($this->occupations)],
            'nationality' => 'Cambodian',
            'citizen_id' => $cid,
            'created_at' => now(),
        ];
    }

    private function setPhotoPaths(array $ids, float $rate): void
    {
        if (empty($ids) || $rate <= 0) {
            return;
        }
        $min = $ids[0];
        $max = $ids[count($ids) - 1];
        $this->info('Setting citizens.photo_path (profile photos)…');
        if ($rate >= 1.0) {
            DB::update("UPDATE citizens SET photo_path = 'photos/citizen/' || citizen_id || '.jpg', updated_at = now() WHERE citizen_id BETWEEN ? AND ? AND photo_path IS NULL", [$min, $max]);
        } else {
            DB::update("UPDATE citizens SET photo_path = 'photos/citizen/' || citizen_id || '.jpg', updated_at = now() WHERE citizen_id BETWEEN ? AND ? AND photo_path IS NULL AND random() < ?", [$min, $max, $rate]);
        }
    }

    private function generateMarriages(int $n, float $divorceRate, array $pool, array $userIds, string $run): void
    {
        if ($n <= 0) {
            return;
        }
        $poolCount = count($pool);
        $uCount = count($userIds);
        $statuses = ['active', 'active', 'active', 'divorced', 'annulled'];
        $this->info("Generating {$n} marriage certificates (+witnesses)…");

        $bar = $this->output->createProgressBar($n);
        for ($offset = 0; $offset < $n; $offset += self::CHUNK) {
            $batch = min(self::CHUNK, $n - $offset);
            $certRows = [];
            for ($i = 0; $i < $batch; $i++) {
                $a = $pool[random_int(0, $poolCount - 1)];
                $b = $pool[random_int(0, $poolCount - 1)];
                if ($a === $b) {
                    $b = $pool[($poolCount - 1) - ($a % $poolCount)];
                }
                $certRows[] = [
                    'spouse_a_id' => $a,
                    'spouse_b_id' => $b,
                    'marriage_date' => now()->subDays(random_int(30, 9000))->toDateString(),
                    'issued_by' => $userIds[random_int(0, $uCount - 1)],
                    'certificate_number' => "MC-{$run}-".($offset + $i),
                    'location' => $this->provinces[array_rand($this->provinces)].' Commune Office',
                    'status' => $statuses[array_rand($statuses)],
                    'created_at' => now(),
                ];
            }
            DB::table('marriage_certificates')->insert($certRows);

            // Read back the ids for witnesses + divorces.
            $certIds = DB::table('marriage_certificates')->orderByDesc('certificate_id')->limit($batch)->pluck('certificate_id')->all();
            sort($certIds);

            // 2 witnesses per certificate.
            $witRows = [];
            foreach ($certIds as $cid) {
                for ($w = 0; $w < 2; $w++) {
                    $witRows[] = [
                        'certificate_id' => $cid,
                        'witness_name' => $this->enGiven[array_rand($this->enGiven)].' '.$this->enFamily[array_rand($this->enFamily)],
                        'national_id' => sprintf('2%08d', random_int(0, 99999999)),
                        'phone_number' => '0'.random_int(10, 99).random_int(100000, 999999),
                    ];
                }
            }
            DB::table('marriage_witnesses')->insert($witRows);

            // A fraction get a divorce record.
            $divRows = [];
            foreach ($certIds as $cid) {
                if (mt_rand() / mt_getrandmax() < $divorceRate) {
                    $divRows[] = [
                        'marriage_cert_id' => $cid,
                        'ruling_date' => now()->subDays(random_int(0, 3000))->toDateString(),
                        'court_reference' => 'CASE-'.random_int(1000, 9999).'/'.random_int(2005, 2025),
                        'issued_by' => $userIds[random_int(0, $uCount - 1)],
                        'created_at' => now(),
                    ];
                }
            }
            if ($divRows) {
                DB::table('divorce_certificates')->insert($divRows);
            }

            $bar->advance($batch);
        }
        $bar->finish();
        $this->newLine();
    }

    private function generateGuardianships(int $n, array $pool, array $userIds): void
    {
        if ($n <= 0) {
            return;
        }
        $poolCount = count($pool);
        $uCount = count($userIds);
        $statuses = ['active', 'active', 'ended', 'revoked'];
        $this->info("Generating {$n} legal guardianships…");
        $this->bulkInsert('legal_guardianships', $n, function () use ($pool, $poolCount, $userIds, $uCount, $statuses) {
            $minor = $pool[random_int(0, $poolCount - 1)];
            $guardian = $pool[random_int(0, $poolCount - 1)];
            if ($guardian === $minor) {
                $guardian = $pool[($poolCount - 1) - ($minor % $poolCount)];
            }
            $start = now()->subDays(random_int(0, 4000));

            return [
                'minor_id' => $minor,
                'guardian_id' => $guardian,
                'start_date' => $start->toDateString(),
                'end_date' => random_int(0, 1) ? $start->copy()->addYears(random_int(1, 10))->toDateString() : null,
                'court_order_ref' => 'GO-'.random_int(1000, 9999),
                'status' => $statuses[array_rand($statuses)],
                'granted_by' => $userIds[random_int(0, $uCount - 1)],
                'created_at' => now(),
            ];
        });
    }

    private function generateBirthInformants(int $n, bool $newOnly = false): void
    {
        if ($n <= 0) {
            return;
        }
        $q = DB::table('birth_certificates as bc')->orderBy('bc.certificate_id');
        if ($newOnly) {
            $q->whereNotExists(function ($sub) {
                $sub->select(DB::raw(1))->from('birth_informants as bi')->whereColumn('bi.certificate_id', 'bc.certificate_id');
            });
        }
        $certIds = $q->limit($n)->pluck('bc.certificate_id')->all();
        if (empty($certIds)) {
            $this->warn('No birth_certificates found — skipping birth_informants.');

            return;
        }
        $relations = ['mother', 'father', 'grandparent', 'sibling', 'guardian', 'hospital_staff'];
        $this->info('Generating '.count($certIds).' birth_informants…');
        $bar = $this->output->createProgressBar(count($certIds));
        $rows = [];
        foreach ($certIds as $cid) {
            $rows[] = [
                'certificate_id' => $cid,
                'full_name' => $this->enGiven[array_rand($this->enGiven)].' '.$this->enFamily[array_rand($this->enFamily)],
                'national_id_number' => sprintf('1%08d', random_int(0, 99999999)),
                'relationship_to_child' => $relations[array_rand($relations)],
                'address' => $this->streets[array_rand($this->streets)].', '.$this->provinces[array_rand($this->provinces)],
                'phone_number' => '0'.random_int(10, 99).random_int(100000, 999999),
                'declaration_date' => now()->subDays(random_int(0, 3000))->toDateString(),
                'created_at' => now(),
            ];
            if (count($rows) >= self::CHUNK) {
                DB::table('birth_informants')->insert($rows);
                $bar->advance(count($rows));
                $rows = [];
            }
        }
        if ($rows) {
            DB::table('birth_informants')->insert($rows);
            $bar->advance(count($rows));
        }
        $bar->finish();
        $this->newLine();
    }

    private function generateCardStatusLogs(int $n, array $userIds, bool $newOnly = false): void
    {
        if ($n <= 0) {
            return;
        }
        $q = DB::table('identity_cards as ic')->orderBy('ic.card_id');
        if ($newOnly) {
            $q->whereNotExists(function ($sub) {
                $sub->select(DB::raw(1))->from('card_status_logs as csl')->whereColumn('csl.card_id', 'ic.card_id');
            });
        }
        $cardIds = $q->limit($n)->pluck('ic.card_id')->all();
        if (empty($cardIds)) {
            $this->warn('No identity_cards found — skipping card_status_logs.');

            return;
        }
        $uCount = count($userIds);
        $flow = [['issued', 'printing'], ['printing', 'printed'], ['printed', 'dispatched'], ['dispatched', 'active'], ['active', 'expired']];
        $this->info('Generating '.count($cardIds).' card_status_logs…');
        $bar = $this->output->createProgressBar(count($cardIds));
        $rows = [];
        foreach ($cardIds as $cid) {
            $step = $flow[array_rand($flow)];
            $rows[] = [
                'card_id' => $cid,
                'previous_status' => $step[0],
                'new_status' => $step[1],
                'reason' => 'Automated status transition',
                'changed_by' => $userIds[random_int(0, $uCount - 1)],
                'changed_at' => now()->subDays(random_int(0, 2000)),
            ];
            if (count($rows) >= self::CHUNK) {
                DB::table('card_status_logs')->insert($rows);
                $bar->advance(count($rows));
                $rows = [];
            }
        }
        if ($rows) {
            DB::table('card_status_logs')->insert($rows);
            $bar->advance(count($rows));
        }
        $bar->finish();
        $this->newLine();
    }

    private function generateMongoProfiles(array $ids, string $run): void
    {
        $mongo = DB::connection('mongodb');
        $total = count($ids);
        $this->info("Generating {$total} Mongo docs → citizen_profiles…");
        $bloods = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
        $eduLevels = ['none', 'primary', 'secondary', 'high_school', 'bachelor', 'master', 'phd'];
        $langs = ['km', 'en', 'fr', 'zh'];
        $channels = ['sms', 'email', 'telegram'];
        $bar = $this->output->createProgressBar($total);

        for ($offset = 0; $offset < $total; $offset += self::CHUNK) {
            $n = min(self::CHUNK, $total - $offset);
            $docs = [];
            for ($i = 0; $i < $n; $i++) {
                $cid = $ids[$offset + $i];
                $first = $this->enGiven[array_rand($this->enGiven)];
                $last = $this->enFamily[array_rand($this->enFamily)];
                $docs[] = [
                    'citizen_id' => $cid,
                    'pg_profile_id' => "PROF-{$run}-".($offset + $i),
                    'display_name_en' => "{$first} {$last}",
                    'display_name_kh' => $this->khFamily[array_rand($this->khFamily)].' '.$this->khGiven[array_rand($this->khGiven)],
                    'contact' => [
                        'email' => strtolower($first.'.'.$last.$cid).'@example.com',
                        'phone' => '0'.random_int(10, 99).random_int(100000, 999999),
                        'alt_phone' => random_int(0, 1) ? '0'.random_int(10, 99).random_int(100000, 999999) : null,
                    ],
                    'socials' => [
                        'facebook' => 'fb.com/'.strtolower($first.$last.$cid),
                        'telegram' => '@'.strtolower($first.$last),
                    ],
                    'address' => [
                        'street' => $this->streets[array_rand($this->streets)].' #'.random_int(1, 500),
                        'city' => $this->provinces[array_rand($this->provinces)],
                        'province' => $this->provinces[array_rand($this->provinces)],
                        'postal_code' => (string) random_int(10000, 99999),
                        'country' => 'Cambodia',
                    ],
                    'emergency_contact' => [
                        'name' => $this->enGiven[array_rand($this->enGiven)].' '.$this->enFamily[array_rand($this->enFamily)],
                        'relationship' => ['spouse', 'parent', 'sibling', 'friend'][random_int(0, 3)],
                        'phone' => '0'.random_int(10, 99).random_int(100000, 999999),
                    ],
                    'education' => [
                        'level' => $eduLevels[array_rand($eduLevels)],
                        'institution' => 'Royal University '.random_int(1, 12),
                        'graduation_year' => random_int(1975, 2024),
                    ],
                    'employment' => [
                        'occupation' => $this->occupations[array_rand($this->occupations)],
                        'employer' => ['Self', 'Govt', 'NGO', 'Private Co.'][random_int(0, 3)],
                        'monthly_income_usd' => random_int(150, 3000),
                        'since_year' => random_int(1990, 2024),
                    ],
                    'demographics' => [
                        'blood_type' => $bloods[array_rand($bloods)],
                        'height_cm' => random_int(150, 190),
                        'weight_kg' => random_int(45, 95),
                        'marital_status' => ['single', 'married', 'divorced', 'widowed'][random_int(0, 3)],
                    ],
                    'preferences' => [
                        'language' => $langs[array_rand($langs)],
                        'contact_channel' => $channels[array_rand($channels)],
                    ],
                    'avatar_path' => "avatars/citizen/{$cid}.jpg",
                    'tags' => array_slice(['voter', 'taxpayer', 'veteran', 'student', 'senior'], 0, random_int(1, 3)),
                    'is_verified' => (bool) random_int(0, 1),
                    'schema_version' => 1,
                    'created_at' => now()->toIso8601String(),
                    'updated_at' => now()->toIso8601String(),
                ];
            }
            $mongo->table('citizen_profiles')->insert($docs);
            $bar->advance($n);
        }
        $bar->finish();
        $this->newLine();
    }

    /**
     * Insert $total rows into $table, CHUNK-at-a-time, building each row from
     * the callback (receives the global row index).
     */
    private function bulkInsert(string $table, int $total, callable $make): void
    {
        $bar = $this->output->createProgressBar($total);
        for ($offset = 0; $offset < $total; $offset += self::CHUNK) {
            $rows = [];
            $n = min(self::CHUNK, $total - $offset);
            for ($i = 0; $i < $n; $i++) {
                $rows[] = $make($offset + $i);
            }
            DB::table($table)->insert($rows);
            $bar->advance($n);
        }
        $bar->finish();
        $this->newLine();
    }
}
