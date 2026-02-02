import { memo, useMemo } from 'react'

/**
 * Detect punctuation type at end of word for pause timing
 */
function getPunctuationType(word) {
  const lastChar = word.trim().slice(-1)
  // Long pause: period, exclamation, question mark, ellipsis
  if (['.', '!', '?', '…'].includes(lastChar)) return 'long'
  // Medium pause: comma, semicolon, colon, dash
  if ([',', ';', ':', '–', '—', '-'].includes(lastChar)) return 'medium'
  // Short pause: closing quotes, parentheses (end of phrase)
  if (['"', '"', "'", ')', ']', '»'].includes(lastChar)) return 'short'
  return 'none'
}

/**
 * Splits text into wrapped word spans for the reading flow engine
 */
const WordRenderer = memo(function WordRenderer({ content, readWordIndex }) {
  const words = useMemo(() => {
    // Split content into paragraphs first
    const paragraphs = content.split(/\n\n+/)
    let globalWordIndex = 0
    
    return paragraphs.map((paragraph, pIndex) => {
      const paragraphWords = paragraph.split(/\s+/).filter(word => word.length > 0)
      
      const wordSpans = paragraphWords.map((word, wIndex) => {
        const currentIndex = globalWordIndex
        globalWordIndex++
        
        const isRead = currentIndex < readWordIndex
        const punctuation = getPunctuationType(word)
        
        return (
          <span
            key={`word-${pIndex}-${wIndex}`}
            data-word-index={currentIndex}
            data-punctuation={punctuation}
            className={isRead ? 'word-read' : 'word-unread'}
          >
            {word}{' '}
          </span>
        )
      })
      
      return (
        <p 
          key={`paragraph-${pIndex}`}
          className={`mb-6 leading-relaxed text-justify ${pIndex === 0 ? 'drop-cap' : ''}`}
        >
          {wordSpans}
        </p>
      )
    })
  }, [content, readWordIndex])
  
  return <div className="newspaper-body">{words}</div>
})

export default WordRenderer

/**
 * Get total word count from content
 */
export function getWordCount(content) {
  return content.split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Get words array with punctuation info
 */
export function getWordsWithPunctuation(content) {
  const words = content.split(/\s+/).filter(word => word.length > 0)
  return words.map(word => ({
    word,
    punctuation: getPunctuationType(word)
  }))
}
