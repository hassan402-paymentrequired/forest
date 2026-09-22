<?php

namespace Database\Seeders;

use App\Enums\AttendanceStatus;
use App\Enums\EducationDistrict;
use App\Enums\GuardianRelationship;
use App\Enums\Lga;
use App\Enums\SchoolLevel;
use App\Enums\SchoolType;
use App\Enums\TermName;
use App\Models\AcademicSession;
use App\Models\AcademicTerm;
use App\Models\Attendance;
use App\Models\ClassTeacherAssignment;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\MinistryUser;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolInvitation;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Seeds a fully fleshed-out demo school (classes, teachers, subjects,
 * students, guardians, enrollments, attendance, and grades) so every show
 * page and table in the school portal has real data to display, plus a
 * couple of extra Ministry-side schools in other statuses for variety.
 */
class SchoolPortalSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $ministryUser = MinistryUser::query()->first() ?? MinistryUser::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $this->seedMinistryVariety($ministryUser);
        $this->seedPeerSchools($ministryUser);

        $school = School::factory()->active()->for($ministryUser, 'invitedBy')->create([
            'name' => 'Lagos Model College',
            'code' => 'LG-0423',
            'contact_email' => 'admin@lagoskool.edu.ng',
            'type' => SchoolType::Public,
            'level' => SchoolLevel::Combined,
            'lga' => Lga::Ikeja,
            'education_district' => EducationDistrict::DistrictI,
            'address' => '1 Allen Avenue, Ikeja',
        ]);

        SchoolUser::factory()->for($school)->create([
            'name' => 'Adaeze Nwosu',
            'email' => 'admin@lagosmodel.edu.ng',
        ]);

        [$pastSession, $pastTerm] = $this->seedPastSession($school);
        [$currentSession, $currentTerm] = $this->seedCurrentSession($school);

        $subjects = $this->seedSubjects($school);
        $classes = $this->seedClasses($school);
        [$teachers, $teachersBySubject] = $this->seedTeachers($school, $subjects);
        $this->seedClassTeacherAssignments($school, $classes, $teachers, $currentTerm);
        $guardians = Guardian::factory()->for($school)->count(20)->create();

        $this->seedStudents(
            $school,
            $classes,
            $guardians,
            $subjects,
            $teachersBySubject,
            $pastSession,
            $pastTerm,
            $currentSession,
            $currentTerm,
        );

        $this->command?->info("Demo school ready: {$school->name}");
        $this->command?->info('Login at /login as a school user with:');
        $this->command?->info('  email: admin@lagosmodel.edu.ng');
        $this->command?->info('  password: password');
    }

    /**
     * A couple of extra schools in other statuses, so the Ministry Schools
     * list and a suspended/invited show page both have something to look at.
     */
    private function seedMinistryVariety(MinistryUser $ministryUser): void
    {
        $invited = School::factory()->for($ministryUser, 'invitedBy')->create([
            'name' => 'Ibadan Grammar School',
            'contact_email' => 'admin@ibadangrammar.edu.ng',
        ]);

        SchoolInvitation::factory()->for($invited)->create([
            'email' => $invited->contact_email,
        ]);

        School::factory()->suspended()->for($ministryUser, 'invitedBy')->create([
            'name' => 'Kano International Academy',
            'contact_email' => 'admin@kanointernational.edu.ng',
        ]);
    }

    /**
     * A few smaller active schools around the state, each with a current term,
     * attendance and grades, so the ministry's dashboards, rankings and
     * watchlist have something to compare the demo school against. They differ
     * on purpose: one is understaffed with poor attendance, one is doing well.
     */
    private function seedPeerSchools(MinistryUser $ministryUser): void
    {
        $peers = [
            ['name' => 'Surulere Girls Secondary School', 'code' => 'LG-0032', 'lga' => Lga::Surulere, 'district' => EducationDistrict::DistrictII, 'type' => SchoolType::Public, 'students' => 45, 'teachers' => 1, 'attendance' => 0.62, 'ca' => 12, 'exam' => 28],
            ['name' => 'Ikorodu Comprehensive College', 'code' => 'LG-0013', 'lga' => Lga::Ikorodu, 'district' => EducationDistrict::DistrictIII, 'type' => SchoolType::Public, 'students' => 24, 'teachers' => 3, 'attendance' => 0.88, 'ca' => 26, 'exam' => 42],
            ['name' => 'Eti-Osa Royal Academy', 'code' => 'LG-0004', 'lga' => Lga::EtiOsa, 'district' => EducationDistrict::DistrictIV, 'type' => SchoolType::Private, 'students' => 16, 'teachers' => 3, 'attendance' => 0.95, 'ca' => 33, 'exam' => 52],
        ];

        foreach ($peers as $index => $peer) {
            $school = School::factory()->active()->for($ministryUser, 'invitedBy')->create([
                'name' => $peer['name'],
                'code' => $peer['code'],
                'contact_email' => 'admin'.($index + 2).'@peer-school.edu.ng',
                'type' => $peer['type'],
                'level' => SchoolLevel::Combined,
                'lga' => $peer['lga'],
                'education_district' => $peer['district'],
            ]);

            $session = AcademicSession::factory()->for($school)->create(['name' => '2026/2027', 'start_date' => '2026-09-01', 'end_date' => '2027-07-31']);
            $term = AcademicTerm::factory()->for($school)->for($session, 'academicSession')->current()->create([
                'name' => TermName::FirstTerm,
                'start_date' => '2026-09-08',
                'end_date' => '2026-12-12',
            ]);

            $class = SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);
            $subject = Subject::factory()->for($school)->create(['name' => 'Mathematics']);
            Teacher::factory()->for($school)->count($peer['teachers'])->create();

            $present = (int) round($peer['students'] * $peer['attendance']);

            Student::factory()->for($school)->count($peer['students'])->create()->each(
                function (Student $student, int $position) use ($school, $session, $term, $class, $subject, $peer, $present): void {
                    Enrollment::factory()->for($school)->create([
                        'student_id' => $student->id,
                        'school_class_id' => $class->id,
                        'academic_session_id' => $session->id,
                    ]);
                    Attendance::factory()->for($school)->create([
                        'student_id' => $student->id,
                        'school_class_id' => $class->id,
                        'academic_term_id' => $term->id,
                        'date' => today(),
                        'status' => $position < $present ? AttendanceStatus::Present : AttendanceStatus::Absent,
                    ]);
                    Grade::factory()->for($school)->create([
                        'student_id' => $student->id,
                        'subject_id' => $subject->id,
                        'school_class_id' => $class->id,
                        'academic_term_id' => $term->id,
                        'ca_score' => min($peer['ca'] + ($position % 6), Grade::CA_MAX),
                        'exam_score' => min($peer['exam'] + ($position % 9), Grade::EXAM_MAX),
                    ]);
                },
            );
        }
    }

    /**
     * @return array{0: AcademicSession, 1: AcademicTerm}
     */
    private function seedPastSession(School $school): array
    {
        $session = AcademicSession::factory()->for($school)->create([
            'name' => '2025/2026',
            'start_date' => '2025-09-01',
            'end_date' => '2026-07-31',
        ]);

        AcademicTerm::factory()->for($school)->for($session, 'academicSession')->create([
            'name' => TermName::FirstTerm,
            'start_date' => '2025-09-08',
            'end_date' => '2025-12-12',
        ]);
        AcademicTerm::factory()->for($school)->for($session, 'academicSession')->create([
            'name' => TermName::SecondTerm,
            'start_date' => '2026-01-05',
            'end_date' => '2026-04-10',
        ]);
        $thirdTerm = AcademicTerm::factory()->for($school)->for($session, 'academicSession')->create([
            'name' => TermName::ThirdTerm,
            'start_date' => '2026-04-27',
            'end_date' => '2026-07-24',
        ]);

        return [$session, $thirdTerm];
    }

    /**
     * @return array{0: AcademicSession, 1: AcademicTerm}
     */
    private function seedCurrentSession(School $school): array
    {
        $session = AcademicSession::factory()->for($school)->create([
            'name' => '2026/2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-07-31',
        ]);

        $currentTerm = AcademicTerm::factory()->for($school)->for($session, 'academicSession')->current()->create([
            'name' => TermName::FirstTerm,
            'start_date' => '2026-09-07',
            'end_date' => '2026-12-11',
        ]);
        AcademicTerm::factory()->for($school)->for($session, 'academicSession')->create([
            'name' => TermName::SecondTerm,
            'start_date' => '2027-01-04',
            'end_date' => '2027-04-09',
        ]);
        AcademicTerm::factory()->for($school)->for($session, 'academicSession')->create([
            'name' => TermName::ThirdTerm,
            'start_date' => '2027-04-26',
            'end_date' => '2027-07-23',
        ]);

        return [$session, $currentTerm];
    }

    /**
     * @return Collection<int, Subject>
     */
    private function seedSubjects(School $school): Collection
    {
        return collect([
            'Mathematics', 'English Language', 'Basic Science', 'Basic Technology',
            'Social Studies', 'Civic Education', 'Agricultural Science', 'Computer Studies',
        ])->map(fn (string $name) => Subject::factory()->for($school)->create(['name' => $name]));
    }

    /**
     * @return Collection<int, SchoolClass>
     */
    private function seedClasses(School $school): Collection
    {
        return collect(['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'SS 1A', 'SS 2A', 'SS 3A'])
            ->map(fn (string $name) => SchoolClass::factory()->for($school)->create(['name' => $name]));
    }

    /**
     * @param  Collection<int, Subject>  $subjects
     * @return array{0: Collection<int, Teacher>, 1: array<string, array<int, Teacher>>}
     */
    private function seedTeachers(School $school, Collection $subjects): array
    {
        $teachers = Teacher::factory()->for($school)->count(10)->create();
        $teachersBySubject = [];

        foreach ($teachers as $teacher) {
            $assignedSubjects = $subjects->random(random_int(1, 2));

            $teacher->subjects()->attach($assignedSubjects->pluck('id'));

            foreach ($assignedSubjects as $subject) {
                $teachersBySubject[$subject->id][] = $teacher;
            }
        }

        return [$teachers, $teachersBySubject];
    }

    /**
     * @param  Collection<int, SchoolClass>  $classes
     * @param  Collection<int, Teacher>  $teachers
     */
    private function seedClassTeacherAssignments(
        School $school,
        Collection $classes,
        Collection $teachers,
        AcademicTerm $currentTerm,
    ): void {
        $teacherPool = $teachers->shuffle()->values();

        foreach ($classes as $index => $class) {
            ClassTeacherAssignment::factory()->for($school)->create([
                'school_class_id' => $class->id,
                'teacher_id' => $teacherPool[$index % $teacherPool->count()]->id,
                'academic_term_id' => $currentTerm->id,
            ]);
        }
    }

    /**
     * @param  Collection<int, SchoolClass>  $classes
     * @param  Collection<int, Guardian>  $guardians
     * @param  Collection<int, Subject>  $subjects
     * @param  array<string, array<int, Teacher>>  $teachersBySubject
     */
    private function seedStudents(
        School $school,
        Collection $classes,
        Collection $guardians,
        Collection $subjects,
        array $teachersBySubject,
        AcademicSession $pastSession,
        AcademicTerm $pastTerm,
        AcademicSession $currentSession,
        AcademicTerm $currentTerm,
    ): void {
        $attendanceDates = $this->recentSchoolDays($currentTerm, 10);

        foreach ($classes as $class) {
            Student::factory()->for($school)->count(8)->create()->each(
                function (Student $student) use (
                    $school, $class, $guardians, $subjects, $teachersBySubject,
                    $pastSession, $pastTerm, $currentSession, $currentTerm, $attendanceDates,
                ) {
                    $hasHistory = fake()->boolean(70);

                    if ($hasHistory) {
                        Enrollment::factory()->for($school)->create([
                            'student_id' => $student->id,
                            'school_class_id' => $class->id,
                            'academic_session_id' => $pastSession->id,
                        ]);
                    }

                    Enrollment::factory()->for($school)->create([
                        'student_id' => $student->id,
                        'school_class_id' => $class->id,
                        'academic_session_id' => $currentSession->id,
                    ]);

                    $studentGuardians = $guardians->random(random_int(1, 2));

                    foreach ($studentGuardians->values() as $index => $guardian) {
                        $guardian->students()->attach($student->id, [
                            'relationship' => fake()->randomElement([
                                GuardianRelationship::Father,
                                GuardianRelationship::Mother,
                                GuardianRelationship::Guardian,
                            ])->value,
                            'is_primary' => $index === 0,
                        ]);
                    }

                    foreach ($attendanceDates as $date) {
                        Attendance::factory()->for($school)->create([
                            'student_id' => $student->id,
                            'school_class_id' => $class->id,
                            'academic_term_id' => $currentTerm->id,
                            'date' => $date,
                            'status' => fake()->randomElement([
                                ...array_fill(0, 17, AttendanceStatus::Present),
                                ...array_fill(0, 2, AttendanceStatus::Absent),
                                AttendanceStatus::Late,
                            ]),
                        ]);
                    }

                    foreach ($subjects->random(5) as $subject) {
                        $this->createGrade($school, $student, $subject, $class, $currentTerm, $teachersBySubject);
                    }

                    if ($hasHistory) {
                        foreach ($subjects->random(3) as $subject) {
                            $this->createGrade($school, $student, $subject, $class, $pastTerm, $teachersBySubject);
                        }
                    }
                },
            );
        }
    }

    /**
     * @param  array<string, array<int, Teacher>>  $teachersBySubject
     */
    private function createGrade(
        School $school,
        Student $student,
        Subject $subject,
        SchoolClass $class,
        AcademicTerm $term,
        array $teachersBySubject,
    ): void {
        $teacher = collect($teachersBySubject[$subject->id] ?? [])->first();

        Grade::factory()->for($school)->create([
            'student_id' => $student->id,
            'subject_id' => $subject->id,
            'school_class_id' => $class->id,
            'academic_term_id' => $term->id,
            'teacher_id' => $teacher?->id,
            'ca_score' => fake()->numberBetween(20, 40),
            'exam_score' => fake()->numberBetween(30, 60),
        ]);
    }

    /**
     * The most recent `$count` weekdays within the term's date range, up to
     * today, oldest first.
     *
     * @return array<int, string>
     */
    private function recentSchoolDays(AcademicTerm $term, int $count): array
    {
        $end = Carbon::now()->min($term->end_date);
        $days = [];
        $cursor = $end->copy();

        while (count($days) < $count && $cursor->greaterThanOrEqualTo($term->start_date)) {
            if (! $cursor->isWeekend()) {
                $days[] = $cursor->toDateString();
            }

            $cursor->subDay();
        }

        return array_reverse($days);
    }
}
