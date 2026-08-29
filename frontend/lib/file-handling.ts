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

// Plain-text formats have no magic number for fileTypeFromBuffer to sniff —
// file-type's own docs confirm text-based formats can never be detected by
// content, only binary ones (images, PDF, the zip-based .xlsx). Extension is
// the only signal available for these, so they're checked separately below
// instead of being run through (and always failing) content sniffing.
const TEXT_BASED_EXTENSIONS: Record<string, string> = {
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
}

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

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
  if (extension in TEXT_BASED_EXTENSIONS) {
    return { isValid: true }
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
 * Reads a file into a base64 data URL client-side. Spreadsheet attachments
 * are deferred this way rather than uploaded immediately — the actual upload
 * happens server-side in /api/chat, bundled together with the chat message
 * text in one call to engine's /chat/threads/{id}/respond. This is what lets
 * engine's insufficient-data fallback (LLM reads the raw data directly when
 * it doesn't match the model's expected columns) actually get used, instead
 * of the file being rejected at attach-time before the user even sends
 * their message.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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
        // Carried as a data URL until send-time — /api/chat decodes it
        // server-side and forwards it to engine bundled with the message.
        const dataUrl = await fileToDataUrl(file)
        attachments.push(createAttachment(file, dataUrl))
      } else {
        // No durable file storage yet for non-spreadsheet types — engine's
        // pipeline only understands CSV/XLSX, so there's nothing to send;
        // shown in chat history by name only.
        attachments.push(createAttachment(file, ""))
      }
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
