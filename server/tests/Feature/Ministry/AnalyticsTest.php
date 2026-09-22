<?php

use App\Enums\AttendanceStatus;
use App\Enums\EducationDistrict;
use App\Enums\Lga;
use App\Enums\SchoolType;
use App\Exports\SchoolReportExport;
use App\Models\AcademicTerm;
use App\Models\Attendance;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\MinistryUser;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Two active schools with known numbers, plus an invited school that must
 * never count:
 *
 *   Alpha College (Ikeja): 4 students, 1 teacher, attendance 3/4 (75%, exactly
 *   on the threshold), two grades (80 and 10) so an average of 45 and a 50% pass rate.
 *
 *   Beta Academy (Surulere): 2 students, no teacher, attendance 1/2 (50%), no grades.
 *
 * @return array{alpha: School, beta: School, invited: School}
 */
function seedMinistryScenario(): array
{
    $alpha = School::factory()->active()->create([
        'name' => 'Alpha College',
        'lga' => Lga::Ikeja,
        'education_district' => EducationDistrict::DistrictI,
        'type' => SchoolType::Public,
    ]);
    $beta = School::factory()->active()->create([
        'name' => 'Beta Academy',
        'lga' => Lga::Surulere,
        'education_district' => EducationDistrict::DistrictII,
        'type' => SchoolType::Private,
    ]);
    $invited = School::factory()->create(['name' => 'Gamma School']);

    $alphaData = seedAttendance($alpha, [
        AttendanceStatus::Present, AttendanceStatus::Present, AttendanceStatus::Present, AttendanceStatus::Absent,
    ]);
    seedAttendance($beta, [AttendanceStatus::Present, AttendanceStatus::Absent]);
    Student::factory()->for($invited)->create();
    Teacher::factory()->for($alpha)->create();

    $subject = Subject::factory()->for($alpha)->create();

    foreach ([[30, 50], [5, 5]] as $index => [$ca, $exam]) {
        Grade::factory()->for($alpha)->create([
            'student_id' => $alphaData['students'][$index]->id,
            'subject_id' => $subject->id,
            'school_class_id' => $alphaData['class']->id,
            'academic_term_id' => $alphaData['term']->id,
            'ca_score' => $ca,
            'exam_score' => $exam,
        ]);
    }

    return compact('alpha', 'beta', 'invited');
}

/**
 * Give a school a current term and one attendance record today per status.
 *
 * @param  list<AttendanceStatus>  $statuses
 * @return array{students: list<Student>, term: AcademicTerm, class: SchoolClass}
 */
function seedAttendance(School $school, array $statuses): array
{
    ['term' => $term] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();

    $students = array_map(function (AttendanceStatus $status) use ($school, $term, $class): Student {
        $student = Student::factory()->for($school)->create();

        Attendance::factory()->for($school)->create([
            'student_id' => $student->id,
            'school_class_id' => $class->id,
            'academic_term_id' => $term->id,
            'date' => today(),
            'status' => $status,
        ]);

        return $student;
    }, $statuses);

    return ['students' => $students, 'term' => $term, 'class' => $class];
}

beforeEach(function () {
    $this->ministryUser = MinistryUser::factory()->create();
});

test('every ministry analytics page redirects guests to the ministry login', function (string $routeName) {
    $this->get(route($routeName))->assertRedirect(route('login'));
})->with([
    'dashboard',
    'ministry.enrolment',
    'ministry.staffing',
    'ministry.attendance',
    'ministry.performance',
    'ministry.coverage',
    'ministry.geography',
    'ministry.data-quality',
    'ministry.watchlist',
    'ministry.reports.index',
]);

test('a school user cannot open the ministry portal', function () {
    $schoolUser = SchoolUser::factory()->create();

    // actingAs() makes the school guard the default for the test; a real school
    // session leaves the default (ministry) guard signed out.
    $this->actingAs($schoolUser, 'school');
    Auth::shouldUse('web');

    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

describe('dashboard', function () {
    test('it totals active schools and leaves out schools that have not activated', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('dashboard'))->assertInertia(fn ($page) => $page
            ->component('ministry/dashboard')
            ->where('totals.schools', 2)
            ->where('totals.students', 6)
            ->where('totals.teachers', 1)
            ->where('totals.attendance_rate', 66.7)
            ->where('totals.average_score', 45)
            ->where('totals.pass_rate', 50)
            ->where('school_statuses', ['invited' => 1, 'active' => 2, 'suspended' => 0])
            ->has('attendance_trend', 1)
            ->where('attendance_trend.0.rate', 66.7));
    });

    test('it narrows every number to the chosen LGA', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('dashboard', ['lga' => 'ikeja']))->assertInertia(fn ($page) => $page
            ->where('totals.schools', 1)
            ->where('totals.students', 4)
            ->where('totals.attendance_rate', 75)
            ->where('filters.lga', 'ikeja'));
    });

    test('an unknown filter value is ignored rather than failing', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('dashboard', ['lga' => 'atlantis']))->assertInertia(fn ($page) => $page
            ->where('totals.schools', 2)
            ->where('filters.lga', ''));
    });

    test('it shows zeroes and no rates when there are no schools', function () {
        $this->actingAs($this->ministryUser)->get(route('dashboard'))->assertInertia(fn ($page) => $page
            ->where('totals.schools', 0)
            ->where('totals.attendance_rate', null)
            ->where('totals.average_score', null));
    });
});

describe('monitoring pages', function () {
    test('attendance lists the lowest-attendance school first and counts schools below the threshold', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.attendance'))->assertInertia(fn ($page) => $page
            ->component('ministry/attendance')
            ->where('below_threshold', 1)
            ->where('breakdown.present', 4)
            ->where('breakdown.absent', 2)
            ->where('schools.data.0.name', 'Beta Academy')
            ->where('schools.data.0.attendance_rate', 50)
            ->where('schools.data.1.attendance_rate', 75));
    });

    test('staffing puts the school with students and no teachers first', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.staffing'))->assertInertia(fn ($page) => $page
            ->component('ministry/staffing')
            ->where('understaffed_count', 1)
            ->where('totals.student_teacher_ratio', 6)
            ->where('schools.data.0.name', 'Beta Academy')
            ->where('schools.data.0.student_teacher_ratio', null)
            ->where('schools.data.1.student_teacher_ratio', 4));
    });

    test('enrolment counts students by status and per session', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.enrolment'))->assertInertia(fn ($page) => $page
            ->component('ministry/enrolment')
            ->where('statuses.active', 6)
            ->where('schools.data.0.name', 'Alpha College')
            ->where('schools.data.0.students_active', 4)
            ->where('by_lga.0.label', 'Ikeja'));
    });

    test('performance ranks schools by average score and spreads grades across letters', function () {
        ['alpha' => $alpha, 'beta' => $beta] = seedMinistryScenario();

        $this->actingAs($this->ministryUser)
            ->get(route('ministry.performance', ['compare' => [$alpha->id, $beta->id]]))
            ->assertInertia(fn ($page) => $page
                ->component('ministry/performance')
                ->where('distribution.a', 1)
                ->where('distribution.f', 1)
                ->where('schools.data.0.name', 'Alpha College')
                ->where('schools.data.0.average_score', 45)
                ->where('schools.data.1.average_score', null)
                ->has('subjects', 1)
                ->has('compare.schools', 2));
    });

    test('a comparison is capped at the configured number of schools', function () {
        config()->set('ministry.comparison_limit', 1);
        ['alpha' => $alpha, 'beta' => $beta] = seedMinistryScenario();

        $this->actingAs($this->ministryUser)
            ->get(route('ministry.performance', ['compare' => [$alpha->id, $beta->id]]))
            ->assertInertia(fn ($page) => $page->has('compare.schools', 1));
    });

    test('coverage counts classes and subjects per school', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.coverage'))->assertInertia(fn ($page) => $page
            ->component('ministry/coverage')
            ->where('totals.subjects', 1)
            ->has('subjects', 1)
            ->where('subjects.0.schools', 1));
    });

    test('geography rolls up by LGA and district and counts schools without a location', function () {
        seedMinistryScenario();
        $unlocated = School::factory()->active()->create(['name' => 'Delta School']);
        seedAttendance($unlocated, [AttendanceStatus::Present]);

        $this->actingAs($this->ministryUser)->get(route('ministry.geography'))->assertInertia(fn ($page) => $page
            ->component('ministry/geography')
            ->where('unlocated_schools', 1)
            ->has('by_lga', 2)
            ->where('by_lga.0.label', 'Ikeja')
            ->where('by_lga.0.students', 4)
            ->has('by_district', 2));
    });
});

describe('watchlist and data quality', function () {
    test('the watchlist flags the school that trips a rule and not the one exactly on a threshold', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.watchlist'))->assertInertia(fn ($page) => $page
            ->component('ministry/watchlist')
            ->where('flagged_schools', 1)
            ->has('schools.data', 1)
            ->where('schools.data.0.name', 'Beta Academy')
            ->where('schools.data.0.flags.0.key', 'low_attendance')
            ->where('schools.data.0.flags.1.key', 'high_student_teacher_ratio'));
    });

    test('the watchlist can be narrowed to one flag', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.watchlist', ['flag' => 'low_pass_rate']))->assertInertia(fn ($page) => $page
            ->where('flagged_schools', 1)
            ->has('schools.data', 0));
    });

    test('a school with no attendance recorded for longer than the limit is flagged as stale', function () {
        config()->set('ministry.thresholds.stale_days', 14);
        $school = School::factory()->active()->create();
        seedAttendance($school, [AttendanceStatus::Present]);
        Attendance::query()->withoutGlobalScopes()->update(['date' => today()->subDays(30)]);

        $this->actingAs($this->ministryUser)->get(route('ministry.watchlist', ['flag' => 'stale_attendance']))->assertInertia(fn ($page) => $page
            ->has('schools.data', 1));
    });

    test('a school without a current term is flagged and reported as a data-quality gap', function () {
        School::factory()->active()->create(['name' => 'Termless School']);

        $this->actingAs($this->ministryUser)->get(route('ministry.watchlist'))->assertInertia(fn ($page) => $page
            ->where('schools.data.0.flags.0.key', 'no_current_term'));

        $this->actingAs($this->ministryUser)->get(route('ministry.data-quality'))->assertInertia(fn ($page) => $page
            ->where('schools.data.0.issues.0.key', 'no_current_term'));
    });

    test('data quality reports each gap and how many schools have it', function () {
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.data-quality'))->assertInertia(fn ($page) => $page
            ->component('ministry/data-quality')
            ->where('flagged_schools', 2)
            ->where('summary', fn ($summary) => collect($summary)->pluck('schools', 'key')->only([
                'no_grades_this_term', 'students_without_guardian', 'teachers_without_subjects',
            ])->all() === [
                'no_grades_this_term' => 1,
                'students_without_guardian' => 2,
                'teachers_without_subjects' => 1,
            ]));
    });

    test('a student with a guardian is not a data-quality gap', function () {
        $school = School::factory()->active()->create();
        ['students' => [$student]] = seedAttendance($school, [AttendanceStatus::Present]);
        Guardian::factory()->for($school)->create()->students()->attach($student);

        $this->actingAs($this->ministryUser)->get(route('ministry.data-quality', ['issue' => 'students_without_guardian']))
            ->assertInertia(fn ($page) => $page->has('schools.data', 0));
    });

    test('the data quality detail page shows every check, passing and failing', function () {
        ['beta' => $beta] = seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.data-quality.show', $beta))->assertInertia(fn ($page) => $page
            ->component('ministry/data-quality-show')
            ->where('school.name', 'Beta Academy')
            ->has('checks', 7)
            ->where('checks', fn ($checks) => collect($checks)->firstWhere('key', 'no_grades_this_term')['passes'] === false
                && collect($checks)->firstWhere('key', 'no_current_term')['passes'] === true));
    });

    test('a school with no data yet redirects to its page instead of a broken breakdown', function () {
        ['invited' => $invited] = seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.data-quality.show', $invited))
            ->assertRedirect(route('schools.show', $invited));
    });

    test('guests are redirected to the ministry login from a data quality breakdown', function () {
        ['beta' => $beta] = seedMinistryScenario();

        $this->get(route('ministry.data-quality.show', $beta))->assertRedirect(route('login'));
    });
});

describe('school drill-down', function () {
    test('an active school shows its own numbers and none from other schools', function () {
        ['alpha' => $alpha] = seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('schools.show', $alpha))->assertInertia(fn ($page) => $page
            ->component('schools/show')
            ->where('overview.metrics.students_active', 4)
            ->where('overview.metrics.attendance_rate', 75)
            ->where('overview.metrics.average_score', 45)
            ->has('overview.enrolment_by_class', 0)
            ->where('overview.flags', []));
    });

    test('a school that has not activated has no overview', function () {
        ['invited' => $invited] = seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('schools.show', $invited))->assertInertia(fn ($page) => $page
            ->where('overview', null));
    });

    test('a school\'s flags are listed on its page', function () {
        ['beta' => $beta] = seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('schools.show', $beta))->assertInertia(fn ($page) => $page
            ->where('overview.flags.0.key', 'low_attendance'));
    });
});

describe('reports', function () {
    test('the reports page lists every report', function () {
        $this->actingAs($this->ministryUser)->get(route('ministry.reports.index'))->assertInertia(fn ($page) => $page
            ->component('ministry/reports')
            ->has('reports', 7));
    });

    test('a report downloads as CSV with a row per active school', function () {
        Excel::fake();
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.reports.download', 'staffing'))->assertOk();

        Excel::assertDownloaded('staffing-'.now()->toDateString().'.csv', fn (SchoolReportExport $export) => $export->collection()->pluck('name')->sort()->values()->all() === ['Alpha College', 'Beta Academy']
            && in_array('Students per teacher', $export->headings(), true));
    });

    test('a report honours the same filters as the pages', function () {
        Excel::fake();
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.reports.download', ['report' => 'enrolment', 'lga' => 'surulere']))->assertOk();

        Excel::assertDownloaded('enrolment-'.now()->toDateString().'.csv', fn (SchoolReportExport $export) => $export->collection()->pluck('name')->all() === ['Beta Academy']);
    });

    test('the watchlist report lists the reasons a school was flagged', function () {
        Excel::fake();
        seedMinistryScenario();

        $this->actingAs($this->ministryUser)->get(route('ministry.reports.download', 'watchlist'))->assertOk();

        Excel::assertDownloaded('watchlist-'.now()->toDateString().'.csv', function (SchoolReportExport $export) {
            $rows = $export->collection();

            return $rows->pluck('name')->all() === ['Beta Academy']
                && str_contains($export->map($rows->first())[4], 'Attendance is 50%');
        });
    });

    test('an unknown report is not found', function () {
        $this->actingAs($this->ministryUser)->get(route('ministry.reports.download', 'payroll'))->assertNotFound();
    });
});
