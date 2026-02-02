import { useState, useCallback } from 'react'
import { Upload, BookOpen, FileText, Sun, Moon, Trash2, Book } from 'lucide-react'
import { useReaderStore } from '../store/useReaderStore'
import { parseBook } from '../utils/epubParser'

function LibraryView() {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { 
    setCurrentBook, 
    setChapters, 
    openReader, 
    theme, 
    toggleTheme,
    savedBooks,
    saveBookToLibrary,
    loadSavedBook,
    removeBookFromLibrary,
  } = useReaderStore()
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])
  
  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const bookFile = files.find(f => 
      f.name.endsWith('.epub') || f.name.endsWith('.epv')
    )
    
    if (bookFile) {
      await loadBook(bookFile)
    } else {
      setError('Please upload an .epub or .epv file')
    }
  }, [])
  
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files[0]
    if (file) {
      await loadBook(file)
    }
  }, [])
  
  const loadBook = async (file) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { book, chapters } = await parseBook(file)
      // Save to library
      saveBookToLibrary(book, chapters)
      // Load for reading
      setCurrentBook(book)
      setChapters(chapters)
      openReader()
    } catch (err) {
      console.error('Error parsing book:', err)
      setError(`Failed to load book: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleOpenSavedBook = (bookId) => {
    loadSavedBook(bookId)
  }
  
  const handleDeleteBook = (e, bookId) => {
    e.stopPropagation()
    if (confirm('¿Eliminar este libro de la biblioteca?')) {
      removeBookFromLibrary(bookId)
    }
  }
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  return (
    <div className={`min-h-screen min-h-[100dvh] ${theme === 'dark' ? 'dark bg-[var(--bg-primary)]' : 'bg-[var(--bg-primary)]'}`}>
      {/* Header */}
      <header className="pt-4 sm:pt-6 pb-4 px-4 text-center border-b border-[var(--border-color)] safe-top">
        <div className="max-w-4xl mx-auto relative">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="absolute top-0 right-0 p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-[var(--text-primary)]" />
            ) : (
              <Moon className="w-5 h-5 text-[var(--text-primary)]" />
            )}
          </button>
          
          {/* Masthead */}
          <p className="text-xs tracking-[0.2em] uppercase mb-1 text-[var(--text-secondary)]">
            Premium Digital Reading
          </p>
          
          <h1 className="newspaper-title text-3xl sm:text-4xl md:text-5xl mb-2 text-[var(--text-primary)]">
            SpeedReader
          </h1>
          
          <div className="newspaper-rule max-w-xs mx-auto" />
          
          <p className="text-xs sm:text-sm tracking-wide mt-2 text-[var(--text-secondary)]">
            {currentDate}
          </p>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {/* Headline - smaller on mobile */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="newspaper-headline text-xl sm:text-2xl md:text-3xl font-bold mb-3 text-[var(--text-primary)]">
            Your Reading Companion
          </h2>
          <p className="newspaper-body text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            Upload your eBook and read at your perfect pace with Guided Flow technology.
          </p>
        </div>
        
        {/* Drop Zone - optimized for mobile */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative p-8 sm:p-12 border-2 border-dashed rounded-xl
            transition-all duration-300 cursor-pointer
            ${isDragging 
              ? 'border-[var(--accent)] bg-[var(--bg-secondary)]' 
              : 'border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]'
            }
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            type="file"
            accept=".epub,.epv"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
          />
          
          <div className="text-center">
            {isLoading ? (
              <>
                <div className="animate-pulse">
                  <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 text-[var(--accent)]" />
                </div>
                <p className="newspaper-headline text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                  Loading book...
                </p>
              </>
            ) : (
              <>
                <Upload className={`w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-3 text-[var(--accent)] ${isDragging ? 'scale-110' : ''} transition-transform`} />
                <p className="newspaper-headline text-base sm:text-lg font-semibold mb-1 text-[var(--text-primary)]">
                  Add a Book
                </p>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  Tap to browse · .epub & .epv
                </p>
              </>
            )}
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-700 dark:text-red-300 text-center text-sm">{error}</p>
          </div>
        )}
        
        {/* Saved Books Library */}
        {savedBooks.length > 0 && (
          <section className="mt-8 sm:mt-12">
            <h3 className="newspaper-headline text-lg sm:text-xl font-bold mb-4 text-[var(--text-primary)]">
              Your Library
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {savedBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => handleOpenSavedBook(book.id)}
                  className="group relative p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-11 h-14 sm:w-12 sm:h-16 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center">
                      <Book className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="newspaper-headline font-bold text-[var(--text-primary)] truncate text-sm sm:text-base">
                        {book.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate">
                        {book.author}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {book.chapters?.length || 0} chapters
                      </p>
                    </div>
                  </div>
                  
                  {/* Delete button - always visible on mobile */}
                  <button
                    onClick={(e) => handleDeleteBook(e, book.id)}
                    className="absolute top-2 right-2 p-2 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                    title="Delete book"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* Features Section - simplified on mobile */}
        <section className="mt-10 sm:mt-16">
          <div className="newspaper-rule mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Easy Navigation"
              description="Browse chapters with an intuitive dropdown."
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title="Guided Flow"
              description="Words highlight as you read at your pace."
            />
            <FeatureCard
              icon={<Sun className="w-6 h-6" />}
              title="Customizable"
              description="Adjust speed, size, and theme."
            />
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="py-6 text-center safe-bottom">
        <p className="text-xs text-[var(--text-muted)]">
          SpeedReader Web
        </p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="text-center p-4 sm:p-5 rounded-xl bg-[var(--bg-secondary)]">
      <div className="text-[var(--accent)] mb-3 flex justify-center">
        {icon}
      </div>
      <h3 className="newspaper-headline text-sm sm:text-base font-bold mb-1 text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
        {description}
      </p>
    </div>
  )
}

export default LibraryView
