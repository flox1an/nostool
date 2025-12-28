import { useState } from 'react'
import { Converter } from './components/Converter'
import { KeyGenerator } from './components/KeyGenerator'

type View = 'converter' | 'generator'

function App() {
  const [view, setView] = useState<View>('converter')

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col items-center mb-12">
          <h1 className="text-4xl font-bold mb-2 text-purple-400">Nostool</h1>
          <p className="text-gray-400 mb-8">Nostr Developer Tools</p>

          <nav className="flex gap-4 p-1 bg-gray-800 rounded-lg">
            <button
              onClick={() => setView('converter')}
              className={`px-6 py-2 rounded-md transition-colors cursor-pointer ${
                view === 'converter'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              Converter
            </button>
            <button
              onClick={() => setView('generator')}
              className={`px-6 py-2 rounded-md transition-colors cursor-pointer ${
                view === 'generator'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              Key Generator
            </button>
          </nav>
        </header>

        <main>
          {view === 'converter' && <Converter />}
          {view === 'generator' && <KeyGenerator />}
        </main>

        <footer className="mt-20 pt-8 border-t border-gray-800 text-center text-gray-600 text-sm">
          <p>Built for the Nostr ecosystem</p>
        </footer>
      </div>
    </div>
  )
}

export default App
