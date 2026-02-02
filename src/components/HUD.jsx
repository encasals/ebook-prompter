import { 
  Play, 
  Pause, 
  Sun,
  Moon,
  Home,
  Settings,
  X,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'
import { useReaderStore } from '../store/useReaderStore'

function HUD({ currentWordIndex, totalWords }) {
  const [showMobileSettings, setShowMobileSettings] = useState(false)
  const [showPauseSettings, setShowPauseSettings] = useState(false)
  
  const {
    isPlaying,
    togglePlaying,
    wpm,
    setWpm,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    currentChapterIndex,
    chapters,
    setCurrentChapterIndex,
    theme,
    toggleTheme,
    openLibrary,
    pauseMultipliers,
    setPauseMultiplier,
    resetPauseMultipliers,
  } = useReaderStore()
  
  const progress = totalWords > 0 ? Math.round((currentWordIndex / totalWords) * 100) : 0
  const currentChapter = chapters[currentChapterIndex]
  
  // Preset WPM options
  const wpmPresets = [100, 150, 200, 250, 300, 400, 500, 600]
  
  return (
    <>
      {/* Mobile Settings Modal */}
      {showMobileSettings && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMobileSettings(false)}
          />
          <div className={`absolute bottom-0 left-0 right-0 bg-[var(--bg-primary)] rounded-t-2xl p-6 safe-bottom ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="newspaper-headline text-lg font-bold text-[var(--text-primary)]">Settings</h3>
              <button 
                onClick={() => setShowMobileSettings(false)}
                className="p-2 rounded-full hover:bg-[var(--bg-secondary)]"
              >
                <X className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
            </div>
            
            {/* WPM Control */}
            <div className="mb-6">
              <label className="text-sm text-[var(--text-secondary)] mb-2 block">Reading Speed (WPM)</label>
              <div className="flex gap-2 flex-wrap">
                {wpmPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setWpm(preset)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      wpm === preset 
                        ? 'bg-[var(--accent)] text-white' 
                        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Font Size */}
            <div className="mb-6">
              <label className="text-sm text-[var(--text-secondary)] mb-2 block">Font Size</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={decreaseFontSize}
                  className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold text-lg hover:bg-[var(--bg-tertiary)]"
                >
                  A-
                </button>
                <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full">
                  <div 
                    className="h-full bg-[var(--accent)] rounded-full transition-all"
                    style={{ width: `${((fontSize - 0.8) / 2.2) * 100}%` }}
                  />
                </div>
                <button
                  onClick={increaseFontSize}
                  className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold text-xl hover:bg-[var(--bg-tertiary)]"
                >
                  A+
                </button>
              </div>
            </div>
            
            {/* Theme Toggle */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-[var(--text-secondary)]">Dark Mode</span>
              <button
                onClick={toggleTheme}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  theme === 'dark' ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            {/* Punctuation Pauses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-secondary)]">Punctuation Pauses</span>
                <button
                  onClick={resetPauseMultipliers}
                  className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                  title="Reset to defaults"
                >
                  <RotateCcw className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
              <div className="space-y-3">
                <PauseSlider 
                  label="Period, !, ?" 
                  value={pauseMultipliers?.long ?? 2.0} 
                  onChange={(v) => setPauseMultiplier('long', v)} 
                />
                <PauseSlider 
                  label="Comma, ;, :" 
                  value={pauseMultipliers?.medium ?? 1.5} 
                  onChange={(v) => setPauseMultiplier('medium', v)} 
                />
                <PauseSlider 
                  label="Quotes, )" 
                  value={pauseMultipliers?.short ?? 1.2} 
                  onChange={(v) => setPauseMultiplier('short', v)} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main HUD */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 ${theme === 'dark' ? 'dark' : ''}`}>
        {/* Progress bar - top of HUD */}
        <div className="h-1 bg-[var(--bg-secondary)]">
          <div 
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="bg-[var(--bg-primary)] border-t border-[var(--border-color)] px-3 py-2 sm:px-4 sm:py-3 safe-bottom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Left: Home + Chapter */}
              <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                <button
                  onClick={openLibrary}
                  className="p-2.5 sm:p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex-shrink-0"
                  title="Back to Library"
                >
                  <Home className="w-5 h-5 text-[var(--text-primary)]" />
                </button>
                
                {/* Chapter Dropdown */}
                <select
                  value={currentChapterIndex}
                  onChange={(e) => setCurrentChapterIndex(Number(e.target.value))}
                  className="flex-1 min-w-0 bg-[var(--bg-secondary)] border-0 text-[var(--text-primary)] text-sm rounded-lg px-2 py-2 sm:px-3 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors truncate"
                  title="Select Chapter"
                >
                  {chapters.map((chapter, index) => (
                    <option key={index} value={index}>
                      {index + 1}. {chapter.title}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Center: Play/Pause */}
              <button
                onClick={togglePlaying}
                className="p-3 sm:p-3.5 bg-[var(--accent)] text-white rounded-full hover:opacity-90 transition-opacity shadow-lg flex-shrink-0"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
                )}
              </button>
              
              {/* Right: Settings */}
              <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end">
                {/* Desktop controls */}
                <div className="hidden sm:flex items-center gap-2">
                  {/* WPM Control */}
                  <div className="flex items-center gap-1 px-2">
                    <label className="text-xs text-[var(--text-secondary)] mr-1">WPM</label>
                    <select
                      value={wpmPresets.includes(wpm) ? wpm : wpmPresets[2]}
                      onChange={(e) => setWpm(Number(e.target.value))}
                      className="bg-[var(--bg-secondary)] border-0 text-[var(--text-primary)] text-sm rounded-lg px-2 py-1.5 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      {wpmPresets.map((preset) => (
                        <option key={preset} value={preset}>{preset}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="h-6 w-px bg-[var(--border-color)]" />
                  
                  {/* Font Size */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={decreaseFontSize}
                      className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                      title="Decrease Font Size"
                    >
                      <span className="text-sm font-bold text-[var(--text-primary)]">A-</span>
                    </button>
                    <button
                      onClick={increaseFontSize}
                      className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                      title="Increase Font Size"
                    >
                      <span className="text-lg font-bold text-[var(--text-primary)]">A+</span>
                    </button>
                  </div>
                  
                  <div className="h-6 w-px bg-[var(--border-color)]" />
                  
                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                    title="Toggle Theme"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-5 h-5 text-[var(--text-primary)]" />
                    ) : (
                      <Moon className="w-5 h-5 text-[var(--text-primary)]" />
                    )}
                  </button>
                  
                  <div className="h-6 w-px bg-[var(--border-color)]" />
                  
                  {/* Pause Settings Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPauseSettings(!showPauseSettings)}
                      className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                      title="Punctuation Pause Settings"
                    >
                      <Settings className="w-5 h-5 text-[var(--text-primary)]" />
                    </button>
                    
                    {/* Pause Settings Dropdown */}
                    {showPauseSettings && (
                      <div className="absolute bottom-full right-0 mb-2 w-72 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Punctuation Pauses</h4>
                          <button
                            onClick={resetPauseMultipliers}
                            className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                            title="Reset to defaults"
                          >
                            <RotateCcw className="w-4 h-4 text-[var(--text-secondary)]" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <PauseSlider 
                            label="Period, !, ?" 
                            value={pauseMultipliers?.long ?? 2.0} 
                            onChange={(v) => setPauseMultiplier('long', v)} 
                          />
                          <PauseSlider 
                            label="Comma, ;, :" 
                            value={pauseMultipliers?.medium ?? 1.5} 
                            onChange={(v) => setPauseMultiplier('medium', v)} 
                          />
                          <PauseSlider 
                            label="Quotes, )" 
                            value={pauseMultipliers?.short ?? 1.2} 
                            onChange={(v) => setPauseMultiplier('short', v)} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mobile settings button */}
                <button
                  onClick={() => setShowMobileSettings(true)}
                  className="sm:hidden p-2.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-[var(--text-primary)]" />
                </button>
                
                {/* Mobile WPM display */}
                <span className="sm:hidden text-xs text-[var(--text-secondary)] font-medium">
                  {wpm}
                </span>
              </div>
            </div>
            
            {/* Progress info - desktop only */}
            <div className="hidden sm:block mt-2 text-center">
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {currentChapter?.title} · {progress}% · {wpm} WPM
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Pause multiplier slider component
function PauseSlider({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
        <span className="text-xs font-mono text-[var(--text-primary)]">{value.toFixed(1)}x</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
      />
    </div>
  )
}

export default HUD
