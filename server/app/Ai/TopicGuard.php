<?php

namespace App\Ai;

/**
 * Deterministic gate in front of the assistant. It refuses, without ever
 * calling the model, the first message of a conversation when it is about
 * neither the school's records nor the application itself (general
 * knowledge, weather, coding...), and any message probing how the system is
 * built (schema, SQL, prompts). It is a first line of defence; the
 * assistant's instructions repeat the same limits for everything that gets
 * through, including follow-ups.
 *
 * The gate is deliberately generous. A wrongly refused question is the worse
 * failure of the two: the model refuses off-topic questions on its own, but
 * nothing recovers a real question the gate never passed on.
 */
class TopicGuard
{
    public const REFUSAL = 'I can only help with questions about your school\'s students, teachers, classes, attendance and grades, or with finding your way around the platform. '
        .'For example: "How many students are in JSS 1A?" or "Where do I record grades?"';

    /**
     * Words that mean the user is asking about how the system works.
     */
    protected const PROBING = '/\b(database|schema|sql|system prompt|your (prompt|instructions|rules)|(table|column|field) names?|(which|what|list|show) (the )?(tables|columns)|ignore (all |your |the |previous |prior )*instructions|api keys?|passwords?|env(ironment)? file)\b/i';

    /**
     * Vocabulary of the school domain.
     */
    protected const DOMAIN = '/\b(students?|pupils?|learners?|teachers?|staff|tutors?|class(es)?|classroom|attend\w*|present|absent|late|excused|grades?|graded|scores?|marks?|results?|exams?|tests?|assessments?|subjects?|terms?|sessions?|guardians?|parents?|enrol\w*|admission|admitted|school|leave|birthdays?|gender|boys?|girls?|performance|performing|perform|best|top|worst|lowest|highest|average|rank(ing)?|report|jss|sss?|primary|nursery|basic)\b|\b\d\s?[a-z]\b|\b[a-z]{1,3}\s?\d[a-z]?\b/i';

    /**
     * Vocabulary of the product itself: the pages, and the things you do on
     * them. Without these, "take me to the watchlist" and "what does coverage
     * mean" were refused before the assistant ever saw them.
     */
    protected const PRODUCT = '/\b(watchlist|coverage|data[- ]quality|audit|announcements?|export\w*|download\w*|csv|dashboard|overview|portal|pages?|geography|onboard\w*|invit\w*|team|accounts?|settings?|profile|roster|navigate|assistant|numbers?|figures?|charts?|tables?)\b/i';

    /**
     * Ways of asking to be shown around, or to be told about what is already
     * on screen. These carry no domain word of their own.
     */
    protected const INTENT = '/\b(how (do|can|would|should) i|where (do|can|should) i|where is the|where are the|take me to|go to|open the|show me the|explain (this|that|these|those|it|the)|summari[sz]e (this|that|these|those|it)|what does (this|that|it|the)|what can you (do|help))\b/i';

    protected const GREETING = '/^\s*(hi|hello|hey|thanks|thank you|good (morning|afternoon|evening)|help|what can you (do|help)|who are you)\b/i';

    /**
     * The canned reply for a message that is out of scope.
     */
    public function refusal(): string
    {
        return static::REFUSAL;
    }

    /**
     * @param  bool  $isFollowUp  Whether the message continues an existing conversation.
     * @param  bool  $answersQuestion  Whether the assistant's last message asked the user a question.
     */
    public function allows(string $message, bool $isFollowUp = false, bool $answersQuestion = false): bool
    {
        if (preg_match(static::PROBING, $message)) {
            return false;
        }

        // Inside a conversation the message is judged by what came before it
        // ("put them in a chart" means nothing on its own), which a word list
        // cannot do. The assistant's own instructions refuse off-topic
        // questions there; only probing is still stopped up front.
        if ($isFollowUp || $answersQuestion) {
            return true;
        }

        return (bool) (preg_match(static::DOMAIN, $message)
            || preg_match(static::PRODUCT, $message)
            || preg_match(static::INTENT, $message)
            || preg_match(static::GREETING, $message));
    }
}
