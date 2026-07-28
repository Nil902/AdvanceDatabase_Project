<?php

namespace App\Console\Commands;

use App\Models\BirthCertificate;
use App\Models\Citizen;
use App\Models\IdentityCard;
use App\Models\Mongo\DocumentAttachment;
use App\Models\SystemUser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Copies existing photo/scan/avatar files from a source disk (default 'public')
 * onto the configured photos disk (config('filesystems.photos'), i.e. R2
 * in prod) and backfills the MongoDB metadata collection.
 *
 * Run this once after pointing PHOTO_DISK at Spaces so the already-uploaded
 * files follow. Idempotent: re-running skips objects already present on the
 * destination. Use --check for a dry run (also reports orphans/missing files).
 *
 *   php artisan photos:migrate --from=public
 *   php artisan photos:migrate --check
 */
class MigratePhotos extends Command
{
    protected $signature = 'photos:migrate {--from=public : Source disk to copy from} {--check : Dry run — report only, copy nothing}';

    protected $description = 'Copy photos/scans/avatars to the object-storage (R2) disk and backfill Mongo metadata';

    /** [model class, pointer column, document_type] for every stored-file column. */
    private const SOURCES = [
        [Citizen::class, 'photo_path', 'citizen_portrait'],
        [IdentityCard::class, 'photo_path', 'id_card_photo'],
        [BirthCertificate::class, 'photo_path', 'birth_certificate_scan'],
        [SystemUser::class, 'avatar_path', 'user_avatar'],
    ];

    public function handle(): int
    {
        $from = (string) $this->option('from');
        $to = config('filesystems.photos', 'public');
        $check = (bool) $this->option('check');

        if ($from === $to && ! $check) {
            $this->warn("Source and destination disks are both '{$to}' — nothing to migrate. Set PHOTO_DISK to Spaces first.");

            return self::SUCCESS;
        }

        $src = Storage::disk($from);
        $dst = Storage::disk($to);
        $copied = $skipped = $missing = 0;

        foreach (self::SOURCES as [$model, $column, $docType]) {
            foreach ($model::query()->whereNotNull($column)->cursor() as $record) {
                $path = $record->{$column};

                if (! $src->exists($path)) {
                    $this->warn("MISSING on '{$from}': {$path} ({$model} #{$record->getKey()})");
                    $missing++;

                    continue;
                }

                if ($dst->exists($path)) {
                    $skipped++;

                    continue;
                }

                if ($check) {
                    $this->line("would copy: {$path}");
                    $copied++;

                    continue;
                }

                $contents = $src->get($path);
                $dst->put($path, $contents);
                $this->backfillMetadata($path, $to, $contents, $record, $docType);
                $this->line("copied: {$path}");
                $copied++;
            }
        }

        $verb = $check ? 'would copy' : 'copied';
        $this->info("Done. {$verb}: {$copied}, already present: {$skipped}, missing on source: {$missing}.");

        return self::SUCCESS;
    }

    /** Upsert the Mongo metadata doc for a migrated object. Best-effort. */
    private function backfillMetadata(string $path, string $disk, string $contents, $record, string $docType): void
    {
        try {
            DocumentAttachment::updateOrCreate(
                ['object_key' => $path],
                [
                    'disk' => $disk,
                    'reference_table' => $record->getTable(),
                    'reference_id' => $record->getKey(),
                    'document_type' => $docType,
                    'file_name' => basename($path),
                    'file_size_bytes' => strlen($contents),
                    'checksum_sha256' => hash('sha256', $contents),
                    'uploaded_at' => $record->created_at ?? now(),
                    'schema_version' => 1,
                ]
            );
        } catch (\Throwable $e) {
            $this->warn("  metadata (Mongo) skipped for {$path}: {$e->getMessage()}");
        }
    }
}
