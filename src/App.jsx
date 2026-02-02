import { useReaderStore } from './store/useReaderStore'
import LibraryView from './components/LibraryView'
import ReaderView from './components/ReaderView'

function App() {
  const { view } = useReaderStore()

  return (
    <>
      {view === 'library' ? <LibraryView /> : <ReaderView />}
    </>
  )
}

export default App
