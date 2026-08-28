import { toast } from "@/components/ui/toast"
import * as fileType from "file-type"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const SPREADSHEET_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  ...SPREADSHEET_MIME_TYPES,
]

export type Attachment = {
  name: string
  contentType: string
  url: string
}

export async function validateFile(
  file: File
): Promise<{ isValid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  const buffer = await file.arrayBuffer()
  const type = await fileType.fileTypeFromBuffer(
    Buffer.from(buffer.slice(0, 4100))
  )

  if (!type || !ALLOWED_FILE_TYPES.includes(type.mime)) {
    return {
      isValid: false,
      error: "File type not supported or doesn't match its extension",
    }
  }

  return { isValid: true }
}

/**
 * Sends a spreadsheet to engine's clean→predict pipeline (via /api/upload).
 * The resulting prediction is persisted server-side and picked up
 * automatically as grounding context for the next chat reply — see
 * app/api/chat/route.ts's buildGroundedSystemPrompt.
 */
export async function uploadSpreadsheetForPrediction(
  file: File
): Promise<void> {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || "Error uploading file")
  }
}

export function createAttachment(file: File, url: string): Attachment {
  return {
    name: file.name,
    contentType: file.type,
    url,
  }
}

export async function processFiles(
  files: File[],
  _chatId: string,
  _userId: string
): Promise<Attachment[]> {
  const attachments: Attachment[] = []

  for (const file of files) {
    const validation = await validateFile(file)
    if (!validation.isValid) {
      console.warn(`File ${file.name} validation failed:`, validation.error)
      toast({
        title: "File validation failed",
        description: validation.error,
        status: "error",
      })
      continue
    }

    try {
      if (SPREADSHEET_MIME_TYPES.includes(file.type)) {
        await uploadSpreadsheetForPrediction(file)
      }

      // No durable file storage yet — the attachment is shown in the chat
      // history by name only. The spreadsheet's actual content lives on as
      // a Prediction row in engine, which is what grounds the AI's reply.
      attachments.push(createAttachment(file, ""))
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      toast({
        title: "File upload failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        status: "error",
      })
    }
  }

  return attachments
}

export class FileUploadLimitError extends Error {
  code: string
  constructor(message: string) {
    super(message)
    this.code = "DAILY_FILE_LIMIT_REACHED"
  }
}

export async function checkFileUploadLimit(_userId: string) {
  // No daily limit enforced — see the equivalent decision to drop
  // usage/rate-limiting in app/api/chat/route.ts.
  return 0
}
