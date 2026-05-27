// Title Extractor Unit Tests
// Test Type: Unit Test

import { describe, expect, it } from 'vitest'
import {
  extractCodeTitle,
  extractDocxTitle,
  extractHtmlTitle,
  extractMarkdownTitle,
  extractPdfTitle,
  extractTxtTitle,
  extractXpoTitle,
  extractYamlTitle,
  fileNameToTitle,
} from '../title-extractor.js'

// ============================================
// Tests
// ============================================

describe('Title Extractor', () => {
  // --------------------------------------------
  // fileNameToTitle helper
  // --------------------------------------------
  describe('fileNameToTitle', () => {
    it('should strip extension and replace hyphens/underscores with spaces', () => {
      expect(fileNameToTitle('2024-annual-report.pdf')).toBe('2024 annual report')
    })

    it('should handle file names with multiple dots', () => {
      expect(fileNameToTitle('report.v2.final.pdf')).toBe('report.v2.final')
    })

    it('should handle file names with underscores', () => {
      expect(fileNameToTitle('my_document_title.md')).toBe('my document title')
    })

    it('should handle file names with mixed hyphens and underscores', () => {
      expect(fileNameToTitle('project-plan_v2.txt')).toBe('project plan v2')
    })

    it('should handle file names with no extension', () => {
      expect(fileNameToTitle('README')).toBe('README')
    })
  })

  // --------------------------------------------
  // extractMarkdownTitle
  // --------------------------------------------
  describe('extractMarkdownTitle', () => {
    it('should extract title from YAML frontmatter', () => {
      const text = '---\ntitle: My Document\ndate: 2024-01-01\n---\n\nContent here.'
      const result = extractMarkdownTitle(text, 'test.md')

      expect(result.title).toBe('My Document')
      expect(result.source).toBe('metadata')
    })

    it('should extract title from YAML frontmatter with double quotes', () => {
      const text = '---\ntitle: "My Quoted Document"\n---\n\nContent here.'
      const result = extractMarkdownTitle(text, 'test.md')

      expect(result.title).toBe('My Quoted Document')
      expect(result.source).toBe('metadata')
    })

    it('should extract title from YAML frontmatter with single quotes', () => {
      const text = "---\ntitle: 'My Single Quoted Document'\n---\n\nContent here."
      const result = extractMarkdownTitle(text, 'test.md')

      expect(result.title).toBe('My Single Quoted Document')
      expect(result.source).toBe('metadata')
    })

    it('should extract first H1 heading when no frontmatter', () => {
      const text = '# My Title\n\nContent here.'
      const result = extractMarkdownTitle(text, 'test.md')

      expect(result.title).toBe('My Title')
      expect(result.source).toBe('content')
    })

    it('should prefer frontmatter over H1', () => {
      const text = '---\ntitle: Frontmatter Title\n---\n\n# Heading Title\n\nContent here.'
      const result = extractMarkdownTitle(text, 'test.md')

      expect(result.title).toBe('Frontmatter Title')
      expect(result.source).toBe('metadata')
    })

    it('should fall back to file name when no title found', () => {
      const text = 'Just some plain text without any title markers.'
      const result = extractMarkdownTitle(text, 'my-notes.md')

      expect(result.title).toBe('my notes')
      expect(result.source).toBe('filename')
    })

    it('should return source metadata for frontmatter, content for H1, filename for fallback', () => {
      const frontmatter = extractMarkdownTitle('---\ntitle: Test\n---\n', 'test.md')
      expect(frontmatter.source).toBe('metadata')

      const h1 = extractMarkdownTitle('# Test\n', 'test.md')
      expect(h1.source).toBe('content')

      const fallback = extractMarkdownTitle('no title here', 'test.md')
      expect(fallback.source).toBe('filename')
    })
  })

  // --------------------------------------------
  // extractTxtTitle
  // --------------------------------------------
  describe('extractTxtTitle', () => {
    it('should extract first line as title when followed by empty line', () => {
      const text = 'Document Title\n\nThis is the body text.'
      const result = extractTxtTitle(text, 'document.txt')

      expect(result.title).toBe('Document Title')
      expect(result.source).toBe('content')
    })

    it('should fall back to file name when first line has no empty line after', () => {
      const text = 'Line one\nLine two\nLine three'
      const result = extractTxtTitle(text, 'my-notes.txt')

      expect(result.title).toBe('my notes')
      expect(result.source).toBe('filename')
    })

    it('should fall back to file name for empty text', () => {
      const result = extractTxtTitle('', 'empty-file.txt')

      expect(result.title).toBe('empty file')
      expect(result.source).toBe('filename')
    })
  })

  // --------------------------------------------
  // extractHtmlTitle
  // --------------------------------------------
  describe('extractHtmlTitle', () => {
    it('should use readability title when available', () => {
      const result = extractHtmlTitle('Article Title', 'page.html')

      expect(result.title).toBe('Article Title')
      expect(result.source).toBe('content')
    })

    it('should fall back to file name when readability title is empty', () => {
      const result = extractHtmlTitle('', 'my-page.html')

      expect(result.title).toBe('my page')
      expect(result.source).toBe('filename')
    })

    it('should fall back to file name when readability title is whitespace only', () => {
      const result = extractHtmlTitle('   ', 'my-page.html')

      expect(result.title).toBe('my page')
      expect(result.source).toBe('filename')
    })
  })

  // --------------------------------------------
  // extractPdfTitle
  // --------------------------------------------
  describe('extractPdfTitle', () => {
    it('should use PDF metadata title when available', () => {
      const result = extractPdfTitle('Annual Report 2024', 'Some chunk text', 'report.pdf')

      expect(result.title).toBe('Annual Report 2024')
      expect(result.source).toBe('metadata')
    })

    it('should use first page chunk text when no metadata title', () => {
      const result = extractPdfTitle(undefined, 'The Unity Game Designer Playbook', 'report.pdf')

      expect(result.title).toBe('The Unity Game Designer Playbook')
      expect(result.source).toBe('content')
    })

    it('should fall back to file name when no metadata and no chunk text', () => {
      const result = extractPdfTitle(undefined, undefined, 'annual-report.pdf')

      expect(result.title).toBe('annual report')
      expect(result.source).toBe('filename')
    })

    it('should ignore metadata title if it looks like a file path', () => {
      const result = extractPdfTitle('/home/user/document.pdf', undefined, 'my-doc.pdf')

      expect(result.title).toBe('my doc')
      expect(result.source).toBe('filename')
    })

    it('should ignore metadata title if it contains backslash path', () => {
      const result = extractPdfTitle('C:\\Users\\doc.pdf', undefined, 'my-doc.pdf')

      expect(result.title).toBe('my doc')
      expect(result.source).toBe('filename')
    })

    it('should ignore metadata title if it is empty or whitespace', () => {
      const result = extractPdfTitle('   ', undefined, 'my-doc.pdf')

      expect(result.title).toBe('my doc')
      expect(result.source).toBe('filename')
    })

    it('should prefer metadata over chunk text when both available', () => {
      const result = extractPdfTitle('Metadata Title', 'Chunk Title', 'fallback.pdf')

      expect(result.title).toBe('Metadata Title')
      expect(result.source).toBe('metadata')
    })

    it('should fall back from file-path metadata to chunk text', () => {
      const result = extractPdfTitle('/usr/local/doc.pdf', 'Real Title From Content', 'my-doc.pdf')

      expect(result.title).toBe('Real Title From Content')
      expect(result.source).toBe('content')
    })

    it('should use font hint when metadata is undefined and fontSize > 14', () => {
      const result = extractPdfTitle(undefined, 'Chunk Text', 'report.pdf', {
        text: 'My Title',
        fontSize: 24,
      })

      expect(result.title).toBe('My Title')
      expect(result.source).toBe('content')
    })

    it('should ignore font hint when fontSize <= 14', () => {
      const result = extractPdfTitle(undefined, 'Chunk Text', 'report.pdf', {
        text: 'Small Font Text',
        fontSize: 10,
      })

      expect(result.title).toBe('Chunk Text')
      expect(result.source).toBe('content')
    })

    it('should prefer metadata over font hint', () => {
      const result = extractPdfTitle('Real Title', 'Chunk Text', 'report.pdf', {
        text: 'Font Title',
        fontSize: 24,
      })

      expect(result.title).toBe('Real Title')
      expect(result.source).toBe('metadata')
    })

    it('should work without font hint (backward compatibility)', () => {
      const result = extractPdfTitle(undefined, 'Chunk Text', 'report.pdf')

      expect(result.title).toBe('Chunk Text')
      expect(result.source).toBe('content')
    })
  })

  // --------------------------------------------
  // extractDocxTitle
  // --------------------------------------------
  describe('extractDocxTitle', () => {
    it('should extract first h1 from mammoth HTML output', () => {
      const html = '<h1>Document Title</h1><p>Some content here.</p>'
      const result = extractDocxTitle(html, 'document.docx')

      expect(result.title).toBe('Document Title')
      expect(result.source).toBe('content')
    })

    it('should fall back to file name when no h1 found', () => {
      const html = '<p>Some content without heading.</p>'
      const result = extractDocxTitle(html, 'my-document.docx')

      expect(result.title).toBe('my document')
      expect(result.source).toBe('filename')
    })

    it('should handle HTML with no heading tags', () => {
      const html = '<p>Just a paragraph.</p><p>Another paragraph.</p>'
      const result = extractDocxTitle(html, 'notes.docx')

      expect(result.title).toBe('notes')
      expect(result.source).toBe('filename')
    })

    it('should extract only the first h1 when multiple exist', () => {
      const html = '<h1>First Title</h1><h1>Second Title</h1><p>Content.</p>'
      const result = extractDocxTitle(html, 'document.docx')

      expect(result.title).toBe('First Title')
      expect(result.source).toBe('content')
    })
  })

  // --------------------------------------------
  // extractCodeTitle
  // --------------------------------------------
  describe('extractCodeTitle', () => {
    it('should extract title from leading single-line comment', () => {
      const ts = '// Authentication service\n\nimport { Injectable } from "@angular/core";\n'
      const result = extractCodeTitle(ts, 'auth.service.ts')

      expect(result.title).toBe('Authentication service')
      expect(result.source).toBe('content')
    })

    it('should extract class name when no leading comment', () => {
      const cs = 'using System;\n\npublic class SalesFormLetter\n{\n}\n'
      const result = extractCodeTitle(cs, 'SalesFormLetter.cs')

      expect(result.title).toBe('SalesFormLetter')
      expect(result.source).toBe('content')
    })

    it('should extract TypeScript exported class name', () => {
      const ts =
        'import { Something } from "./mod.js";\n\nexport class MyService {\n  run() {}\n}\n'
      const result = extractCodeTitle(ts, 'my-service.ts')

      expect(result.title).toBe('MyService')
      expect(result.source).toBe('content')
    })

    it('should extract function name when no class is present', () => {
      const js =
        'export function computeTotal(items) {\n  return items.reduce((a, b) => a + b, 0);\n}\n'
      const result = extractCodeTitle(js, 'compute-total.js')

      expect(result.title).toBe('computeTotal')
      expect(result.source).toBe('content')
    })

    it('should extract interface name from TypeScript file', () => {
      const ts = 'export interface UserProfile {\n  id: string;\n  name: string;\n}\n'
      const result = extractCodeTitle(ts, 'user-profile.ts')

      expect(result.title).toBe('UserProfile')
      expect(result.source).toBe('content')
    })

    it('should extract C# namespace name', () => {
      const cs = 'namespace Contoso.Finance.Reporting\n{\n  class Program {}\n}\n'
      const result = extractCodeTitle(cs, 'reporting.cs')

      expect(result.title).toBe('Contoso.Finance.Reporting')
      expect(result.source).toBe('content')
    })

    it('should fall back to file name when file has no recognisable declarations', () => {
      const js = 'const x = 1;\nconst y = 2;\n'
      const result = extractCodeTitle(js, 'constants.js')

      expect(result.title).toBe('constants')
      expect(result.source).toBe('filename')
    })

    it('should ignore shebang line and use comment on next line', () => {
      const js = '#!/usr/bin/env node\n// CLI entry point\n\nconsole.log("hi");\n'
      const result = extractCodeTitle(js, 'cli.js')

      expect(result.title).toBe('CLI entry point')
      expect(result.source).toBe('content')
    })
  })

  // --------------------------------------------
  // extractYamlTitle
  // --------------------------------------------
  describe('extractYamlTitle', () => {
    it('should extract root-level name field', () => {
      const yaml = 'name: my-app\nversion: 1.0.0\ndescription: A sample app\n'
      const result = extractYamlTitle(yaml, 'package.yaml')

      expect(result.title).toBe('my-app')
      expect(result.source).toBe('content')
    })

    it('should extract root-level title field', () => {
      const yaml = 'title: CI Pipeline\non:\n  push:\n    branches: [main]\n'
      const result = extractYamlTitle(yaml, 'ci.yml')

      expect(result.title).toBe('CI Pipeline')
      expect(result.source).toBe('content')
    })

    it('should prefer name over title when both present', () => {
      // The regex matches the first hit; `name` appears before `title` here
      const yaml = 'name: primary-name\ntitle: secondary-title\n'
      const result = extractYamlTitle(yaml, 'config.yaml')

      expect(result.title).toBe('primary-name')
      expect(result.source).toBe('content')
    })

    it('should fall back to file name when no name or title field is present', () => {
      const yaml = 'kind: Deployment\napiVersion: apps/v1\n'
      const result = extractYamlTitle(yaml, 'deployment.yaml')

      expect(result.title).toBe('deployment')
      expect(result.source).toBe('filename')
    })

    it('should not pick up an indented name field (only root-level)', () => {
      const yaml = 'spec:\n  name: nested-name\nkind: Service\n'
      const result = extractYamlTitle(yaml, 'service.yml')

      // Indented `name` must not match; fall back to filename
      expect(result.title).toBe('service')
      expect(result.source).toBe('filename')
    })

    it('should strip surrounding quotes from the name value', () => {
      const yaml = "name: 'quoted-app'\nversion: 2\n"
      const result = extractYamlTitle(yaml, 'app.yaml')

      expect(result.title).toBe('quoted-app')
      expect(result.source).toBe('content')
    })
  })

  // --------------------------------------------
  // extractXpoTitle
  // --------------------------------------------
  describe('extractXpoTitle', () => {
    it('should extract CLASS object name', () => {
      const xpo =
        'Exportfile for AOT version 1.0 or later\nFormatversion:1\n***Element: CLS\n\n  CLASS #SalesFormLetter\n  ENDCLASS\n'
      const result = extractXpoTitle(xpo, 'SalesFormLetter.xpo')

      expect(result.title).toBe('SalesFormLetter')
      expect(result.source).toBe('content')
    })

    it('should extract TABLE object name', () => {
      const xpo = 'Exportfile for AOT version 1.0 or later\n\n  TABLE #CustTable\n  ENDTABLE\n'
      const result = extractXpoTitle(xpo, 'CustTable.xpo')

      expect(result.title).toBe('CustTable')
      expect(result.source).toBe('content')
    })

    it('should extract FORM object name', () => {
      const xpo = '  FORM #SalesTable\n  ENDFORM\n'
      const result = extractXpoTitle(xpo, 'SalesTable.xpo')

      expect(result.title).toBe('SalesTable')
      expect(result.source).toBe('content')
    })

    it('should extract ENUM object name', () => {
      const xpo = '  ENUM #NoYesId\n  ENDENUM\n'
      const result = extractXpoTitle(xpo, 'NoYesId.xpo')

      expect(result.title).toBe('NoYesId')
      expect(result.source).toBe('content')
    })

    it('should fall back to file name when no AOT object declaration is found', () => {
      const xpo = 'Exportfile for AOT version 1.0 or later\nFormatversion:1\n'
      const result = extractXpoTitle(xpo, 'my-export.xpo')

      expect(result.title).toBe('my export')
      expect(result.source).toBe('filename')
    })

    it('should be case-insensitive for object keywords', () => {
      const xpo = '  class #MyClass\n'
      const result = extractXpoTitle(xpo, 'my-class.xpo')

      expect(result.title).toBe('MyClass')
      expect(result.source).toBe('content')
    })
  })
})
