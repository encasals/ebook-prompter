import ePub from 'epubjs'
import type { Book, Chapter } from '../types'

interface ParseResult {
  book: Book
  chapters: Chapter[]
}

/**
 * Parse an EPUB file and extract chapters
 * @param file - The uploaded file
 * @returns Promise containing book metadata and chapters
 */
export async function parseEpub(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const book = ePub(arrayBuffer)
  
  await book.ready
  
  const metadata = await book.loaded.metadata
  const navigation = await book.loaded.navigation
  
  const chapters: Chapter[] = []
  
  // Get spine items (ordered chapter list)
  const spine = book.spine as { items: Array<{ href: string }> }
  
  for (let i = 0; i < spine.items.length; i++) {
    const item = spine.items[i]
    const section = await book.section(item.href)
    
    if (section) {
      const doc = await section.load(book.load.bind(book)) as Document
      
      // Get the title from TOC or generate one
      let title = `Chapter ${i + 1}`
      const tocItem = navigation.toc.find((t: { href: string; label: string }) => t.href.includes(item.href))
      if (tocItem) {
        title = tocItem.label.trim()
      }
      
      // Extract and sanitize text content
      const content = sanitizeContent(doc)
      
      if (content.trim().length > 0) {
        chapters.push({
          title,
          content,
          href: item.href,
        })
      }
    }
  }
  
  return {
    book: {
      title: metadata.title || file.name.replace(/\.(epub|epv)$/i, ''),
      author: metadata.creator || 'Unknown Author',
      fileName: file.name,
    },
    chapters,
  }
}

/**
 * Parse a custom .epv file format (placeholder implementation)
 * For now, treats it as a plain text file with chapters separated by markers
 * @param file - The uploaded file
 * @returns Promise containing book metadata and chapters
 */
export async function parseEpv(file: File): Promise<ParseResult> {
  const text = await file.text()
  
  // Simple format: chapters separated by "---CHAPTER---" markers
  // Title on first line after marker
  const chapterMarker = /---CHAPTER---\n?/g
  const parts = text.split(chapterMarker).filter((p) => p.trim())
  
  const chapters: Chapter[] = parts.map((part, index) => {
    const lines = part.trim().split('\n')
    const title = lines[0].startsWith('#') 
      ? lines[0].replace(/^#+\s*/, '') 
      : `Chapter ${index + 1}`
    const content = lines[0].startsWith('#') 
      ? lines.slice(1).join('\n').trim()
      : part.trim()
    
    return { title, content }
  })
  
  // If no chapter markers found, treat as single chapter
  if (chapters.length === 0) {
    chapters.push({
      title: 'Full Text',
      content: text,
    })
  }
  
  return {
    book: {
      title: file.name.replace(/\.(epub|epv)$/i, ''),
      author: 'Unknown Author',
      fileName: file.name,
    },
    chapters,
  }
}

/**
 * Main parser that detects file type
 * @param file - The uploaded file
 */
export async function parseBook(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  if (extension === 'epub') {
    return parseEpub(file)
  } else if (extension === 'epv') {
    return parseEpv(file)
  } else {
    throw new Error(`Unsupported file format: .${extension}`)
  }
}

/**
 * Sanitize HTML content - strip styles, extract text with paragraph structure
 * @param doc - The HTML document
 * @returns Cleaned text content with paragraph markers
 */
function sanitizeContent(doc: Document): string {
  // Remove script and style tags
  const scripts = doc.querySelectorAll('script, style, link')
  scripts.forEach((el) => el.remove())
  
  // Get all paragraphs and text blocks
  const textElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, li')
  const paragraphs: string[] = []
  
  textElements.forEach((el) => {
    const text = el.textContent?.trim()
    if (text && text.length > 0) {
      paragraphs.push(text)
    }
  })
  
  // If no paragraphs found, get body text
  if (paragraphs.length === 0) {
    const body = doc.querySelector('body')
    if (body) {
      return body.textContent?.trim() || ''
    }
  }
  
  return paragraphs.join('\n\n')
}
