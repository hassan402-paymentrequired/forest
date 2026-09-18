<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Converts each teacher's free-text `subjects` array into real links to
     * the school's `Subject` records (creating a subject if none matches by
     * name, case-insensitively, within that school), then drops the column.
     */
    public function up(): void
    {
        DB::table('teachers')->whereNotNull('subjects')->orderBy('id')->each(function (object $teacher) {
            $names = json_decode((string) $teacher->subjects, true) ?? [];

            foreach ($names as $name) {
                $name = trim((string) $name);

                if ($name === '') {
                    continue;
                }

                $subjectId = DB::table('subjects')
                    ->where('school_id', $teacher->school_id)
                    ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
                    ->value('id');

                if (! $subjectId) {
                    $subjectId = (string) Str::ulid();

                    DB::table('subjects')->insert([
                        'id' => $subjectId,
                        'school_id' => $teacher->school_id,
                        'name' => $name,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                DB::table('subject_teacher')->insertOrIgnore([
                    'subject_id' => $subjectId,
                    'teacher_id' => $teacher->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn('subjects');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->json('subjects')->nullable()->after('phone');
        });

        DB::table('teachers')->orderBy('id')->each(function (object $teacher) {
            $names = DB::table('subject_teacher')
                ->join('subjects', 'subjects.id', '=', 'subject_teacher.subject_id')
                ->where('subject_teacher.teacher_id', $teacher->id)
                ->pluck('subjects.name');

            DB::table('teachers')
                ->where('id', $teacher->id)
                ->update(['subjects' => $names->isEmpty() ? null : json_encode($names->values())]);
        });
    }
};
