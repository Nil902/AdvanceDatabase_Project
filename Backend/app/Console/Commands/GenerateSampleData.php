<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Bulk-generates a realistic, referentially-consistent sample dataset across
 * PostgreSQL (citizens, birth certificates, ID cards, households + members)
 * and MongoDB (biometrics, print jobs, notifications, audit events, documents).
 *
 * No Faker — the production image installs `--no-dev`, so this uses plain PHP
 * randomisation and chunked bulk inserts for speed. Safe to append-run; every
 * unique key is namespaced with a per-run token.
 *
 *   php artisan data:generate                 # defaults (~100k citizens + more)
 *   php artisan data:generate --citizens=250000
 *   php artisan data:generate --fresh         # truncate generated tables first
 */
class GenerateSampleData extends Command
{
    protected $signature = 'data:generate
        {--citizens=100000 : Number of citizens to create}
        {--birth-rate=0.6 : Fraction of citizens that get a birth certificate}
        {--card-rate=0.5 : Fraction of adult citizens that get an ID card}
        {--households=20000 : Number of households to create}
        {--families=0 : Number of family units to create (uses existing citizens as heads + members)}
        {--mongo=1 : Also generate MongoDB documents (1/0)}
        {--fresh : Truncate the generated tables before inserting}';

    protected $description = 'Generate a large sample dataset in PostgreSQL and MongoDB';

    private const CHUNK = 2000;

    private array $khGiven = ['សុខ', 'ចាន់', 'ដារា', 'សុភា', 'រតនា', 'វិចិត្រ', 'សំណាង', 'ពិសិដ្ឋ', 'សុវណ្ណ', 'មករា', 'ស្រីនិច', 'បូរ៉ា', 'ចន្ថា', 'នីតា', 'សុគន្ធា'];

    private array $khFamily = ['ហេង', 'លី', 'អ៊ុន', 'ស៊ុន', 'ជា', 'គឹម', 'ម៉ៅ', 'ព្រំ', 'នួន', 'យ៉ង', 'ខៀវ', 'ធី', 'អ៉ាង', 'សេង', 'ទេព'];

    private array $enGiven = ['Sok', 'Chan', 'Dara', 'Sophea', 'Ratana', 'Vichet', 'Samnang', 'Piseth', 'Sovann', 'Makara', 'Sreynich', 'Bora', 'Chantha', 'Nita', 'Sokunthea'];

    private array $enFamily = ['Heng', 'Ly', 'Un', 'Sun', 'Chea', 'Kim', 'Mao', 'Prom', 'Nuon', 'Yong', 'Kheav', 'Thy', 'Ang', 'Seng', 'Tep'];

    private array $occupations = ['Farmer', 'Teacher', 'Merchant', 'Student', 'Civil Servant', 'Driver', 'Nurse', 'Engineer', 'Tailor', 'Police Officer', 'Construction Worker', 'Shop Owner', 'Doctor', 'Accountant', 'Fisherman'];

    public function handle(): int
    {
        $count = (int) $this->option('citizens');
        $run = now()->format('ymdHis');

        if ($this->option('fresh')) {
            $this->warn('Truncating generated tables…');
            DB::statement('TRUNCATE citizen_relationships, family_units, household_members, households, identity_cards, birth_certificates, citizens RESTART IDENTITY CASCADE');
        }

        $villageIds = DB::table('villages')->pluck('village_id')->all();
        if (empty($villageIds)) {
            $this->error('No villages found — seed geography first.');

            return self::FAILURE;
        }
        $vCount = count($villageIds);
        $this->info("Villages available: {$vCount}");

        // ── 1. Citizens ──────────────────────────────────────────────────
        $startNid = DB::table('citizens')->count();
        $this->info("Generating {$count} citizens…");
        $bar = $this->output->createProgressBar($count);

        for ($offset = 0; $offset < $count; $offset += self::CHUNK) {
            $rows = [];
            $n = min(self::CHUNK, $count - $offset);
            for ($i = 0; $i < $n; $i++) {
                $idx = $startNid + $offset + $i + 1;
                $gender = random_int(0, 1) ? 'M' : 'F';
                $dob = Carbon::create(random_int(1940, 2022), random_int(1, 12), random_int(1, 28));
                $rows[] = [
                    'national_id_number' => sprintf('1%08d', $idx),
                    'full_name_kh' => $this->khFamily[array_rand($this->khFamily)].' '.$this->khGiven[array_rand($this->khGiven)],
                    'full_name_en' => $this->enGiven[array_rand($this->enGiven)].' '.$this->enFamily[array_rand($this->enFamily)],
                    'gender' => $gender,
                    'date_of_birth' => $dob->toDateString(),
                    'birth_place_village_id' => $villageIds[random_int(0, $vCount - 1)],
                    'nationality' => 'Cambodian',
                    'occupation' => $this->occupations[array_rand($this->occupations)],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            DB::table('citizens')->insert($rows);
            $bar->advance($n);
        }
        $bar->finish();
        $this->newLine();

        // The citizen_ids we just created (newest `count` rows).
        $citizenIds = DB::table('citizens')->orderByDesc('citizen_id')->limit($count)->pluck('citizen_id')->all();
        sort($citizenIds);

        // ── 2. Birth certificates ────────────────────────────────────────
        $birthN = (int) floor($count * (float) $this->option('birth-rate'));
        $this->info("Generating {$birthN} birth certificates…");
        $this->bulkInsert('birth_certificates', $birthN, function ($i) use ($citizenIds, $run) {
            return [
                'citizen_id' => $citizenIds[$i],
                'certificate_number' => "BC-{$run}-{$i}",
                'issue_date' => now()->subDays(random_int(0, 3650)),
                'registered_date' => now()->subDays(random_int(0, 3650)),
                'status' => 'issued',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // ── 3. Identity cards (adults only) ──────────────────────────────
        $cardN = (int) floor($count * (float) $this->option('card-rate'));
        $this->info("Generating {$cardN} identity cards…");
        $types = ['national_id', 'temp_id', 'foreigner_id'];
        $this->bulkInsert('identity_cards', $cardN, function ($i) use ($citizenIds, $run, $types) {
            $issue = now()->subDays(random_int(0, 3000));

            return [
                'citizen_id' => $citizenIds[$i],
                'card_serial_number' => "NID-{$run}-{$i}",
                'card_type' => $types[array_rand($types)],
                'status' => 'active',
                'issue_date' => $issue->toDateString(),
                'expiry_date' => $issue->copy()->addYears(10)->toDateString(),
                'created_at' => now(),
            ];
        });

        // ── 4. Households + members ──────────────────────────────────────
        $hhN = min((int) $this->option('households'), $count);
        $this->info("Generating {$hhN} households…");
        $this->bulkInsert('households', $hhN, function ($i) use ($citizenIds, $villageIds, $vCount, $run) {
            return [
                'household_number' => "HH-{$run}-{$i}",
                'book_serial' => "RB-{$run}-{$i}",
                'village_id' => $villageIds[random_int(0, $vCount - 1)],
                'household_head_id' => $citizenIds[$i],
                'house_no' => (string) random_int(1, 999),
                'krom_no' => (string) random_int(1, 30),
                'address_detail' => 'Auto-generated sample household',
                'issued_at' => now()->subDays(random_int(0, 2000))->toDateString(),
                'is_active' => true,
                'created_date' => now(),
                'updated_at' => now(),
            ];
        });

        $householdIds = DB::table('households')->orderByDesc('household_id')->limit($hhN)->pluck('household_id')->all();
        sort($householdIds);
        $this->info('Generating household members…');
        $memberRows = [];
        $totalCitizens = count($citizenIds);
        foreach ($householdIds as $k => $hid) {
            // Head
            $memberRows[] = ['household_id' => $hid, 'citizen_id' => $citizenIds[$k], 'relation_to_head' => 'head', 'joined_date' => now()->subDays(random_int(0, 2000))->toDateString()];
            // 0–4 extra members
            $extra = random_int(0, 4);
            for ($m = 0; $m < $extra; $m++) {
                $memberRows[] = ['household_id' => $hid, 'citizen_id' => $citizenIds[random_int(0, $totalCitizens - 1)], 'relation_to_head' => ['spouse', 'child', 'parent', 'sibling', 'other'][random_int(0, 4)], 'joined_date' => now()->subDays(random_int(0, 2000))->toDateString()];
            }
            if (count($memberRows) >= self::CHUNK) {
                DB::table('household_members')->insert($memberRows);
                $memberRows = [];
            }
        }
        if ($memberRows) {
            DB::table('household_members')->insert($memberRows);
        }

        // ── 5. Family units + relationships ──────────────────────────────
        $familyN = (int) $this->option('families');
        if ($familyN > 0) {
            $this->generateFamilies($familyN, $run);
        }

        // ── 6. MongoDB documents ─────────────────────────────────────────
        if ((int) $this->option('mongo')) {
            $this->generateMongo($citizenIds, $run);
        }

        $this->newLine();
        $this->info('✅ Sample data generation complete.');

        return self::SUCCESS;
    }

    /**
     * Family units + their members (stored as citizen_relationships anchored on
     * the head: citizen_id_a = head, citizen_id_b = member). Draws heads and
     * members from the *existing* citizen population, so families can be added on
     * top of an already-seeded dataset. Each family gets a distinct head so the
     * FamilyUnit::members() relation never bleeds across units.
     */
    private function generateFamilies(int $familyN, string $run): void
    {
        // Member link types — exclude 'Head' (that's the anchor, not a member).
        $relTypeIds = DB::table('relationship_types')->where('label', '!=', 'Head')->pluck('rel_type_id')->all();
        if (empty($relTypeIds)) {
            $this->warn('No relationship_types found — run `php artisan db:seed` first. Skipping families.');

            return;
        }
        $relCount = count($relTypeIds);

        // Pool of real citizens to use as heads/members.
        $pool = DB::table('citizens')->pluck('citizen_id')->all();
        $poolCount = count($pool);
        if ($poolCount === 0) {
            $this->warn('No citizens found — generate citizens first. Skipping families.');

            return;
        }

        // Every family needs a distinct head, so cap at the population size.
        $familyN = min($familyN, $poolCount);
        if ($familyN < (int) $this->option('families')) {
            $this->warn("Only {$poolCount} citizens available — capping families at {$familyN}.");
        }

        $heads = $pool;
        shuffle($heads);
        $heads = array_slice($heads, 0, $familyN);

        $this->info("Generating {$familyN} family units…");
        $this->bulkInsert('family_units', $familyN, fn ($i) => [
            'family_code' => "FAM-{$run}-{$i}",
            'head_citizen_id' => $heads[$i],
            'created_at' => now(),
        ]);

        // 1–5 members per family.
        $this->info('Generating family members (citizen_relationships)…');
        $bar = $this->output->createProgressBar($familyN);
        $rows = [];
        foreach ($heads as $headId) {
            $members = random_int(1, 5);
            for ($m = 0; $m < $members; $m++) {
                $memberId = $pool[random_int(0, $poolCount - 1)];
                if ($memberId === $headId) {
                    continue; // never link a head to itself
                }
                $rows[] = [
                    'citizen_id_a' => $headId,
                    'citizen_id_b' => $memberId,
                    'rel_type_id' => $relTypeIds[random_int(0, $relCount - 1)],
                    'verified' => (bool) random_int(0, 1),
                    'created_at' => now(),
                ];
            }
            if (count($rows) >= self::CHUNK) {
                DB::table('citizen_relationships')->insert($rows);
                $rows = [];
            }
            $bar->advance();
        }
        if ($rows) {
            DB::table('citizen_relationships')->insert($rows);
        }
        $bar->finish();
        $this->newLine();
    }

    /**
     * Insert $total rows into a Postgres $table, $count-at-a-time, building each
     * row from the given callback (receives the global row index).
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

    private function generateMongo(array $citizenIds, string $run): void
    {
        $mongo = DB::connection('mongodb');
        $total = count($citizenIds);

        $collections = [
            'citizen_biometrics' => (int) floor($total * 0.5),
            'print_jobs' => (int) floor($total * 0.6),
            'notification_logs' => (int) floor($total * 0.4),
            'audit_event_logs' => (int) floor($total * 0.3),
            'document_attachments' => (int) floor($total * 0.2),
        ];

        foreach ($collections as $collection => $qty) {
            $this->info("Generating {$qty} Mongo docs → {$collection}…");
            $bar = $this->output->createProgressBar($qty);
            for ($offset = 0; $offset < $qty; $offset += self::CHUNK) {
                $docs = [];
                $n = min(self::CHUNK, $qty - $offset);
                for ($i = 0; $i < $n; $i++) {
                    $idx = $offset + $i;
                    $cid = $citizenIds[$idx % $total];
                    $docs[] = $this->mongoDoc($collection, $cid, $idx, $run);
                }
                $mongo->table($collection)->insert($docs);
                $bar->advance($n);
            }
            $bar->finish();
            $this->newLine();
        }
    }

    private function mongoDoc(string $collection, int $citizenId, int $idx, string $run): array
    {
        $now = now()->toIso8601String();

        return match ($collection) {
            'citizen_biometrics' => [
                'citizen_id' => $citizenId,
                'pg_biometric_id' => "BIO-{$run}-{$idx}",
                'captured_at' => $now,
                'capture_location' => 'Commune Office',
                'quality_scores' => ['face' => random_int(60, 99), 'fingerprint' => random_int(60, 99)],
                'fingers_captured_mask' => random_int(0, 1023),
                'is_active' => true,
                'schema_version' => 1,
            ],
            'print_jobs' => [
                'pg_print_id' => "PRJ-{$run}-{$idx}",
                'job_type' => ['id_card', 'birth_certificate'][random_int(0, 1)],
                'reference_table' => 'identity_cards',
                'reference_id' => $citizenId,
                'status' => ['queued', 'printing', 'printed', 'dispatched', 'delivered'][random_int(0, 4)],
                'priority' => random_int(1, 5),
                'current_attempt' => random_int(0, 3),
                'max_attempts' => 3,
                'schema_version' => 1,
            ],
            'notification_logs' => [
                'citizen_id' => $citizenId,
                'channel' => ['sms', 'email'][random_int(0, 1)],
                'event_type' => ['card_ready', 'birth_registered', 'otp'][random_int(0, 2)],
                'message_subject' => 'Notification',
                'status' => ['queued', 'sent', 'delivered', 'failed'][random_int(0, 3)],
                'queued_at' => $now,
                'schema_version' => 1,
            ],
            'audit_event_logs' => [
                'performed_at' => $now,
                'target_table' => ['citizens', 'identity_cards', 'households'][random_int(0, 2)],
                'target_id' => $citizenId,
                'success' => (bool) random_int(0, 1),
                'ip_address' => '10.'.random_int(0, 255).'.'.random_int(0, 255).'.'.random_int(1, 254),
                'schema_version' => 1,
            ],
            'document_attachments' => [
                'pg_attachment_id' => "ATT-{$run}-{$idx}",
                'reference_table' => 'birth_certificates',
                'reference_id' => $citizenId,
                'document_type' => ['scan', 'photo', 'pdf'][random_int(0, 2)],
                'file_name' => "doc-{$run}-{$idx}.pdf",
                'mime_type' => 'application/pdf',
                'file_size_bytes' => random_int(10000, 5000000),
                'access_level' => 'restricted',
                'schema_version' => 1,
            ],
            default => [],
        };
    }
}
