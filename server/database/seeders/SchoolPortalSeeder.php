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
use Illuminate\Support\Str;

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
     * A spread of schools in other statuses, so the Ministry Schools list —
     * and a suspended/invited show page — both have something to look at.
     */
    private function seedMinistryVariety(MinistryUser $ministryUser): void
    {
        $invited = [
            ['name' => 'Ibadan Grammar School', 'lga' => Lga::Agege, 'district' => EducationDistrict::DistrictI],
            ['name' => 'Festac Comprehensive School', 'lga' => Lga::AmuwoOdofin, 'district' => EducationDistrict::DistrictIV],
            ['name' => 'Epe Community Secondary School', 'lga' => Lga::Epe, 'district' => EducationDistrict::DistrictVI],
        ];

        foreach ($invited as $school) {
            $invitedSchool = School::factory()->for($ministryUser, 'invitedBy')->create([
                'name' => $school['name'],
                'contact_email' => Str::slug($school['name']).'@invited-school.edu.ng',
                'lga' => $school['lga'],
                'education_district' => $school['district'],
            ]);

            SchoolInvitation::factory()->for($invitedSchool)->create([
                'email' => $invitedSchool->contact_email,
            ]);
        }

        $suspended = [
            ['name' => 'Kano International Academy', 'lga' => Lga::Mushin, 'district' => EducationDistrict::DistrictII],
            ['name' => 'Ojo Technical College', 'lga' => Lga::Ojo, 'district' => EducationDistrict::DistrictV],
        ];

        foreach ($suspended as $school) {
            School::factory()->suspended()->for($ministryUser, 'invitedBy')->create([
                'name' => $school['name'],
                'contact_email' => Str::slug($school['name']).'@suspended-school.edu.ng',
                'lga' => $school['lga'],
                'education_district' => $school['district'],
            ]);
        }
    }

    /**
     * A wide spread of active schools around the state, so the ministry's
     * dashboards, rankings, comparisons and watchlist all have real numbers
     * to work with. Each one is a deliberate scenario: understaffed, no
     * current term, no attendance recorded yet, no grades this term, missing
     * guardians, uncovered classes or subjects, and a couple that are simply
     * doing well — so every ministry page has something to show.
     *
     * @return list<School>
     */
    private function seedPeerSchools(MinistryUser $ministryUser): array
    {
        $scenarios = [
            // Understaffed and struggling: flags on the watchlist for both
            // low attendance and a high student-teacher ratio.
            ['name' => 'Surulere Girls Secondary School', 'code' => 'LG-0032', 'lga' => Lga::Surulere, 'district' => EducationDistrict::DistrictII, 'classes' => 3, 'students_per_class' => 15, 'teachers' => 1, 'attendance_rate' => 0.60, 'grade_band' => 'low', 'guardian_coverage' => 1.0, 'class_teacher_coverage' => 1.0, 'subject_teacher_coverage' => 1.0, 'has_current_term' => true],
            // A solid, average school — the middle of every ranking.
            ['name' => 'Ikorodu Comprehensive College', 'code' => 'LG-0013', 'lga' => Lga::Ikorodu, 'district' => EducationDistrict::DistrictIII, 'classes' => 3, 'students_per_class' => 12, 'teachers' => 4, 'attendance_rate' => 0.85, 'grade_band' => 'mid', 'guardian_coverage' => 0.9, 'class_teacher_coverage' => 1.0, 'subject_teacher_coverage' => 1.0, 'has_current_term' => true],
            // Excellent and fully staffed: nothing flagged anywhere.
            ['name' => 'Eti-Osa Royal Academy', 'code' => 'LG-0004', 'lga' => Lga::EtiOsa, 'district' => EducationDistrict::DistrictIV, 'classes' => 3, 'students_per_class' => 10, 'teachers' => 5, 'attendance_rate' => 0.96, 'grade_band' => 'high', 'guardian_coverage' => 1.0, 'class_teacher_coverage' => 1.0, 'subject_teacher_coverage' => 1.0, 'has_current_term' => true],
            // No current academic term set at all.
            ['name' => 'Badagry Community High School', 'code' => 'LG-0041', 'lga' => Lga::Badagry, 'district' => EducationDistrict::DistrictV, 'classes' => 3, 'students_per_class' => 10, 'teachers' => 3, 'attendance_rate' => null, 'grade_band' => null, 'guardian_coverage' => 0.8, 'class_teacher_coverage' => 1.0, 'subject_teacher_coverage' => 1.0, 'has_current_term' => false],
            // Has a current term, but nothing recorded in it yet.
            ['name' => 'Apapa Model School', 'code' => 'LG-0055', 'lga' => Lga::Apapa, 'district' => EducationDistrict::DistrictIV, 'classes' => 2, 'students_per_class' => 9, 'teachers' => 2, 'attendance_rate' => null, 'grade_band' => null, 'guardian_coverage' => 0.9, 'class_teacher_coverage' => 1.0, 'subject_teacher_coverage' => 1.0, 'has_current_term' => true],
            // Attendance is being recorded, grades are not.
            ['name' => 'Mushin Secondary School', 'code' => 'LG-0066', 'lga' => Lga::Mushin, 'district' => EducationDistrict::DistrictII, 'classes' => 2, 'students_per_class' => 10, 'teachers' => 3, 'attendance_rate' => 0.90, 'grade_band' => null, 'guardian_coverage' => 1.0, 'class_teacher_coverage' => 1.0, 'subject_teacher_coverage' => 1.0, 'has_current_term' => true],
            // Everything is recorded except guardians.
            ['name' => 'Kosofe International School', 'code' => 'LG-0077', 'lga' => Lga::Kosofe, 'district' => EducationDistrict::DistrictIII, 'classes' => 2, 'students_per_class' => 11, 'teachers' => 3, 'attendance_rate' => 0.90, 'grade_band' => 'mid', 'guardian_coverage' => 0.0, 'class_teacher_coverage' => 1.0, 'subject_teacher_coverage' => 1.0, 'has_current_term' => true],
            // Classes with nobody in charge this term.
            ['name' => 'Alimosho Grammar School', 'code' => 'LG-0088', 'lga' => Lga::Alimosho, 'district' => EducationDistrict::DistrictI, 'classes' => 4, 'students_per_class' => 12, 'teachers' => 2, 'attendance_rate' => 0.90, 'grade_band' => 'mid', 'guardian_coverage' => 1.0, 'class_teacher_coverage' => 0.0, 'subject_teacher_coverage' => 1.0, 'has_current_term' => true],
            // Subjects and teachers left unmatched to each other.
            ['name' => 'Ikeja Community Secondary School', 'code' => 'LG-0099', 'lga' => Lga::Ikeja, 'district' => EducationDistrict::DistrictI, 'classes' => 2, 'students_per_class' => 10, 'teachers' => 2, 'attendance_rate' => 0.90, 'grade_band' => 'mid', 'guardian_coverage' => 1.0, 'class_teacher_coverage' => 1.0, 'subject_teacher_coverage' => 0.0, 'has_current_term' => true],
            // Another strong, clean school, in a different part of the state.
            ['name' => 'Victoria Island Grammar School', 'code' => 'LG-0110', 'lga' => Lga::LagosIsland, 'district' => EducationDistrict::DistrictIV, 'classes' => 3, 'students_per_class' => 11, 'teachers' => 4, 'attendance_rate' => 0.93, 'grade_band' => 'high', 'guardian_coverage' => 1.0, 'class_teacher_coverage' => 1.0, 'subject_teacher_coverage' => 1.0, 'has_current_term' => true],
        ];

        return array_map(fn (array $scenario) => $this->seedPeerSchool($ministryUser, $scenario), $scenarios);
    }

    /**
     * @param  array{name: string, code: string, lga: Lga, district: EducationDistrict, classes: int, students_per_class: int, teachers: int, attendance_rate: float|null, grade_band: string|null, guardian_coverage: float, class_teacher_coverage: float, subject_teacher_coverage: float, has_current_term: bool}  $scenario
     */
    private function seedPeerSchool(MinistryUser $ministryUser, array $scenario): School
    {
        $school = School::factory()->active()->for($ministryUser, 'invitedBy')->create([
            'name' => $scenario['name'],
            'code' => $scenario['code'],
            'contact_email' => Str::slug($scenario['name']).'@peer-school.edu.ng',
            'level' => SchoolLevel::Combined,
            'lga' => $scenario['lga'],
            'education_district' => $scenario['district'],
        ]);

        $subjects = $this->seedSubjects($school);
        $classes = collect(range(1, $scenario['classes']))
            ->map(fn (int $number) => SchoolClass::factory()->for($school)->create(['name' => "JSS {$number}A"]));
        $teachers = Teacher::factory()->for($school)->count($scenario['teachers'])->create();

        $teachersBySubject = [];
        if ($teachers->isNotEmpty() && $scenario['subject_teacher_coverage'] > 0) {
            $staffedSubjects = $subjects->shuffle()->take((int) round($subjects->count() * $scenario['subject_teacher_coverage']));

            foreach ($staffedSubjects->values() as $index => $subject) {
                $teacher = $teachers[$index % $teachers->count()];
                $teacher->subjects()->attach($subject->id);
                $teachersBySubject[$subject->id][] = $teacher;
            }
        }

        if (! $scenario['has_current_term']) {
            $session = AcademicSession::factory()->for($school)->create(['name' => '2025/2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31']);
            $term = AcademicTerm::factory()->for($school)->for($session, 'academicSession')->create([
                'name' => TermName::ThirdTerm,
                'start_date' => '2026-04-01',
                'end_date' => '2026-07-20',
            ]);

            $students = $classes->flatMap(function (SchoolClass $class) use ($school, $session, $scenario): Collection {
                $students = Student::factory()->for($school)->count($scenario['students_per_class'])->create();

                $students->each(fn (Student $student) => Enrollment::factory()->for($school)->create([
                    'student_id' => $student->id,
                    'school_class_id' => $class->id,
                    'academic_session_id' => $session->id,
                ]));

                return $students;
            });

            $this->attachGuardians($school, $students, $scenario['guardian_coverage']);

            return $school;
        }

        $session = AcademicSession::factory()->for($school)->create(['name' => '2026/2027', 'start_date' => '2026-09-01', 'end_date' => '2027-07-31']);
        $term = AcademicTerm::factory()->for($school)->for($session, 'academicSession')->current()->create([
            'name' => TermName::FirstTerm,
            'start_date' => '2026-09-08',
            'end_date' => '2026-12-12',
        ]);

        if ($teachers->isNotEmpty() && $scenario['class_teacher_coverage'] > 0) {
            $coveredClasses = $classes->shuffle()->take((int) round($classes->count() * $scenario['class_teacher_coverage']));

            foreach ($coveredClasses->values() as $index => $class) {
                ClassTeacherAssignment::factory()->for($school)->create([
                    'school_class_id' => $class->id,
                    'teacher_id' => $teachers[$index % $teachers->count()]->id,
                    'academic_term_id' => $term->id,
                ]);
            }
        }

        $attendanceDates = $scenario['attendance_rate'] !== null ? $this->recentSchoolDays($term, 5) : [];
        $gradeRange = match ($scenario['grade_band']) {
            'low' => ['ca' => [5, 15], 'exam' => [10, 25]],
            'mid' => ['ca' => [18, 28], 'exam' => [28, 42]],
            'high' => ['ca' => [30, 40], 'exam' => [45, 60]],
            default => null,
        };

        $allStudents = collect();

        foreach ($classes as $class) {
            $students = Student::factory()->for($school)->count($scenario['students_per_class'])->create();
            $allStudents = $allStudents->merge($students);

            $classSize = $students->count();
            // A fixed number present each day — who is out rotates by day
            // rather than always being the same students, but the rate
            // itself lands exactly on the target, not just on average.
            $presentCount = $scenario['attendance_rate'] !== null
                ? (int) round($classSize * $scenario['attendance_rate'])
                : 0;

            foreach ($students->values() as $studentIndex => $student) {
                Enrollment::factory()->for($school)->create([
                    'student_id' => $student->id,
                    'school_class_id' => $class->id,
                    'academic_session_id' => $session->id,
                ]);

                foreach ($attendanceDates as $dateIndex => $date) {
                    $isPresent = ($studentIndex + $dateIndex) % $classSize < $presentCount;

                    Attendance::factory()->for($school)->create([
                        'student_id' => $student->id,
                        'school_class_id' => $class->id,
                        'academic_term_id' => $term->id,
                        'date' => $date,
                        'status' => $isPresent ? AttendanceStatus::Present : AttendanceStatus::Absent,
                    ]);
                }

                if ($gradeRange !== null) {
                    foreach ($subjects->random(min(3, $subjects->count())) as $subject) {
                        $teacher = collect($teachersBySubject[$subject->id] ?? [])->first();

                        Grade::factory()->for($school)->create([
                            'student_id' => $student->id,
                            'subject_id' => $subject->id,
                            'school_class_id' => $class->id,
                            'academic_term_id' => $term->id,
                            'teacher_id' => $teacher?->id,
                            'ca_score' => fake()->numberBetween(...$gradeRange['ca']),
                            'exam_score' => fake()->numberBetween(...$gradeRange['exam']),
                        ]);
                    }
                }
            }
        }

        $this->attachGuardians($school, $allStudents, $scenario['guardian_coverage']);

        return $school;
    }

    /**
     * Give a share of the given students a guardian. A `$coverage` of 0
     * leaves every one of them without a guardian on purpose.
     *
     * @param  Collection<int, Student>  $students
     */
    private function attachGuardians(School $school, Collection $students, float $coverage): void
    {
        if ($coverage <= 0 || $students->isEmpty()) {
            return;
        }

        $covered = $students->shuffle()->take((int) round($students->count() * $coverage));
        $guardians = Guardian::factory()->for($school)->count(max(1, (int) ceil($covered->count() / 3)))->create();

        foreach ($covered as $student) {
            $guardians->random()->students()->attach($student->id, [
                'relationship' => fake()->randomElement([
                    GuardianRelationship::Father,
                    GuardianRelationship::Mother,
                    GuardianRelationship::Guardian,
                ])->value,
                'is_primary' => true,
            ]);
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
        // SubjectFactory picks a unique name per call so two subjects at the
        // same school never collide; reset that pool for each new school, or
        // seeding many schools exhausts the shared list of subject names.
        fake()->unique(true);

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
