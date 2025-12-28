import { useState, useCallback } from 'react'
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { CopyButton } from './CopyButton'

export function KeyGenerator() {
  const [inputNsec, setInputNsec] = useState('')
  const [error, setError] = useState('')
  const [keys, setKeys] = useState<{
    nsec: string
    npub: string
    nsecHex: string
    npubHex: string
  } | null>(null)

  const generateKeys = useCallback(() => {
    const secretKey = generateSecretKey()
    const publicKey = getPublicKey(secretKey)

    const nsecHex = bytesToHex(secretKey)
    const npubHex = publicKey

    setKeys({
      nsec: nip19.nsecEncode(secretKey),
      npub: nip19.npubEncode(publicKey),
      nsecHex,
      npubHex,
    })
    setInputNsec('')
    setError('')
  }, [])

  const handleInputNsec = useCallback((val: string) => {
    setInputNsec(val)
    setError('')
    if (!val.trim()) {
      setKeys(null)
      return
    }

    try {
      let secretKey: Uint8Array
      let nsec: string

      if (val.startsWith('nsec1')) {
        const decoded = nip19.decode(val)
        if (decoded.type !== 'nsec') throw new Error('Not an nsec')
        secretKey = decoded.data as Uint8Array
        nsec = val
      } else if (/^[0-9a-fA-F]{64}$/.test(val)) {
        secretKey = hexToBytes(val)
        nsec = nip19.nsecEncode(secretKey)
      } else {
        throw new Error('Invalid format. Enter nsec1... or 64-char hex')
      }

      const publicKey = getPublicKey(secretKey)
      const nsecHex = bytesToHex(secretKey)
      const npubHex = publicKey

      setKeys({
        nsec,
        npub: nip19.npubEncode(publicKey),
        nsecHex,
        npubHex,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid key')
      setKeys(null)
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl text-gray-400 mb-8">Key Generator & Converter</h2>

      <div className="space-y-4 mb-8">
        <button
          onClick={generateKeys}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-lg"
        >
          Generate New Key Pair
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-500 uppercase">Or use existing nsec</span>
          </div>
        </div>

        <div>
          <input
            type="text"
            value={inputNsec}
            onChange={(e) => handleInputNsec(e.target.value)}
            placeholder="Enter nsec1... or 64-char hex secret key"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
          />
          {error && <p className="mt-1 text-red-400 text-xs">{error}</p>}
        </div>
      </div>

      {keys && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-400 mb-3 uppercase tracking-wider">
              Secret Key (nsec)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase">
                  Bech32 (NIP-19)
                </label>
                <div className="flex items-center gap-2">
                  <pre className="flex-1 bg-gray-900 p-3 rounded text-sm font-mono break-all whitespace-pre-wrap text-red-400">
                    {keys.nsec}
                  </pre>
                  <CopyButton text={keys.nsec} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase">Hex</label>
                <div className="flex items-center gap-2">
                  <pre className="flex-1 bg-gray-900 p-3 rounded text-sm font-mono break-all whitespace-pre-wrap text-red-400/80">
                    {keys.nsecHex}
                  </pre>
                  <CopyButton text={keys.nsecHex} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wider">
              Public Key (npub)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase">
                  Bech32 (NIP-19)
                </label>
                <div className="flex items-center gap-2">
                  <pre className="flex-1 bg-gray-900 p-3 rounded text-sm font-mono break-all whitespace-pre-wrap text-green-400">
                    {keys.npub}
                  </pre>
                  <CopyButton text={keys.npub} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase">Hex</label>
                <div className="flex items-center gap-2">
                  <pre className="flex-1 bg-gray-900 p-3 rounded text-sm font-mono break-all whitespace-pre-wrap text-green-400/80">
                    {keys.npubHex}
                  </pre>
                  <CopyButton text={keys.npubHex} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <p className="text-yellow-500 text-sm">
              <strong>Warning:</strong> Never share your secret key (nsec) with anyone. It gives
              full control over your Nostr identity.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
