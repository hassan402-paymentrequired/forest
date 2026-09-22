<?php

use App\Enums\SchoolType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The platform only onboards public schools today. `type` stays a real,
     * editable column (private support can come back later without new
     * migrations) — this only changes what a school gets when nothing sets it.
     *
     * Uses raw SQL rather than Blueprint::change() because doctrine/dbal
     * (which that requires) isn't installed.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE schools ALTER COLUMN type SET DEFAULT '".SchoolType::Public->value."'");
        }

        DB::table('schools')->whereNull('type')->update(['type' => SchoolType::Public->value]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE schools ALTER COLUMN type DROP DEFAULT');
        }
    }
};
