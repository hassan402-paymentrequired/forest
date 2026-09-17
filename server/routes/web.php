<?php

use App\Http\Controllers\AcademicSessionController;
use App\Http\Controllers\AcademicTermController;
use App\Http\Controllers\AiChatController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Auth\SchoolAuthenticatedSessionController;
use App\Http\Controllers\ClassTeacherAssignmentController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\GuardianController;
use App\Http\Controllers\SchoolClassController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\SchoolInvitationController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TeacherController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Ministry portal
Route::middleware(['auth', 'verified'])->prefix('ministry')->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::resource('schools', SchoolController::class)->only(['index', 'store']);
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

    Route::inertia('dashboard', 'school/dashboard')->name('school.dashboard');

    Route::resource('teachers', TeacherController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('classes', SchoolClassController::class)->only(['index', 'show', 'store', 'update', 'destroy'])
        ->parameters(['classes' => 'class']);
    Route::post('classes/{class}/teacher', [ClassTeacherAssignmentController::class, 'store'])->name('classes.teacher.store');
    Route::delete('classes/{class}/teacher', [ClassTeacherAssignmentController::class, 'destroy'])->name('classes.teacher.destroy');
    Route::resource('students', StudentController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('students/export', [StudentController::class, 'export'])->name('students.export');
    Route::post('students/import', [StudentController::class, 'import'])->name('students.import');
    Route::resource('guardians', GuardianController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('guardians/export', [GuardianController::class, 'export'])->name('guardians.export');
    Route::post('guardians/import', [GuardianController::class, 'import'])->name('guardians.import');

    Route::resource('academic-sessions', AcademicSessionController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::post('academic-sessions/{academic_session}/terms', [AcademicTermController::class, 'store'])->name('academic-terms.store');
    Route::put('academic-terms/{academic_term}', [AcademicTermController::class, 'update'])->name('academic-terms.update');
    Route::delete('academic-terms/{academic_term}', [AcademicTermController::class, 'destroy'])->name('academic-terms.destroy');
    Route::post('academic-terms/{academic_term}/current', [AcademicTermController::class, 'markCurrent'])->name('academic-terms.mark-current');

    Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index');
    Route::post('attendance', [AttendanceController::class, 'store'])->name('attendance.store');

    Route::resource('subjects', SubjectController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::get('grades', [GradeController::class, 'index'])->name('grades.index');
    Route::post('grades', [GradeController::class, 'store'])->name('grades.store');

    Route::get('ai/chat', [AiChatController::class, 'index'])->name('ai.chat');
    Route::post('ai/chat/threads', [AiChatController::class, 'store'])->name('ai.chat.threads.store');
    Route::put('ai/chat/threads/{thread}', [AiChatController::class, 'update'])->name('ai.chat.threads.update');
    Route::delete('ai/chat/threads/{thread}', [AiChatController::class, 'destroy'])->name('ai.chat.threads.destroy');
    Route::post('ai/chat/threads/{thread}/respond', [AiChatController::class, 'respond'])->name('ai.chat.threads.respond');
});

require __DIR__.'/settings.php';
