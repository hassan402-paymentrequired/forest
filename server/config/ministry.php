<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Monitoring thresholds
    |--------------------------------------------------------------------------
    |
    | The ministry portal flags a school on the watchlist when it crosses one
    | of these lines. They are policy decisions, so they live here rather than
    | in code.
    |
    */

    'thresholds' => [
        // Term attendance rate (percent) below which a school is flagged.
        'attendance_rate' => (float) env('MINISTRY_ATTENDANCE_THRESHOLD', 75),

        // Active students per active teacher above which a school is understaffed.
        'student_teacher_ratio' => (float) env('MINISTRY_RATIO_THRESHOLD', 35),

        // Term pass rate (percent) below which a school is flagged.
        'pass_rate' => (float) env('MINISTRY_PASS_RATE_THRESHOLD', 50),

        // Days without any attendance being recorded before a school is stale.
        'stale_days' => (int) env('MINISTRY_STALE_DAYS', 14),
    ],

    // Most schools that can be compared side by side.
    'comparison_limit' => 5,

];
