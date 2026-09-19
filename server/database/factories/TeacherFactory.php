<?php

namespace Database\Factories;

use App\Enums\TeacherStatus;
use App\Models\School;
use App\Models\Teacher;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Teacher>
 */
class TeacherFactory extends Factory
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
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'joined_at' => fake()->dateTimeBetween('-5 years', 'now'),
            'status' => TeacherStatus::Active,
        ];
    }

    /**
     * Indicate that the teacher is on leave.
     */
    public function onLeave(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TeacherStatus::OnLeave,
        ]);
    }
}
