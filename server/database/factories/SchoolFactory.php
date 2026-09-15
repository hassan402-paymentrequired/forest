<?php

namespace Database\Factories;

use App\Enums\SchoolStatus;
use App\Models\MinistryUser;
use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<School>
 */
class SchoolFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'contact_email' => fake()->unique()->safeEmail(),
            'status' => SchoolStatus::Invited,
            'invited_by' => MinistryUser::factory(),
            'activated_at' => null,
        ];
    }

    /**
     * Indicate that the school has accepted its invitation and is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => SchoolStatus::Active,
            'activated_at' => now(),
        ]);
    }

    /**
     * Indicate that the school has been suspended.
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => SchoolStatus::Suspended,
        ]);
    }
}
