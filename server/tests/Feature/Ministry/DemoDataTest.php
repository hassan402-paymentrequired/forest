<?php

use App\Models\MinistryUser;
use Database\Seeders\SchoolPortalSeeder;

test('the demo data gives the ministry portal real numbers and a school worth watching', function () {
    $this->seed(SchoolPortalSeeder::class);
    $ministryUser = MinistryUser::query()->firstOrFail();

    $this->actingAs($ministryUser)->get(route('dashboard'))->assertInertia(fn ($page) => $page
        ->where('totals.schools', 5)
        ->where('school_statuses', ['invited' => 1, 'active' => 4, 'suspended' => 1])
        ->where('totals.students', fn ($students) => $students > 70));

    $this->get(route('ministry.watchlist'))->assertInertia(fn ($page) => $page
        ->where('schools.data.0.name', 'Surulere Girls Secondary School')
        ->where('schools.data.0.flags.0.key', 'low_attendance'));
});
