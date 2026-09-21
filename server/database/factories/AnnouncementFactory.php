<?php

namespace Database\Factories;

use App\Enums\AnnouncementStatus;
use App\Models\Announcement;
use App\Models\MinistryUser;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Announcement>
 */
class AnnouncementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'ministry_user_id' => MinistryUser::factory(),
            'title' => fake()->sentence(4),
            'body' => fake()->paragraph(),
            'status' => AnnouncementStatus::Active,
        ];
    }

    /**
     * Indicate that the announcement has been archived.
     */
    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AnnouncementStatus::Archived,
        ]);
    }
}
