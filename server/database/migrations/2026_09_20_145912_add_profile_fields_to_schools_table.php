<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->string('code')->nullable()->unique()->after('name');
            $table->string('type')->nullable()->after('contact_email');
            $table->string('level')->nullable()->after('type');
            $table->string('lga')->nullable()->index()->after('level');
            $table->string('education_district')->nullable()->index()->after('lga');
            $table->string('address')->nullable()->after('education_district');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropIndex(['lga']);
            $table->dropIndex(['education_district']);
            $table->dropColumn(['code', 'type', 'level', 'lga', 'education_district', 'address']);
        });
    }
};
