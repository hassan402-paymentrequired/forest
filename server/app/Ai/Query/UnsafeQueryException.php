<?php

namespace App\Ai\Query;

use RuntimeException;

/**
 * Thrown when AI-written SQL is rejected, or fails to run. The message is
 * safe to hand back to the model so it can correct itself.
 */
class UnsafeQueryException extends RuntimeException {}
