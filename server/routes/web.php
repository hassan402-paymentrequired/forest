<?php

use App\Http\Controllers\AcademicSessionController;
use App\Http\Controllers\AcademicTermController;
use App\Http\Controllers\AiChatController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Auth\SchoolAuthenticatedSessionController;
use App\Http\Controllers\ClassTeacherAssignmentController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\GuardianController;
use App\Http\Controllers\Ministry\AnnouncementController;
use App\Http\Controllers\Ministry\AssistantController;
use App\Http\Controllers\Ministry\AttendanceMonitorController;
use App\Http\Controllers\Ministry\AuditLogController;
use App\Http\Controllers\Ministry\CoverageController;
use App\Http\Controllers\Ministry\DashboardController;
use App\Http\Controllers\Ministry\DataQualityController;
use App\Http\Controllers\Ministry\EnrolmentController;
use App\Http\Controllers\Ministry\GeographyController;
use App\Http\Controllers\Ministry\PerformanceController;
use App\Http\Controllers\Ministry\ReportController;
use App\Http\Controllers\Ministry\StaffingController;
use App\Http\Controllers\Ministry\TeamController;
use App\Http\Controllers\Ministry\WatchlistController;
use App\Http\Controllers\SchoolAnnouncementController;
use App\Http\Controllers\SchoolClassController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\SchoolDashboardController;
use App\Http\Controllers\SchoolInvitationController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TeacherController;
use App\Http\Middleware\EnsureMinistryUserIsActive;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Ministry portal
Route::middleware(['auth', 'verified', EnsureMinistryUserIsActive::class])->prefix('ministry')->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::resource('schools', SchoolController::class)->only(['index', 'show', 'store', 'update']);
    Route::post('schools/{school}/suspend', [SchoolController::class, 'suspend'])->name('schools.suspend');
    Route::post('schools/{school}/reactivate', [SchoolController::class, 'reactivate'])->name('schools.reactivate');
    Route::post('schools/{school}/resend-invitation', [SchoolController::class, 'resendInvitation'])->name('schools.resend-invitation');

    Route::name('ministry.')->group(function () {
        Route::get('enrolment', [EnrolmentController::class, 'index'])->name('enrolment');
        Route::get('staffing', [StaffingController::class, 'index'])->name('staffing');
        Route::get('attendance', [AttendanceMonitorController::class, 'index'])->name('attendance');
        Route::get('performance', [PerformanceController::class, 'index'])->name('performance');
        Route::get('coverage', [CoverageController::class, 'index'])->name('coverage');
        Route::get('geography', [GeographyController::class, 'index'])->name('geography');
        Route::get('data-quality', [DataQualityController::class, 'index'])->name('data-quality');
        Route::get('data-quality/{school}', [DataQualityController::class, 'show'])->name('data-quality.show');
        Route::get('watchlist', [WatchlistController::class, 'index'])->name('watchlist');

        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/{report}/download', [ReportController::class, 'download'])->name('reports.download');

        Route::get('assistant', [AssistantController::class, 'index'])->name('assistant');
        Route::post('assistant/threads', [AssistantController::class, 'store'])->name('assistant.threads.store');
        Route::put('assistant/threads/{thread}', [AssistantController::class, 'update'])->name('assistant.threads.update');
        Route::post('assistant/threads/{thread}/respond', [AssistantController::class, 'respond'])->name('assistant.threads.respond');

        Route::get('team', [TeamController::class, 'index'])->name('team.index');
        Route::post('team', [TeamController::class, 'store'])->name('team.store');
        Route::patch('team/{ministryUser}/status', [TeamController::class, 'updateStatus'])->name('team.status.update');

        Route::get('audit-log', [AuditLogController::class, 'index'])->name('audit-log');

        Route::get('announcements', [AnnouncementController::class, 'index'])->name('announcements.index');
        Route::post('announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
        Route::patch('announcements/{announcement}/archive', [AnnouncementController::class, 'archive'])->name('announcements.archive');
    });
});

// School portal
Route::middleware('guest:school')->group(function () {
    Route::get('login', [SchoolAuthenticatedSessionController::class, 'create'])->name('school.login');
    Route::post('login', [SchoolAuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('school.login.store');

    Route::get('school-invitations/{invitation:token}', [SchoolInvitationController::class, 'create'])
        ->name('school-invitations.create');
    Route::post('school-invitations/{invitation:token}', [SchoolInvitationController::class, 'store'])
        ->name('school-invitations.store');
});

Route::middleware('auth:school')->group(function () {
    Route::post('logout', [SchoolAuthenticatedSessionController::class, 'destroy'])->name('school.logout');

    Route::get('dashboard', SchoolDashboardController::class)->name('school.dashboard');

    Route::get('teachers/search', [TeacherController::class, 'search'])->name('teachers.search');
    Route::resource('teachers', TeacherController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('teachers/{teacher}/status', [TeacherController::class, 'updateStatus'])->name('teachers.status.update');
    Route::resource('classes', SchoolClassController::class)->only(['index', 'show', 'store', 'update'])
        ->parameters(['classes' => 'class']);
    Route::patch('classes/{class}/status', [SchoolClassController::class, 'updateStatus'])->name('classes.status.update');
    Route::post('classes/{class}/teacher', [ClassTeacherAssignmentController::class, 'store'])->name('classes.teacher.store');
    Route::get('students/export', [StudentController::class, 'export'])->name('students.export');
    Route::get('students/search', [StudentController::class, 'search'])->name('students.search');
    Route::post('students/import', [StudentController::class, 'import'])->name('students.import');
    Route::get('students/{student}/attendance', [StudentController::class, 'attendance'])->name('students.attendance');
    Route::get('students/{student}/grades', [StudentController::class, 'grades'])->name('students.grades');
    Route::resource('students', StudentController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('students/{student}/status', [StudentController::class, 'updateStatus'])->name('students.status.update');
    Route::get('guardians/export', [GuardianController::class, 'export'])->name('guardians.export');
    Route::post('guardians/import', [GuardianController::class, 'import'])->name('guardians.import');
    Route::resource('guardians', GuardianController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('guardians/{guardian}/status', [GuardianController::class, 'updateStatus'])->name('guardians.status.update');

    Route::resource('academic-sessions', AcademicSessionController::class)->only(['index', 'store', 'update']);
    Route::post('academic-sessions/{academic_session}/terms', [AcademicTermController::class, 'store'])->name('academic-terms.store');
    Route::put('academic-terms/{academic_term}', [AcademicTermController::class, 'update'])->name('academic-terms.update');
    Route::post('academic-terms/{academic_term}/current', [AcademicTermController::class, 'markCurrent'])->name('academic-terms.mark-current');

    Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index');
    Route::post('attendance', [AttendanceController::class, 'store'])->name('attendance.store');

    Route::resource('subjects', SubjectController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('subjects/{subject}/status', [SubjectController::class, 'updateStatus'])->name('subjects.status.update');

    Route::get('grades', [GradeController::class, 'index'])->name('grades.index');
    Route::post('grades', [GradeController::class, 'store'])->name('grades.store');

    Route::get('announcements', [SchoolAnnouncementController::class, 'index'])->name('school.announcements.index');
    Route::post('announcements/{announcement}/read', [SchoolAnnouncementController::class, 'markRead'])->name('school.announcements.read');

    Route::get('ai/chat', [AiChatController::class, 'index'])->name('ai.chat');
    Route::post('ai/chat/threads', [AiChatController::class, 'store'])->name('ai.chat.threads.store');
    Route::put('ai/chat/threads/{thread}', [AiChatController::class, 'update'])->name('ai.chat.threads.update');
    Route::delete('ai/chat/threads/{thread}', [AiChatController::class, 'destroy'])->name('ai.chat.threads.destroy');
    Route::post('ai/chat/threads/{thread}/respond', [AiChatController::class, 'respond'])->name('ai.chat.threads.respond');
});

require __DIR__.'/settings.php';
