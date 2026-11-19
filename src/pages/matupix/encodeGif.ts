const HSIZE = 5003

function lzw(indices: Uint8Array, minCodeSize: number) {
  const clearCode = 1 << minCodeSize
  const eoiCode = clearCode + 1
  const htab = new Int32Array(HSIZE)
  const codetab = new Int32Array(HSIZE)
  htab.fill(-1)

  let codeSize = minCodeSize + 1
  let nextCode = eoiCode + 1
  let maxCode = (1 << codeSize) - 1
  const bytes: number[] = []
  let acc = 0
  let nbits = 0

  const emit = (code: number) => {
    acc |= code << nbits
    nbits += codeSize
    while (nbits >= 8) {
      bytes.push(acc & 255)
      acc >>>= 8
      nbits -= 8
    }
    if (nextCode > maxCode && codeSize < 12) {
      codeSize += 1
      maxCode = codeSize === 12 ? 4096 : (1 << codeSize) - 1
    }
  }

  emit(clearCode)
  if (indices.length === 0) {
    emit(eoiCode)
    if (nbits > 0) bytes.push(acc & 255)
    return Uint8Array.from(bytes)
  }

  let ent = indices[0]
  for (let i = 1; i < indices.length; i += 1) {
    const color = indices[i]
    const fcode = (color << 12) + ent
    let slot = ((color << 4) ^ ent) % HSIZE
    let found = false
    while (htab[slot] !== -1) {
      if (htab[slot] === fcode) {
        ent = codetab[slot]
        found = true
        break
      }
      slot = (slot + 1) % HSIZE
    }
    if (found) continue
    emit(ent)
    ent = color
    if (nextCode < 4096) {
      codetab[slot] = nextCode
      htab[slot] = fcode
      nextCode += 1
    } else {
      htab.fill(-1)
      emit(clearCode)
      codeSize = minCodeSize + 1
      nextCode = eoiCode + 1
      maxCode = (1 << codeSize) - 1
    }
  }
  emit(ent)
  emit(eoiCode)
  if (nbits > 0) bytes.push(acc & 255)
  return Uint8Array.from(bytes)
}

function packSubBlocks(data: Uint8Array) {
  const parts: number[] = []
  for (let offset = 0; offset < data.length; offset += 255) {
    const size = Math.min(255, data.length - offset)
    parts.push(size)
    for (let i = 0; i < size; i += 1) parts.push(data[offset + i])
  }
  parts.push(0)
  return parts
}

type Palette = { colors: Array<[number, number, number]>; indexOf: (r: number, g: number, b: number) => number }

function buildPalette(frames: readonly Uint8ClampedArray[]): Palette {
  const counts = new Map<string, { rgb: [number, number, number]; count: number }>()
  const add = (rgb: [number, number, number], count: number) => {
    const key = rgb.join(',')
    const existing = counts.get(key)
    if (existing) existing.count += count
    else counts.set(key, { rgb, count })
  }
  for (const frame of frames) {
    for (let i = 0; i < frame.length; i += 4) {
      if (frame[i + 3] === 0) continue
      add([frame[i], frame[i + 1], frame[i + 2]], 1)
    }
  }
  let reduced = false
  if (counts.size > 255) {
    const coarse = [...counts.values()]
    counts.clear()
    for (const entry of coarse) {
      add([entry.rgb[0] & 0xf8, entry.rgb[1] & 0xf8, entry.rgb[2] & 0xf8], entry.count)
    }
    reduced = true
  }
  const colors = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 255)
    .map((entry) => entry.rgb)
  const exact = new Map(colors.map((rgb, index) => [rgb.join(','), index + 1]))

  return {
    colors,
    indexOf(r, g, b) {
      const key = reduced ? `${r & 0xf8},${g & 0xf8},${b & 0xf8}` : `${r},${g},${b}`
      const hit = exact.get(key)
      if (hit) return hit
      if (colors.length === 0) return 0
      let best = 1
      let bestDist = Number.POSITIVE_INFINITY
      for (let i = 0; i < colors.length; i += 1) {
        const [pr, pg, pb] = colors[i]
        const dist = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2
        if (dist < bestDist) {
          bestDist = dist
          best = i + 1
        }
      }
      return best
    },
  }
}

function tableSizeBits(colorCount: number) {
  let size = 2
  let bits = 0
  while (size < colorCount && bits < 7) {
    size *= 2
    bits += 1
  }
  return { size, bits }
}

export function encodeGif(width: number, height: number, frames: readonly Uint8ClampedArray[], delayCs: number) {
  const palette = buildPalette(frames)
  const { size: tableLength, bits } = tableSizeBits(Math.max(2, palette.colors.length + 1))
  const minCodeSize = Math.max(2, bits + 1)
  const bytes: number[] = []
  const pushString = (value: string) => {
    for (let i = 0; i < value.length; i += 1) bytes.push(value.charCodeAt(i))
  }
  const push16 = (value: number) => {
    bytes.push(value & 255, (value >> 8) & 255)
  }

  pushString('GIF89a')
  push16(width)
  push16(height)
  bytes.push(0x80 | (7 << 4) | bits, 0, 0)
  for (let i = 0; i < tableLength; i += 1) {
    const rgb = i === 0 ? [0, 0, 0] : palette.colors[i - 1] ?? [0, 0, 0]
    bytes.push(rgb[0], rgb[1], rgb[2])
  }
  bytes.push(0x21, 0xff, 0x0b)
  pushString('NETSCAPE2.0')
  bytes.push(3, 1, 0, 0, 0)

  for (const frame of frames) {
    const indexes = new Uint8Array(width * height)
    for (let pixel = 0, i = 0; pixel < indexes.length; pixel += 1, i += 4) {
      indexes[pixel] = frame[i + 3] === 0 ? 0 : palette.indexOf(frame[i], frame[i + 1], frame[i + 2])
    }
    bytes.push(0x21, 0xf9, 0x04, 0x09)
    push16(delayCs)
    bytes.push(0, 0)
    bytes.push(0x2c)
    push16(0)
    push16(0)
    push16(width)
    push16(height)
    bytes.push(0, minCodeSize)
    for (const part of packSubBlocks(lzw(indexes, minCodeSize))) bytes.push(part)
  }
  bytes.push(0x3b)
  return Uint8Array.from(bytes)
}
