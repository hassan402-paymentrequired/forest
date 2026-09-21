<?php

namespace App\Ai;

/**
 * The topic guard for the ministry's assistant: same probing defence, but
 * the domain is the whole school system rather than one school.
 */
class MinistryTopicGuard extends TopicGuard
{
    public const REFUSAL = 'I can only help with questions about schools in the system: their students, teachers, classes, attendance and grades. '
        .'For example: "Which schools are understaffed?" or "What is the attendance rate by LGA?"';

    protected const DOMAIN = '/\b(students?|pupils?|learners?|teachers?|staff(ing|ed)?|understaffed|class(es)?|attend\w*|present|absent|late|grades?|graded|scores?|marks?|results?|exams?|subjects?|terms?|sessions?|guardians?|parents?|enrol\w*|admission|schools?|lga|lgas|districts?|areas?|region|leave|performance|performing|perform|best|top|worst|lowest|highest|average|rank(ing)?|compar\w*|report|ratio|jss|sss?|secondary|primary|public|private|invited|suspended|active)\b/i';
}
