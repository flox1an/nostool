import { useState, useCallback } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors cursor-pointer"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
