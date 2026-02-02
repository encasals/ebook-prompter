import { useState, useEffect, useRef, useCallback, useMemo, MouseEvent } from 'react'
import { useReaderStore } from '../store/useReaderStore'
import WordRenderer, { getWordCount, getWordsWithPunctuation } from './WordRenderer'
import HUD from './HUD'
import type { PauseType } from '../types'

type PauseMultipliersWithNone = {
  long: number
  medium: number
  short: number
  none: number
}

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
    updateProgress,
  } = useReaderStore()
  
  // Build pause multipliers with 'none' fallback
  const PAUSE_MULTIPLIERS: PauseMultipliersWithNone = useMemo(() => ({
    long: pauseMultipliers?.long ?? 2.0,
    medium: pauseMultipliers?.medium ?? 1.5,
    short: pauseMultipliers?.short ?? 1.2,
    none: 1
  }), [pauseMultipliers])
  
  const [readWordIndex, setReadWordIndex] = useState(() => {
    // Resume from saved position if we're on the saved chapter
    if (currentBook?.id && currentBook.progressChapterIndex === currentChapterIndex) {
      return currentBook.progressWordIndex || 0
    }
    return 0
  })

  // Ref to track if chapter changed
  const prevChapterRef = useRef(currentChapterIndex)
  
  const contentRef = useRef<HTMLElement>(null)
  const scrollAnimationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const accumulatedTimeRef = useRef<number>(0)
  const targetScrollRef = useRef<number>(0)
  const currentScrollRef = useRef<number>(0)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  
  const currentChapter = chapters[currentChapterIndex]
  const totalWords = currentChapter ? getWordCount(currentChapter.content) : 0
  
  // Pre-compute words with punctuation info for efficient lookup
  const wordsWithPunctuation = useMemo(() => {
    if (!currentChapter) return []
    return getWordsWithPunctuation(currentChapter.content)
  }, [currentChapter])
  
  // Save progress function
  const saveProgress = useCallback(() => {
    if (currentBook?.id) {
      updateProgress(currentChapterIndex, readWordIndex)
    }
  }, [currentBook?.id, currentChapterIndex, readWordIndex, updateProgress])

  // Auto-save mechanisms
  useEffect(() => {
    // Save on pause
    if (!isPlaying) {
      saveProgress()
    }

    // Save on window unload/hide
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgress()
      }
    }
    
    // Auto-save every 30 seconds
    const intervalId = setInterval(saveProgress, 30000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', saveProgress)
    
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', saveProgress)
      // Save on unmount
      saveProgress()
    }
  }, [saveProgress, isPlaying])

  // Screen Wake Lock - prevent screen from sleeping while playing
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isPlaying) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        } catch (err) {
          console.log('Wake Lock request failed:', err instanceof Error ? err.message : 'Unknown error')
        }
      }
    }
    
    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
        } catch (err) {
          console.log('Wake Lock release failed:', err instanceof Error ? err.message : 'Unknown error')
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
    if (prevChapterRef.current !== currentChapterIndex) {
      setReadWordIndex(0)
      accumulatedTimeRef.current = 0
      targetScrollRef.current = 0
      currentScrollRef.current = 0
      if (contentRef.current) {
        contentRef.current.scrollTop = 0
      }
      prevChapterRef.current = currentChapterIndex
    }
  }, [currentChapterIndex])

  // Initial scroll to saved position on load/chapter change
  useEffect(() => {
    // Only attempt to scroll to a specific word if this is the chapter where we have saved progress
    const isSavedChapter = currentBook?.id && currentBook.progressChapterIndex === currentChapterIndex
    
    // If not the saved chapter, we rely on the reset effect to set scrollTop=0. 
    // We avoid using stale readWordIndex from previous chapter.
    if (!isSavedChapter) return

    const scrollToCurrentWord = () => {
      // Use the stored progress index directly (or currently initialized readWordIndex)
      // Note: readWordIndex state is initialized correctly via useState on mount
      if (contentRef.current && readWordIndex > 0) {
        const words = contentRef.current.querySelectorAll('[data-word-index]')
        const currentWord = words[readWordIndex] as HTMLElement | undefined
        
        if (currentWord) {
          const container = contentRef.current
          const containerRect = container.getBoundingClientRect()
          const wordRect = currentWord.getBoundingClientRect()
          
          // Calculate target scroll position (word at 40% height)
          // We need absolute position relative to container content, not viewport
          const scrollTop = container.scrollTop
          const wordTopRelative = wordRect.top - containerRect.top // position in viewport relative to container
          const scrollNeeded = wordTopRelative - (containerRect.height * 0.4)
          
          const targetPos = scrollTop + scrollNeeded
          
          container.scrollTop = targetPos
          targetScrollRef.current = targetPos
          currentScrollRef.current = targetPos
        }
      }
    }

    // Attempt scroll immediately and after a short delay to allow for layout/font rendering
    const timer1 = setTimeout(scrollToCurrentWord, 50)
    const timer2 = setTimeout(scrollToCurrentWord, 200)
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [currentChapterIndex, currentBook?.id, currentBook?.progressChapterIndex]) // Re-run if relevant book/chapter info changes
  
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
    
    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime
      }
      
      const deltaTime = currentTime - lastTimeRef.current
      lastTimeRef.current = currentTime
      accumulatedTimeRef.current += deltaTime
      
      // Get current word's punctuation type for pause calculation
      const currentWordInfo = wordsWithPunctuation[readWordIndex]
      const pauseMultiplier = currentWordInfo 
        ? PAUSE_MULTIPLIERS[currentWordInfo.punctuation as PauseType] 
        : 1
      
      // Apply punctuation-based pause
      const adjustedInterval = baseInterval * pauseMultiplier
      
      // Update word index when enough time has passed
      if (accumulatedTimeRef.current >= adjustedInterval) {
        accumulatedTimeRef.current = 0
        
        setReadWordIndex((prev) => {
          const next = prev + 1
          if (next >= totalWords) {
            return totalWords
          }
          return next
        })
        
        // Calculate target scroll position for the current word
        if (contentRef.current) {
          const words = contentRef.current.querySelectorAll('[data-word-index]')
          const currentWord = words[readWordIndex] as HTMLElement | undefined
          
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
  }, [isPlaying, baseInterval, totalWords, readWordIndex, wordsWithPunctuation, PAUSE_MULTIPLIERS, wpm])
  
  // Scroll to the current reading word position
  const scrollToReadingWord = useCallback(() => {
    if (!contentRef.current) return
    
    const words = contentRef.current.querySelectorAll('[data-word-index]')
    const currentWord = words[readWordIndex] as HTMLElement | undefined
    
    if (currentWord) {
      const container = contentRef.current
      const containerRect = container.getBoundingClientRect()
      const wordRect = currentWord.getBoundingClientRect()
      
      // Calculate target scroll position (word at 40% height)
      const scrollTop = container.scrollTop
      const wordTopRelative = wordRect.top - containerRect.top
      const scrollNeeded = wordTopRelative - (containerRect.height * 0.4)
      
      const targetPos = scrollTop + scrollNeeded
      
      container.scrollTop = targetPos
      targetScrollRef.current = targetPos
      currentScrollRef.current = targetPos
    }
  }, [readWordIndex])
  
  // Handle clicking on a word to set reading position
  const handleWordClick = useCallback((e: MouseEvent<HTMLElement>) => {
    // Only allow clicking to change position when paused
    if (isPlaying) return
    
    const wordSpan = (e.target as HTMLElement).closest('[data-word-index]')
    if (wordSpan) {
      const wordIndex = parseInt(wordSpan.getAttribute('data-word-index') || '', 10)
      if (!isNaN(wordIndex)) {
        setReadWordIndex(wordIndex)
      }
    }
  }, [isPlaying])
  
  // Scroll to reading position when play is pressed
  useEffect(() => {
    if (isPlaying) {
      scrollToReadingWord()
    }
  }, [isPlaying, scrollToReadingWord])
  
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
        onClick={handleWordClick}
        className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32 sm:pb-40 overflow-y-auto cursor-text"
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
