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
        Schema::create('announcements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('ministry_user_id')->nullable()->constrained('ministry_users')->nullOnDelete();
            $table->string('title');
            $table->text('body');
            $table->string('status')->default('active')->index();
            $table->timestamps();
        });

        Schema::create('announcement_school', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('announcement_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('school_id')->constrained()->cascadeOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->unique(['announcement_id', 'school_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('announcement_school');
        Schema::dropIfExists('announcements');
    }
};
