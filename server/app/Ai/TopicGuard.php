<?php

namespace App\Ai;

/**
 * Deterministic gate in front of the assistant. It refuses, without ever
 * calling the model, questions that are not about the school's own records
 * (general knowledge, weather, coding...) and questions probing how the
 * system is built (schema, SQL, prompts). It is a first line of defence; the
 * assistant's instructions repeat the same limits for what gets through.
 */
class TopicGuard
{
    public const REFUSAL = 'I can only help with questions about your school\'s students, teachers, classes, attendance and grades. '
        .'For example: "How many students are in JSS 1A?" or "What is the average grade for Math?"';

    /**
     * Words that mean the user is asking about how the system works.
     */
    private const PROBING = '/\b(database|schema|sql|system prompt|your (prompt|instructions|rules)|(table|column|field) names?|(which|what|list|show) (the )?(tables|columns)|ignore (all |your |the |previous |prior )*instructions|api keys?|passwords?|env(ironment)? file)\b/i';

    /**
     * Vocabulary of the school domain.
     */
    private const DOMAIN = '/\b(students?|pupils?|learners?|teachers?|staff|tutors?|class(es)?|classroom|attend\w*|present|absent|late|excused|grades?|graded|scores?|marks?|results?|exams?|tests?|assessments?|subjects?|terms?|sessions?|guardians?|parents?|enrol\w*|admission|admitted|school|leave|birthdays?|gender|boys?|girls?|performance|performing|perform|best|top|worst|lowest|highest|average|rank(ing)?|report|jss|sss?|primary|nursery|basic)\b|\b\d\s?[a-z]\b|\b[a-z]{1,3}\s?\d[a-z]?\b/i';

    private const GREETING = '/^\s*(hi|hello|hey|thanks|thank you|good (morning|afternoon|evening)|help|what can you (do|help)|who are you)\b/i';

    private const FOLLOW_UP = '/\b(again|retry|recheck|check|them|they|those|these|it|that|him|her|their|his|same|more|also|and|then|now|only|just|instead|what about|how about|what of)\b/i';

    private const FOLLOW_UP_MAX_WORDS = 8;

    /**
     * @param  bool  $isFollowUp  Whether the message continues an existing conversation.
     * @param  bool  $answersQuestion  Whether the assistant's last message asked the user a question.
     */
    public function allows(string $message, bool $isFollowUp = false, bool $answersQuestion = false): bool
    {
        if (preg_match(self::PROBING, $message)) {
            return false;
        }

        if ($answersQuestion) {
            return true;
        }

        return (bool) (
            preg_match(self::DOMAIN, $message)
            || preg_match(self::GREETING, $message)
            || ($isFollowUp && str_word_count($message) <= self::FOLLOW_UP_MAX_WORDS && preg_match(self::FOLLOW_UP, $message))
        );
    }
}
