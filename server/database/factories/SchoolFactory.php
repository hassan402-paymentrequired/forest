<?php

namespace Database\Factories;

use App\Enums\EducationDistrict;
use App\Enums\Lga;
use App\Enums\SchoolLevel;
use App\Enums\SchoolStatus;
use App\Enums\SchoolType;
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
     * Give the school a full profile (code, type, level, location).
     */
    public function withProfile(): static
    {
        return $this->state(fn (array $attributes) => [
            'code' => fake()->unique()->bothify('LG-####'),
            'type' => fake()->randomElement(SchoolType::cases()),
            'level' => fake()->randomElement(SchoolLevel::cases()),
            'lga' => fake()->randomElement(Lga::cases()),
            'education_district' => fake()->randomElement(EducationDistrict::cases()),
            'address' => fake()->streetAddress(),
        ]);
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
