<?php

namespace App\Ai\Product;

use App\Ai\Query\QueryScope;

/**
 * The curated, model-facing description of the pages the assistant may send
 * someone to. It is the product counterpart of `SchemaCatalog`: that one says
 * what the assistant can read, this one says what the application can do.
 *
 * Keys are route names, so a page the model names always resolves to a real
 * URL and a page that no longer exists fails loudly in the tests rather than
 * becoming an invented link in a reply.
 */
class PageCatalog
{
    /**
     * @return array<string, array{title: string, answers: string, actions: list<string>}>
     */
    public function ministryPages(): array
    {
        return [
            'dashboard' => [
                'title' => 'Overview',
                'answers' => 'The headline numbers across all schools, the attendance trend, and the schools needing attention.',
                'actions' => [],
            ],
            'ministry.enrolment' => [
                'title' => 'Enrolment',
                'answers' => 'Students by status, enrolment per session, and where the students are.',
                'actions' => ['Filter by LGA, district, school type or status'],
            ],
            'ministry.staffing' => [
                'title' => 'Staffing',
                'answers' => 'Student to teacher ratios, teachers on leave, and the classes and subjects with nobody assigned.',
                'actions' => ['Filter by LGA, district, school type or status'],
            ],
            'ministry.attendance' => [
                'title' => 'Attendance',
                'answers' => 'The attendance rate across schools, its weekly trend, the present and absent split, and the weakest schools.',
                'actions' => ['Filter by LGA, district, school type or status'],
            ],
            'ministry.performance' => [
                'title' => 'Performance',
                'answers' => 'The grade spread, subject averages, and a ranking of schools by results.',
                'actions' => ['Filter by LGA, district, school type or status'],
            ],
            'ministry.coverage' => [
                'title' => 'Coverage',
                'answers' => 'Which classes and subjects each school offers, and the subjects few schools cover.',
                'actions' => ['Filter by LGA, district, school type or status'],
            ],
            'ministry.geography' => [
                'title' => 'Geography',
                'answers' => 'The same headline numbers rolled up by LGA and by education district.',
                'actions' => ['See which schools have no location recorded'],
            ],
            'ministry.data-quality' => [
                'title' => 'Data quality',
                'answers' => 'The schools with gaps in what they record, and which gaps.',
                'actions' => ['Filter by the kind of gap', 'Open one school for the full breakdown'],
            ],
            'ministry.watchlist' => [
                'title' => 'Watchlist',
                'answers' => 'The schools at risk and which rule each one tripped. It is worked out from the current numbers, not a list anyone edits.',
                'actions' => ['Filter by the rule that was tripped'],
            ],
            'ministry.reports.index' => [
                'title' => 'Reports',
                'answers' => 'The reports the ministry can download as CSV.',
                'actions' => ['Download a report, narrowed by the same filters as the pages'],
            ],
            'schools.index' => [
                'title' => 'Schools',
                'answers' => 'Every school the ministry has invited, with its invitation status.',
                'actions' => ['Invite a school', 'Open a school', 'Suspend or reactivate a school', 'Resend an invitation'],
            ],
            'ministry.announcements.index' => [
                'title' => 'Announcements',
                'answers' => 'The announcements the ministry has sent, and who has read them.',
                'actions' => ['Send an announcement to every active school or a chosen few', 'Archive an announcement'],
            ],
            'ministry.team.index' => [
                'title' => 'Team',
                'answers' => "The ministry's own staff accounts.",
                'actions' => ['Add a staff account', 'Deactivate or reactivate one'],
            ],
            'ministry.audit-log' => [
                'title' => 'Audit log',
                'answers' => 'Who did what in the ministry portal, newest first.',
                'actions' => [],
            ],
        ];
    }

    /**
     * @return array<string, array{title: string, answers: string, actions: list<string>}>
     */
    public function schoolPages(): array
    {
        return [
            'school.dashboard' => [
                'title' => 'Overview',
                'answers' => "The school's headline counts, attendance, grade performance, and what needs attention.",
                'actions' => [],
            ],
            'students.index' => [
                'title' => 'Students',
                'answers' => "The school's student directory.",
                'actions' => ['Add or edit a student', 'Change a student\'s status', 'Import or export students', 'Open a student for their attendance and grades'],
            ],
            'teachers.index' => [
                'title' => 'Teachers',
                'answers' => "The school's teacher directory.",
                'actions' => ['Add or edit a teacher', 'Change a teacher\'s status', 'Open a teacher for their classes and subjects'],
            ],
            'classes.index' => [
                'title' => 'Classes',
                'answers' => "The school's class directory.",
                'actions' => ['Add or edit a class', 'Change a class\'s status', 'Assign the class teacher'],
            ],
            'subjects.index' => [
                'title' => 'Subjects',
                'answers' => "The school's subject directory.",
                'actions' => ['Add or edit a subject', 'Open a subject for its teachers and grade history'],
            ],
            'guardians.index' => [
                'title' => 'Guardians',
                'answers' => 'The parents and guardians on record and the students in their care.',
                'actions' => ['Add or edit a guardian', 'Import or export guardians'],
            ],
            'attendance.index' => [
                'title' => 'Attendance',
                'answers' => 'A class roster for a given date, ready to mark attendance.',
                'actions' => ['Mark attendance for a class on a date'],
            ],
            'grades.index' => [
                'title' => 'Grades',
                'answers' => 'A class roster for a given subject, ready to record grades.',
                'actions' => ['Record continuous assessment and exam scores'],
            ],
            'academic-sessions.index' => [
                'title' => 'Academic sessions',
                'answers' => "The school's academic sessions and their terms.",
                'actions' => ['Add a session or term', 'Mark a term as the current one'],
            ],
            'school.announcements.index' => [
                'title' => 'Announcements',
                'answers' => "The ministry's announcements to this school, unread first.",
                'actions' => [],
            ],
        ];
    }

    /**
     * The pages available in the portal this scope belongs to.
     *
     * @return array<string, array{title: string, answers: string, actions: list<string>}>
     */
    public function pagesFor(QueryScope $scope): array
    {
        return $scope->schoolId === null ? $this->ministryPages() : $this->schoolPages();
    }

    /**
     * Whether a scope's portal has the named page.
     */
    public function has(QueryScope $scope, string $page): bool
    {
        return array_key_exists($page, $this->pagesFor($scope));
    }

    /**
     * The page names the model may pass to `navigate_to_page`.
     *
     * @return list<string>
     */
    public function names(QueryScope $scope): array
    {
        return array_keys($this->pagesFor($scope));
    }

    /**
     * Every page as a resolved link, for the chat to draw with.
     *
     * @return array<string, array{title: string, url: string}>
     */
    public function links(QueryScope $scope): array
    {
        $links = [];

        foreach ($this->pagesFor($scope) as $name => $page) {
            $links[$name] = ['title' => $page['title'], 'url' => route($name)];
        }

        return $links;
    }

    /**
     * Render the catalog as text for the model.
     */
    public function describe(QueryScope $scope): string
    {
        $lines = [];

        foreach ($this->pagesFor($scope) as $name => $page) {
            $lines[] = "  - {$name} ({$page['title']}): {$page['answers']}";

            if ($page['actions'] !== []) {
                $lines[] = '    There you can: '.implode('; ', $page['actions']).'.';
            }
        }

        return implode("\n", $lines);
    }
}
