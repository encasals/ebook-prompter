import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useReaderStore } from '../store/useReaderStore'
import WordRenderer, { getWordCount, getWordsWithPunctuation } from './WordRenderer'
import HUD from './HUD'

function ReaderView() {
  const {
    isPlaying,
    wpm,
    fontSize,
    currentBook,
    currentChapterIndex,
    chapters,
    theme,
    pauseMultipliers,
  } = useReaderStore()
  
  // Build pause multipliers with 'none' fallback
  const PAUSE_MULTIPLIERS = useMemo(() => ({
    long: pauseMultipliers?.long ?? 2.0,
    medium: pauseMultipliers?.medium ?? 1.5,
    short: pauseMultipliers?.short ?? 1.2,
    none: 1
  }), [pauseMultipliers])
  
  const [readWordIndex, setReadWordIndex] = useState(0)
  const contentRef = useRef(null)
  const scrollAnimationRef = useRef(null)
  const lastTimeRef = useRef(0)
  const accumulatedTimeRef = useRef(0)
  const targetScrollRef = useRef(0)
  const currentScrollRef = useRef(0)
  const wakeLockRef = useRef(null)
  
  const currentChapter = chapters[currentChapterIndex]
  const totalWords = currentChapter ? getWordCount(currentChapter.content) : 0
  
  // Pre-compute words with punctuation info for efficient lookup
  const wordsWithPunctuation = useMemo(() => {
    if (!currentChapter) return []
    return getWordsWithPunctuation(currentChapter.content)
  }, [currentChapter])
  
  // Screen Wake Lock - prevent screen from sleeping while playing
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isPlaying) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        } catch (err) {
          console.log('Wake Lock request failed:', err.message)
        }
      }
    }
    
    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
        } catch (err) {
          console.log('Wake Lock release failed:', err.message)
        }
      }
    }
    
    if (isPlaying) {
      requestWakeLock()
    } else {
      releaseWakeLock()
    }
    
    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      releaseWakeLock()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isPlaying])
  
  // Reset reading position when chapter changes
  useEffect(() => {
    setReadWordIndex(0)
    accumulatedTimeRef.current = 0
    targetScrollRef.current = 0
    currentScrollRef.current = 0
    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [currentChapterIndex])
  
  // Calculate base interval (ms per word) based on WPM
  const baseInterval = 60000 / wpm // milliseconds per word
  
  // Auto-scroll and word highlighting logic with punctuation pauses
  useEffect(() => {
    if (!isPlaying) {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current)
      }
      return
    }
    
    const animate = (currentTime) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime
      }
      
      const deltaTime = currentTime - lastTimeRef.current
      lastTimeRef.current = currentTime
      accumulatedTimeRef.current += deltaTime
      
      // Get current word's punctuation type for pause calculation
      const currentWordInfo = wordsWithPunctuation[readWordIndex]
      const pauseMultiplier = currentWordInfo 
        ? PAUSE_MULTIPLIERS[currentWordInfo.punctuation] 
        : 1
      
      // Apply punctuation-based pause
      const adjustedInterval = baseInterval * pauseMultiplier
      
      // Update word index when enough time has passed
      if (accumulatedTimeRef.current >= adjustedInterval) {
        accumulatedTimeRef.current = 0
        
        setReadWordIndex(prev => {
          const next = prev + 1
          if (next >= totalWords) {
            return totalWords
          }
          return next
        })
        
        // Calculate target scroll position for the current word
        if (contentRef.current) {
          const words = contentRef.current.querySelectorAll('[data-word-index]')
          const currentWord = words[readWordIndex]
          
          if (currentWord) {
            const container = contentRef.current
            const containerRect = container.getBoundingClientRect()
            const wordRect = currentWord.getBoundingClientRect()
            
            // Calculate reading line position (40% from top)
            const readingLineY = containerRect.top + containerRect.height * 0.4
            
            // Update target scroll if word is below reading line
            if (wordRect.top > readingLineY + 5) {
              const scrollNeeded = wordRect.top - readingLineY
              targetScrollRef.current = container.scrollTop + scrollNeeded
            }
          }
        }
      }
      
      // Smooth scroll interpolation - runs every frame regardless of word timing
      if (contentRef.current) {
        const container = contentRef.current
        currentScrollRef.current = container.scrollTop
        
        // Calculate distance to target
        const distance = targetScrollRef.current - currentScrollRef.current
        
        // Only scroll if there's meaningful distance
        if (Math.abs(distance) > 0.5) {
          // Smooth easing factor - higher WPM needs faster scroll
          // Base factor of 0.08, scales up slightly with speed
          const easeFactor = Math.min(0.15, 0.06 + (wpm / 5000))
          const scrollStep = distance * easeFactor
          
          // Apply smooth scroll
          container.scrollTop += scrollStep
        }
      }
      
      scrollAnimationRef.current = requestAnimationFrame(animate)
    }
    
    scrollAnimationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current)
      }
    }
  }, [isPlaying, baseInterval, totalWords, readWordIndex, wordsWithPunctuation])
  
  // Handle manual scroll
  const handleScroll = useCallback(() => {
    if (!contentRef.current || isPlaying) return
    
    const container = contentRef.current
    const containerRect = container.getBoundingClientRect()
    const readingLineY = containerRect.top + containerRect.height * 0.4
    
    const words = container.querySelectorAll('[data-word-index]')
    
    for (let i = 0; i < words.length; i++) {
      const wordRect = words[i].getBoundingClientRect()
      if (wordRect.top > readingLineY) {
        setReadWordIndex(Math.max(0, i - 1))
        break
      }
    }
  }, [isPlaying])
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  if (!currentChapter) {
    return (
      <div className={`min-h-screen min-h-[100dvh] flex items-center justify-center ${theme === 'dark' ? 'dark bg-[var(--bg-primary)]' : 'bg-[var(--bg-primary)]'}`}>
        <p className="text-[var(--text-primary)]">No chapter loaded</p>
      </div>
    )
  }
  
  return (
    <div className={`min-h-screen min-h-[100dvh] ${theme === 'dark' ? 'dark bg-[var(--bg-primary)]' : 'bg-[var(--bg-primary)]'}`}>
      {/* Reading Line Indicator */}
      <div 
        className="reading-line"
        style={{ top: '40%' }}
      />
      
      {/* Header - minimal on mobile */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-4 py-2 sm:py-3 safe-top">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate">
              {currentBook?.title}
            </p>
            {currentBook?.author && (
              <p className="text-xs text-[var(--text-secondary)] truncate hidden sm:block">
                by {currentBook.author}
              </p>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main 
        ref={contentRef}
        onScroll={handleScroll}
        className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32 sm:pb-40 overflow-y-auto"
        style={{ 
          height: 'calc(100dvh - 52px)',
          fontSize: `${fontSize}rem`,
          lineHeight: 1.9,
        }}
      >
        {/* Chapter Title */}
        <div className="mb-6 sm:mb-8 text-center">
          <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] mb-1">
            Chapter {currentChapterIndex + 1}
          </p>
          <h2 className="newspaper-headline text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
            {currentChapter.title}
          </h2>
          <div className="newspaper-rule max-w-[200px] mx-auto mt-4" />
        </div>
        
        {/* Chapter Content */}
        <article className="text-[var(--text-primary)]">
          <WordRenderer 
            content={currentChapter.content}
            readWordIndex={readWordIndex}
          />
        </article>
        
        {/* End of Chapter */}
        <div className="mt-10 sm:mt-12 text-center">
          <div className="newspaper-rule" />
          <p className="text-sm text-[var(--text-muted)] mt-4">
            — End of Chapter —
          </p>
        </div>
      </main>
      
      {/* HUD Controls */}
      <HUD 
        currentWordIndex={readWordIndex}
        totalWords={totalWords}
      />
    </div>
  )
}

export default ReaderView
