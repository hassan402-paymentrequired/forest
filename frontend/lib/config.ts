import {
  BookOpenText,
  GraduationCap,
  Lightbulb,
  Notepad,
} from "@phosphor-icons/react/dist/ssr"

export const NON_AUTH_DAILY_MESSAGE_LIMIT = 5
export const AUTH_DAILY_MESSAGE_LIMIT = 1000
export const REMAINING_QUERY_ALERT_THRESHOLD = 2
export const DAILY_FILE_UPLOAD_LIMIT = 5
export const DAILY_LIMIT_PRO_MODELS = 500

export const NON_AUTH_ALLOWED_MODELS = ["gpt-4.1-nano"]

export const FREE_MODELS_IDS = [
  "openrouter:deepseek/deepseek-r1:free",
  "openrouter:meta-llama/llama-3.3-8b-instruct:free",
  "pixtral-large-latest",
  "mistral-large-latest",
  "gpt-4.1-nano",
]

export const MODEL_DEFAULT = "gpt-4.1-nano"

// Placeholder — the client hasn't picked a final product name yet. Update
// this one line once they do; nothing else in the app should hardcode a name.
export const APP_NAME = "Forest"
export const APP_DOMAIN = "http://localhost:3000"

export const SUGGESTIONS = [
  {
    label: "Understand the prediction",
    highlight: "Explain",
    prompt: `Explain`,
    items: [
      "Explain what our predicted dropout rate means for this school",
      "Explain which factors are driving our school's risk level",
      "Explain how our attendance rate is affecting the prediction",
      "Explain what a healthy teacher-student ratio looks like for us",
    ],
    icon: Lightbulb,
  },
  {
    label: "Plan next steps",
    highlight: "What should we prioritise",
    prompt: `What should we prioritise`,
    items: [
      "What should we prioritise this term to reduce dropout risk?",
      "Give me two or three concrete actions we can take right now",
      "What would improve our infrastructure score fastest?",
      "What's the single biggest risk factor to address first?",
    ],
    icon: Notepad,
  },
  {
    label: "Staffing & budget",
    highlight: "How should we",
    prompt: `How should we`,
    items: [
      "How should we think about our teacher-student ratio?",
      "How should we allocate budget to reduce dropout risk?",
      "Is our current budget allocation adequate for our enrollment?",
      "What staffing changes would have the most impact?",
    ],
    icon: GraduationCap,
  },
  {
    label: "Attendance & retention",
    highlight: "How can we improve",
    prompt: `How can we improve`,
    items: [
      "How can we improve attendance at our school?",
      "How can we reduce the risk of students dropping out?",
      "What attendance rate should we be aiming for?",
      "How does our attendance compare to a healthy benchmark?",
    ],
    icon: BookOpenText,
  },
]

// Not actually used to generate replies — engine builds its own system
// prompt server-side (see engine/app/llm/prompts.py's CHAT_SYSTEM_PROMPT)
// and ignores whatever this computes. Kept only because several components
// still compute/pass it; fixed to not claim an identity that isn't real.
export const SYSTEM_PROMPT_DEFAULT = `You are a thoughtful and clear assistant. Your tone is calm, minimal, and human. You write with intention—never too much, never too little. You avoid clichés, speak simply, and offer helpful, grounded answers. When needed, you ask good questions. You don't try to impress—you aim to clarify. You may use metaphors if they bring clarity, but you stay sharp and sincere. You're here to help the user think clearly and move forward, not to overwhelm or overperform.`

export const MESSAGE_MAX_LENGTH = 10000
