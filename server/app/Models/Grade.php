<?php

namespace App\Models;

use App\Enums\GradeLetter;
use App\Models\Concerns\BelongsToSchool;
use Database\Factories\GradeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A student's score for a single subject in a single term. `total` and
 * `grade` are derived from `ca_score`/`exam_score` on every save, so they
 * never drift out of sync with the scores they're computed from.
 *
 * @property string $id
 * @property string $school_id
 * @property string $student_id
 * @property string $subject_id
 * @property string $school_class_id
 * @property string $academic_term_id
 * @property string|null $teacher_id
 * @property int $ca_score
 * @property int $exam_score
 * @property int $total
 * @property GradeLetter $grade
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['school_id', 'student_id', 'subject_id', 'school_class_id', 'academic_term_id', 'teacher_id', 'ca_score', 'exam_score'])]
class Grade extends Model
{
    /** @use HasFactory<GradeFactory> */
    use BelongsToSchool, HasFactory, HasUlids;

    /**
     * The maximum score a student can earn in continuous assessment.
     */
    public const CA_MAX = 40;

    /**
     * The maximum score a student can earn in the exam.
     */
    public const EXAM_MAX = 60;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'grade' => GradeLetter::class,
        ];
    }

    /**
     * Keep `total` and `grade` derived from the CA/exam scores on every save.
     */
    protected static function booted(): void
    {
        static::saving(function (Grade $grade) {
            $grade->total = $grade->ca_score + $grade->exam_score;
            $grade->grade = GradeLetter::fromTotal($grade->total);
        });
    }

    /**
     * Get the student this grade belongs to.
     *
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Get the subject this grade was earned in.
     *
     * @return BelongsTo<Subject, $this>
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the class this grade was recorded for.
     *
     * @return BelongsTo<SchoolClass, $this>
     */
    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class);
    }

    /**
     * Get the academic term this grade falls within.
     *
     * @return BelongsTo<AcademicTerm, $this>
     */
    public function academicTerm(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class);
    }

    /**
     * Get the teacher who recorded this grade, if any.
     *
     * @return BelongsTo<Teacher, $this>
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }
}
