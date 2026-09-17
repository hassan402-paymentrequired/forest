<?php

namespace Database\Factories;

use App\Models\AcademicTerm;
use App\Models\ClassTeacherAssignment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Teacher;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClassTeacherAssignment>
 */
class ClassTeacherAssignmentFactory extends Factory
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
            'school_class_id' => fn (array $attributes) => SchoolClass::factory()->create(['school_id' => $attributes['school_id']])->id,
            'teacher_id' => fn (array $attributes) => Teacher::factory()->create(['school_id' => $attributes['school_id']])->id,
            'academic_term_id' => fn (array $attributes) => AcademicTerm::factory()->create(['school_id' => $attributes['school_id']])->id,
        ];
    }
}
