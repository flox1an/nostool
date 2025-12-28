import { useState, useCallback, useEffect } from 'react'
import { nip19 } from 'nostr-tools'
import { hexToBytes, bytesToHex } from '@noble/hashes/utils'
import { CopyButton } from './CopyButton'

type DetectedType =
  | { kind: 'bech32'; type: string; data: nip19.DecodedResult }
  | { kind: 'hex'; value: string }
  | { kind: 'json'; data: Record<string, unknown> }
  | { kind: 'error'; message: string }
  | null

function detectInput(input: string): DetectedType {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Try bech32 decode first
  const bech32Prefixes = ['npub1', 'nsec1', 'note1', 'nprofile1', 'nevent1', 'naddr1']
  if (bech32Prefixes.some((p) => trimmed.toLowerCase().startsWith(p))) {
    try {
      const decoded = nip19.decode(trimmed)
      return { kind: 'bech32', type: decoded.type, data: decoded }
    } catch (e) {
      return {
        kind: 'error',
        message: `Invalid bech32: ${e instanceof Error ? e.message : 'Unknown error'}`,
      }
    }
  }

  // Try hex (64 chars)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return { kind: 'hex', value: trimmed.toLowerCase() }
  }

  // Try JSON
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed === 'object' && parsed !== null) {
      return { kind: 'json', data: parsed }
    }
  } catch {
    // Not JSON
  }

  return {
    kind: 'error',
    message:
      'Unrecognized format. Expected: bech32 (npub/nsec/note/nprofile/nevent/naddr), 64-char hex, or JSON',
  }
}

function encodeHexAs(hex: string, type: 'npub' | 'nsec' | 'note'): string {
  switch (type) {
    case 'npub':
      return nip19.npubEncode(hex)
    case 'nsec':
      return nip19.nsecEncode(hexToBytes(hex))
    case 'note':
      return nip19.noteEncode(hex)
  }
}

function encodeFromJson(
  data: Record<string, unknown>,
): { type: string; encoded: string } | { error: string } {
  if (typeof data.pubkey === 'string' && /^[0-9a-fA-F]{64}$/.test(data.pubkey)) {
    if (data.kind !== undefined || data.identifier !== undefined) {
      if (typeof data.kind === 'number' && typeof data.identifier === 'string') {
        const encoded = nip19.naddrEncode({
          kind: data.kind,
          pubkey: data.pubkey,
          identifier: data.identifier,
          relays: Array.isArray(data.relays)
            ? data.relays.filter((r): r is string => typeof r === 'string')
            : undefined,
        })
        return { type: 'naddr', encoded }
      }
    }
    const encoded = nip19.nprofileEncode({
      pubkey: data.pubkey,
      relays: Array.isArray(data.relays)
        ? data.relays.filter((r): r is string => typeof r === 'string')
        : undefined,
    })
    return { type: 'nprofile', encoded }
  }

  if (typeof data.id === 'string' && /^[0-9a-fA-F]{64}$/.test(data.id)) {
    const encoded = nip19.neventEncode({
      id: data.id,
      relays: Array.isArray(data.relays)
        ? data.relays.filter((r): r is string => typeof r === 'string')
        : undefined,
      author: typeof data.author === 'string' ? data.author : undefined,
      kind: typeof data.kind === 'number' ? data.kind : undefined,
    })
    return { type: 'nevent', encoded }
  }

  return {
    error:
      'Cannot determine encoding. Expected: { pubkey, relays? } for nprofile, { id, relays?, author?, kind? } for nevent, { kind, pubkey, identifier, relays? } for naddr',
  }
}

function formatDecodedData(decoded: nip19.DecodedResult): string {
  const { type, data } = decoded

  switch (type) {
    case 'npub':
    case 'note':
      return data as string
    case 'nsec':
      return bytesToHex(data as Uint8Array)
    case 'nprofile':
    case 'nevent':
    case 'naddr':
      return JSON.stringify(data, null, 2)
    default:
      return JSON.stringify(data, null, 2)
  }
}

function isJsonType(type: string): boolean {
  return ['nprofile', 'nevent', 'naddr'].includes(type)
}

function EditableJsonOutput({
  initialJson,
  originalType,
}: {
  initialJson: string
  originalType: string
}) {
  const [editedJson, setEditedJson] = useState(initialJson)
  const [reencoded, setReencoded] = useState<
    { type: string; encoded: string } | { error: string } | null
  >(null)

  useEffect(() => {
    setEditedJson(initialJson)
    setReencoded(null)
  }, [initialJson])

  const handleReencode = useCallback(() => {
    try {
      const parsed = JSON.parse(editedJson)
      const result = encodeFromJson(parsed)
      setReencoded(result)
    } catch (e) {
      setReencoded({ error: `Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}` })
    }
  }, [editedJson])

  const hasChanges = editedJson !== initialJson

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
          {originalType.toUpperCase()}
        </span>
        <span className="text-gray-400 text-sm">→ Decoded (editable)</span>
      </div>
      <textarea
        value={editedJson}
        onChange={(e) => {
          setEditedJson(e.target.value)
          setReencoded(null)
        }}
        className="w-full h-40 p-3 bg-gray-900 border border-gray-700 rounded text-sm font-mono text-gray-100 focus:outline-none focus:border-purple-500 resize-y"
      />
      <div className="mt-3 flex justify-between items-center">
        <button
          onClick={handleReencode}
          disabled={!hasChanges && reencoded !== null}
          className={`px-3 py-1 text-sm rounded transition-colors cursor-pointer ${
            hasChanges || reencoded === null
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Re-encode
        </button>
        <CopyButton text={editedJson} />
      </div>

      {reencoded && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          {'error' in reencoded ? (
            <div className="text-red-400">
              <span className="font-semibold">Error:</span> {reencoded.error}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-gray-600 text-white text-xs font-semibold rounded">
                  JSON
                </span>
                <span className="text-gray-400 text-sm">→</span>
                <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                  {reencoded.type.toUpperCase()}
                </span>
              </div>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto font-mono break-all whitespace-pre-wrap">
                {reencoded.encoded}
              </pre>
              <div className="mt-3 flex justify-end">
                <CopyButton text={reencoded.encoded} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Converter() {
  const [input, setInput] = useState('')
  const [hexEncodeType, setHexEncodeType] = useState<'npub' | 'nsec' | 'note'>('npub')

  const detected = detectInput(input)

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl text-gray-400 mb-8">NIP-19 Converter</h2>

      <div className="mb-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste npub, nsec, note, nprofile, nevent, naddr, 64-char hex, or JSON..."
          className="w-full h-32 p-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm resize-y"
        />
      </div>

      {detected && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          {detected.kind === 'error' && (
            <div className="text-red-400">
              <span className="font-semibold">Error:</span> {detected.message}
            </div>
          )}

          {detected.kind === 'bech32' && (
            <>
              {isJsonType(detected.type) ? (
                <EditableJsonOutput
                  initialJson={formatDecodedData(detected.data)}
                  originalType={detected.type}
                />
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                      {detected.type.toUpperCase()}
                    </span>
                    <span className="text-gray-400 text-sm">→ Decoded</span>
                  </div>
                  <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto font-mono">
                    {formatDecodedData(detected.data)}
                  </pre>
                  <div className="mt-3 flex justify-end">
                    <CopyButton text={formatDecodedData(detected.data)} />
                  </div>
                </div>
              )}
            </>
          )}

          {detected.kind === 'hex' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-gray-600 text-white text-xs font-semibold rounded">
                  HEX
                </span>
                <span className="text-gray-400 text-sm">→ Encode as:</span>
              </div>
              <div className="flex gap-2 mb-4">
                {(['npub', 'nsec', 'note'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setHexEncodeType(type)}
                    className={`px-3 py-1 text-sm rounded transition-colors cursor-pointer ${
                      hexEncodeType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto font-mono">
                {encodeHexAs(detected.value, hexEncodeType)}
              </pre>
              <div className="mt-3 flex justify-end">
                <CopyButton text={encodeHexAs(detected.value, hexEncodeType)} />
              </div>
            </div>
          )}

          {detected.kind === 'json' && (
            <div>
              {(() => {
                const result = encodeFromJson(detected.data)
                if ('error' in result) {
                  return (
                    <div className="text-red-400">
                      <span className="font-semibold">Error:</span> {result.error}
                    </div>
                  )
                }
                return (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-gray-600 text-white text-xs font-semibold rounded">
                        JSON
                      </span>
                      <span className="text-gray-400 text-sm">→</span>
                      <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                        {result.type.toUpperCase()}
                      </span>
                    </div>
                    <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto font-mono break-all whitespace-pre-wrap">
                      {result.encoded}
                    </pre>
                    <div className="mt-3 flex justify-end">
                      <CopyButton text={result.encoded} />
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 text-gray-500 text-sm">
        <p className="mb-2 font-semibold text-gray-400">Supported formats:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <code className="text-purple-400">npub1...</code> → hex pubkey
          </li>
          <li>
            <code className="text-purple-400">nsec1...</code> → hex secret key
          </li>
          <li>
            <code className="text-purple-400">note1...</code> → hex event id
          </li>
          <li>
            <code className="text-purple-400">nprofile1...</code> → JSON with pubkey & relays
          </li>
          <li>
            <code className="text-purple-400">nevent1...</code> → JSON with event id, relays,
            author, kind
          </li>
          <li>
            <code className="text-purple-400">naddr1...</code> → JSON with kind, pubkey, identifier,
            relays
          </li>
          <li>64-char hex → encode as npub/nsec/note</li>
          <li>JSON → encode as nprofile/nevent/naddr</li>
        </ul>
      </div>
    </div>
  )
}
