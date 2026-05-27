// Title Extractor - Per-format document title extraction
// Title is display-only metadata (NOT used for search scoring)

// ============================================
// Type Definitions
// ============================================

/**
 * Result of title extraction, including how the title was determined
 */
export interface TitleExtractionResult {
  title: string
  source: 'metadata' | 'content' | 'filename'
}

// ============================================
// Shared Helper
// ============================================

/**
 * Convert a file name to a human-readable title
 * Strips the extension and replaces hyphens/underscores with spaces
 *
 * @param fileName - File name (e.g., "2024-annual-report.pdf")
 * @returns Human-readable title (e.g., "2024 annual report")
 */
export function fileNameToTitle(fileName: string): string {
  // Strip extension (last dot and everything after)
  const lastDotIndex = fileName.lastIndexOf('.')
  const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
  // Replace hyphens and underscores with spaces
  return nameWithoutExt.replace(/[-_]/g, ' ')
}

// ============================================
// Per-Format Extractors
// ============================================

/**
 * Extract title from Markdown content
 * Priority: YAML frontmatter title -> first # H1 -> file name
 *
 * @param text - Markdown content
 * @param fileName - File name for fallback
 * @returns Title extraction result
 */
export function extractMarkdownTitle(text: string, fileName: string): TitleExtractionResult {
  // 1. Try YAML frontmatter
  const frontmatterMatch = text.match(/^---\n[\s\S]*?title:\s*['"]?(.+?)['"]?\s*\n[\s\S]*?---/)
  if (frontmatterMatch?.[1]) {
    return { title: frontmatterMatch[1].trim(), source: 'metadata' }
  }

  // 2. Try first H1 heading
  const h1Match = text.match(/^# (.+)$/m)
  if (h1Match?.[1]) {
    return { title: h1Match[1].trim(), source: 'content' }
  }

  // 3. Fall back to file name
  return { title: fileNameToTitle(fileName), source: 'filename' }
}

/**
 * Extract title from plain text content
 * Priority: first line followed by empty line -> file name
 *
 * @param text - Plain text content
 * @param fileName - File name for fallback
 * @returns Title extraction result
 */
export function extractTxtTitle(text: string, fileName: string): TitleExtractionResult {
  // Try first line followed by empty line
  if (text.length > 0) {
    const lines = text.split('\n')
    const firstLine = lines[0]
    const secondLine = lines[1]
    if (
      firstLine !== undefined &&
      secondLine !== undefined &&
      firstLine.trim().length > 0 &&
      secondLine.trim().length === 0
    ) {
      return { title: firstLine.trim(), source: 'content' }
    }
  }

  // Fall back to file name
  return { title: fileNameToTitle(fileName), source: 'filename' }
}

/**
 * Extract title from HTML content (using Readability title)
 * Priority: readability title -> file name
 *
 * @param readabilityTitle - Title extracted by Readability
 * @param fileName - File name for fallback
 * @returns Title extraction result
 */
export function extractHtmlTitle(
  readabilityTitle: string,
  fileName: string
): TitleExtractionResult {
  if (readabilityTitle && readabilityTitle.trim().length > 0) {
    return { title: readabilityTitle.trim(), source: 'content' }
  }

  // Fall back to file name
  return { title: fileNameToTitle(fileName), source: 'filename' }
}

/**
 * Extract title from PDF metadata or first page chunk text
 * Priority: PDF metadata /Title -> first page chunk 0 text -> file name
 *
 * Rejects metadata titles that look like file paths (contain / or \) or are empty/whitespace-only.
 *
 * @param metadataTitle - PDF metadata /Title value (may be undefined)
 * @param firstPageChunkText - Text of chunk 0 from semantic chunking of page 1 (may be undefined)
 * @param fileName - File name for fallback
 * @param firstPageFontHint - Largest-font text item from page 1 (optional, used for title detection)
 * @returns Title extraction result
 */
export function extractPdfTitle(
  metadataTitle: string | undefined,
  firstPageChunkText: string | undefined,
  fileName: string,
  firstPageFontHint?: { text: string; fontSize: number }
): TitleExtractionResult {
  // 1. Try PDF metadata title (reject file paths and empty values)
  if (metadataTitle && metadataTitle.trim().length > 0) {
    const trimmed = metadataTitle.trim()
    const looksLikeFilePath = trimmed.includes('/') || trimmed.includes('\\')
    if (!looksLikeFilePath) {
      return { title: trimmed, source: 'metadata' }
    }
  }

  // 2. Try largest-font text from page 1 (font size > 14pt indicates title)
  if (
    firstPageFontHint &&
    firstPageFontHint.fontSize > 14 &&
    firstPageFontHint.text.trim().length > 0
  ) {
    return { title: firstPageFontHint.text.trim(), source: 'content' }
  }

  // 3. Try first chunk from page 1 semantic chunking
  if (firstPageChunkText && firstPageChunkText.trim().length > 0) {
    return { title: firstPageChunkText.trim(), source: 'content' }
  }

  // 4. Fall back to file name
  return { title: fileNameToTitle(fileName), source: 'filename' }
}

/**
 * Extract title from DOCX mammoth HTML output
 * Priority: first <h1> from mammoth HTML -> file name
 *
 * @param htmlContent - HTML content generated by mammoth.convertToHtml()
 * @param fileName - File name for fallback
 * @returns Title extraction result
 */
export function extractDocxTitle(htmlContent: string, fileName: string): TitleExtractionResult {
  // Try to find first <h1> tag
  const h1Match = htmlContent.match(/<h1>([\s\S]*?)<\/h1>/)
  if (h1Match?.[1]) {
    const title = h1Match[1].trim()
    if (title.length > 0) {
      return { title, source: 'content' }
    }
  }

  // Fall back to file name
  return { title: fileNameToTitle(fileName), source: 'filename' }
}

/**
 * Extract title from source code files (.ts, .js, .cs)
 *
 * Priority:
 *   1. First meaningful single-line comment at the top of the file
 *      (lines starting with `//` or `#!` shebangs are skipped)
 *   2. First class / interface / function / namespace / module / enum declaration
 *   3. File name
 *
 * @param text - Source code content
 * @param fileName - File name for fallback
 * @returns Title extraction result
 */
export function extractCodeTitle(text: string, fileName: string): TitleExtractionResult {
  // 1. Try first leading single-line comment (ignoring shebangs and blank lines)
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0 || trimmed.startsWith('#!')) continue // skip blanks & shebangs
    const commentMatch = trimmed.match(/^\/\/\s*(.+)/)
    if (commentMatch?.[1]) {
      const candidate = commentMatch[1].trim()
      // Accept reasonably short, non-noisy comments as a title
      if (candidate.length > 0 && candidate.length <= 200 && !candidate.startsWith('=')) {
        return { title: candidate, source: 'content' }
      }
    }
    // Stop scanning once we reach a non-blank, non-comment line
    break
  }

  // 2. Try class / interface / function / namespace / enum declaration
  const declarationMatch = text.match(
    /^[ \t]*(?:(?:public|private|internal|protected|static|abstract|sealed|partial|export|default)\s+)*(?:class|interface|function|enum|namespace|module)\s+([A-Za-z_$][A-Za-z0-9_.$<>, ]*)/m
  )
  if (declarationMatch?.[1]) {
    // Take only the name portion before any generic type parameters.
    // The capture group allows dots so C# dotted namespaces are preserved;
    // generics are trimmed off at the first `<`.
    const simpleName = declarationMatch[1].split('<')[0]?.trim()
    if (simpleName && simpleName.length > 0) {
      return { title: simpleName, source: 'content' }
    }
  }

  // 3. Fall back to file name
  return { title: fileNameToTitle(fileName), source: 'filename' }
}

/**
 * Extract title from YAML files (.yaml, .yml)
 *
 * Priority:
 *   1. Root-level `name:` or `title:` field (first occurrence)
 *   2. File name
 *
 * @param text - YAML content
 * @param fileName - File name for fallback
 * @returns Title extraction result
 */
export function extractYamlTitle(text: string, fileName: string): TitleExtractionResult {
  // Match root-level `name:` or `title:` (not indented, optional quotes)
  const nameMatch = text.match(/^(?:name|title)\s*:\s*['"]?([^'"\n]+?)['"]?\s*$/m)
  if (nameMatch?.[1]) {
    const candidate = nameMatch[1].trim()
    if (candidate.length > 0) {
      return { title: candidate, source: 'content' }
    }
  }

  // Fall back to file name
  return { title: fileNameToTitle(fileName), source: 'filename' }
}

/**
 * Extract title from Dynamics AX export files (.xpo)
 *
 * XPO files are structured text exports from the Dynamics AX AOT.
 * Each file typically exports one or more named objects.
 *
 * Priority:
 *   1. First AOT object name found after keywords like CLASS, TABLE, FORM,
 *      REPORT, QUERY, JOB, ENUM, MENUITEM, INTERFACE, MAP, VIEW
 *      (format: `CLASS #ObjectName`)
 *   2. File name
 *
 * @param text - XPO file content
 * @param fileName - File name for fallback
 * @returns Title extraction result
 */
export function extractXpoTitle(text: string, fileName: string): TitleExtractionResult {
  // Look for AX object declarations: e.g. "  CLASS #SalesFormLetter"
  const objectMatch = text.match(
    /^\s*(?:CLASS|TABLE|FORM|REPORT|QUERY|JOB|ENUM|MENUITEM|INTERFACE|MAP|VIEW|DATATABLE)\s+#(\S+)/im
  )
  if (objectMatch?.[1]) {
    return { title: objectMatch[1].trim(), source: 'content' }
  }

  // Fall back to file name
  return { title: fileNameToTitle(fileName), source: 'filename' }
}
