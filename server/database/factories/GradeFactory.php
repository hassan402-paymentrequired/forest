<?php

namespace Database\Factories;

use App\Models\AcademicTerm;
use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Grade>
 */
class GradeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'school_id' => School::factory(),
            'student_id' => fn (array $attributes) => Student::factory()->create(['school_id' => $attributes['school_id']])->id,
            'subject_id' => fn (array $attributes) => Subject::factory()->create(['school_id' => $attributes['school_id']])->id,
            'school_class_id' => fn (array $attributes) => SchoolClass::factory()->create(['school_id' => $attributes['school_id']])->id,
            'academic_term_id' => fn (array $attributes) => AcademicTerm::factory()->current()->create(['school_id' => $attributes['school_id']])->id,
            'ca_score' => fake()->numberBetween(0, Grade::CA_MAX),
            'exam_score' => fake()->numberBetween(0, Grade::EXAM_MAX),
        ];
    }
}
