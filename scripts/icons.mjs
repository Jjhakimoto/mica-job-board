import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const cx = (size - 1) / 2
  const cy = cx
  const outer = size * 0.34
  const inner = size * 0.16
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const i = row + 1 + x * 4
      const dx = x - cx
      const dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      const ring = d <= outer && d >= inner
      raw[i] = ring ? 0x3f : 0xf3
      raw[i + 1] = ring ? 0x6b : 0xf0
      raw[i + 2] = ring ? 0x56 : 0xe8
      raw[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

writeFileSync('public/icon-192.png', png(192))
writeFileSync('public/icon-512.png', png(512))
