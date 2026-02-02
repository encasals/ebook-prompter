// Book and Chapter types
export interface Chapter {
  title: string
  content: string
  href?: string
}

export interface Book {
  title: string
  author: string
  fileName: string
}

export interface SavedBook extends Book {
  id: string
  chapters: Chapter[]
  savedAt: string
  progressChapterIndex?: number
  progressWordIndex?: number
  lastRead?: string
}

export interface CurrentBook extends Book {
  id?: string
  progressChapterIndex?: number
  progressWordIndex?: number
  lastRead?: string
}

// Pause multipliers
export interface PauseMultipliers {
  long: number
  medium: number
  short: number
}

export type PauseType = 'long' | 'medium' | 'short' | 'none'

// View types
export type ViewType = 'library' | 'reader'

// Theme types
export type ThemeType = 'light' | 'dark'

// Word info for punctuation timing
export interface WordInfo {
  word: string
  punctuation: PauseType
}

// Store state interface
export interface ReaderState {
  // Playback state
  isPlaying: boolean
  wpm: number
  fontSize: number
  
  // Pause multipliers for punctuation
  pauseMultipliers: PauseMultipliers
  
  // Book state
  currentBook: CurrentBook | null
  currentChapterIndex: number
  chapters: Chapter[]
  
  // Library - saved books
  savedBooks: SavedBook[]
  
  // Theme
  theme: ThemeType
  
  // View state
  view: ViewType
}

// Store actions interface
export interface ReaderActions {
  setPlaying: (isPlaying: boolean) => void
  togglePlaying: () => void
  
  setWpm: (wpm: number) => void
  
  setPauseMultiplier: (type: keyof PauseMultipliers, value: number) => void
  resetPauseMultipliers: () => void
  
  setFontSize: (fontSize: number) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  
  setCurrentBook: (book: Book | CurrentBook) => void
  setChapters: (chapters: Chapter[]) => void
  
  saveBookToLibrary: (book: Book, chapters: Chapter[]) => void
  loadSavedBook: (bookId: string) => void
  updateProgress: (chapterIndex: number, wordIndex: number) => void
  removeBookFromLibrary: (bookId: string) => void
  
  setCurrentChapterIndex: (index: number) => void
  nextChapter: () => void
  prevChapter: () => void
  
  toggleTheme: () => void
  
  setView: (view: ViewType) => void
  openReader: () => void
  openLibrary: () => void
  
  resetBook: () => void
}

export type ReaderStore = ReaderState & ReaderActions
