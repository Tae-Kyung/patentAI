import mammoth from 'mammoth'

/**
 * DOCX 파일에서 텍스트 추출 (mammoth)
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}
