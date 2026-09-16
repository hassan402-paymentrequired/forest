<?php

namespace Database\Factories;

use App\Enums\StudentStatus;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Student>
 */
class StudentFactory extends Factory
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
            'class_id' => fn (array $attributes) => SchoolClass::factory()->create(['school_id' => $attributes['school_id']])->id,
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'admission_number' => fake()->unique()->numerify('ADM-####'),
            'admission_date' => fake()->dateTimeBetween('-3 years', 'now'),
            'status' => StudentStatus::Active,
        ];
    }

    /**
     * Indicate that the student has graduated.
     */
    public function graduated(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => StudentStatus::Graduated,
        ]);
    }
}
