<?php

use App\Enums\GradeLetter;
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
        Schema::create('grades', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('student_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('subject_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('school_class_id')->constrained('school_classes')->restrictOnDelete();
            $table->foreignUlid('academic_term_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('teacher_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('ca_score');
            $table->unsignedTinyInteger('exam_score');
            $table->unsignedTinyInteger('total');
            $table->string('grade')->default(GradeLetter::F->value);
            $table->timestamps();

            $table->unique(['student_id', 'subject_id', 'academic_term_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
