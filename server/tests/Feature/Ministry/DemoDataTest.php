<?php

use App\Models\MinistryUser;
use Database\Seeders\SchoolPortalSeeder;

test('the demo data gives the ministry portal real numbers and a spread of schools worth watching', function () {
    $this->seed(SchoolPortalSeeder::class);
    $ministryUser = MinistryUser::query()->firstOrFail();

    $this->actingAs($ministryUser)->get(route('dashboard'))->assertInertia(fn ($page) => $page
        ->where('totals.schools', 13)
        ->where('school_statuses', ['invited' => 3, 'active' => 11, 'suspended' => 2])
        ->where('totals.students', fn ($students) => $students > 300));

    $watchlist = $this->get(route('ministry.watchlist'))->viewData('page')['props'];
    $rows = collect($watchlist['schools']['data'])->keyBy('name');

    expect($rows->has('Surulere Girls Secondary School'))->toBeTrue()
        ->and(collect($rows['Surulere Girls Secondary School']['flags'])->pluck('key')->all())
        ->toContain('low_attendance', 'high_student_teacher_ratio');

    expect($rows->has('Badagry Community High School'))->toBeTrue()
        ->and(collect($rows['Badagry Community High School']['flags'])->pluck('key')->all())
        ->toBe(['no_current_term']);

    expect($rows->has('Apapa Model School'))->toBeTrue()
        ->and(collect($rows['Apapa Model School']['flags'])->pluck('key')->all())
        ->toBe(['stale_attendance']);

    // A well-staffed, well-attended school should never land here.
    expect($rows->has('Eti-Osa Royal Academy'))->toBeFalse();

    $dataQuality = $this->get(route('ministry.data-quality'))->viewData('page')['props'];
    $issueRows = collect($dataQuality['schools']['data'])->keyBy('name');

    expect(collect($issueRows['Alimosho Grammar School']['issues'])->pluck('key')->all())
        ->toBe(['classes_without_teacher']);
    expect(collect($issueRows['Ikeja Community Secondary School']['issues'])->pluck('key')->sort()->values()->all())
        ->toBe(['subjects_without_teacher', 'teachers_without_subjects']);
    expect(collect($issueRows['Kosofe International School']['issues'])->pluck('key')->all())
        ->toBe(['students_without_guardian']);
    expect(collect($issueRows['Mushin Secondary School']['issues'])->pluck('key')->all())
        ->toBe(['no_grades_this_term']);
});
