import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useReaderStore = create(
  persist(
    (set, get) => ({
      // Playback state
      isPlaying: false,
      wpm: 200, // Words per minute
      fontSize: 1.2, // in rem
      
      // Pause multipliers for punctuation
      pauseMultipliers: {
        long: 2.0,    // Period, !, ?
        medium: 1.5,  // Comma, ;, :
        short: 1.2,   // Quotes, parentheses
      },
      
      // Book state
      currentBook: null,
      currentChapterIndex: 0,
      chapters: [],
      
      // Library - saved books
      savedBooks: [],
      
      // Theme
      theme: 'light',
      
      // View state
      view: 'library', // 'library' | 'reader'
      
      // Actions
      setPlaying: (isPlaying) => set({ isPlaying }),
      togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
      
      setWpm: (wpm) => set({ wpm: Math.max(50, Math.min(1000, wpm)) }),
      
      setPauseMultiplier: (type, value) => set((state) => ({
        pauseMultipliers: {
          ...state.pauseMultipliers,
          [type]: Math.max(1, Math.min(5, value))
        }
      })),
      
      resetPauseMultipliers: () => set({
        pauseMultipliers: { long: 2.0, medium: 1.5, short: 1.2 }
      }),
      
      setFontSize: (fontSize) => set({ fontSize: Math.max(0.8, Math.min(3, fontSize)) }),
      increaseFontSize: () => set((state) => ({ fontSize: Math.min(3, state.fontSize + 0.1) })),
      decreaseFontSize: () => set((state) => ({ fontSize: Math.max(0.8, state.fontSize - 0.1) })),
      
      setCurrentBook: (book) => set({ currentBook: book, currentChapterIndex: 0 }),
      setChapters: (chapters) => set({ chapters }),
      
      // Save book to library
      saveBookToLibrary: (book, chapters) => {
        const { savedBooks } = get()
        const bookId = Date.now().toString()
        const savedBook = {
          id: bookId,
          ...book,
          chapters,
          savedAt: new Date().toISOString(),
        }
        // Check if book already exists (by title and author)
        const existingIndex = savedBooks.findIndex(
          b => b.title === book.title && b.author === book.author
        )
        if (existingIndex >= 0) {
          // Update existing book
          const updatedBooks = [...savedBooks]
          updatedBooks[existingIndex] = { ...savedBook, id: savedBooks[existingIndex].id }
          set({ savedBooks: updatedBooks })
        } else {
          // Add new book
          set({ savedBooks: [...savedBooks, savedBook] })
        }
      },
      
      // Load saved book from library
      loadSavedBook: (bookId) => {
        const { savedBooks } = get()
        const book = savedBooks.find(b => b.id === bookId)
        if (book) {
          const { chapters, ...bookInfo } = book
          set({ 
            currentBook: bookInfo,
            chapters,
            currentChapterIndex: 0,
            isPlaying: false,
            view: 'reader'
          })
        }
      },
      
      // Remove book from library
      removeBookFromLibrary: (bookId) => {
        const { savedBooks } = get()
        set({ savedBooks: savedBooks.filter(b => b.id !== bookId) })
      },
      
      setCurrentChapterIndex: (index) => {
        const { chapters } = get()
        if (index >= 0 && index < chapters.length) {
          set({ currentChapterIndex: index, isPlaying: false })
        }
      },
      
      nextChapter: () => {
        const { currentChapterIndex, chapters } = get()
        if (currentChapterIndex < chapters.length - 1) {
          set({ currentChapterIndex: currentChapterIndex + 1, isPlaying: false })
        }
      },
      
      prevChapter: () => {
        const { currentChapterIndex } = get()
        if (currentChapterIndex > 0) {
          set({ currentChapterIndex: currentChapterIndex - 1, isPlaying: false })
        }
      },
      
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      
      setView: (view) => set({ view }),
      
      openReader: () => set({ view: 'reader' }),
      openLibrary: () => set({ view: 'library', isPlaying: false }),
      
      // Reset
      resetBook: () => set({ 
        currentBook: null, 
        chapters: [], 
        currentChapterIndex: 0,
        isPlaying: false,
        view: 'library'
      }),
    }),
    {
      name: 'speedreader-storage',
      partialize: (state) => ({ 
        theme: state.theme,
        wpm: state.wpm,
        fontSize: state.fontSize,
        savedBooks: state.savedBooks,
        pauseMultipliers: state.pauseMultipliers,
      }),
    }
  )
)
