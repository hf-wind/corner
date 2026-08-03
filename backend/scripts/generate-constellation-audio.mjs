import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sampleRate = 22050
const duration = 72
const channels = 2
const frames = sampleRate * duration
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../prisma/seed-assets/audio/constellation-ambient.wav')
const dataBytes = frames * channels * 2
const buffer = Buffer.alloc(44 + dataBytes)

buffer.write('RIFF', 0)
buffer.writeUInt32LE(36 + dataBytes, 4)
buffer.write('WAVE', 8)
buffer.write('fmt ', 12)
buffer.writeUInt32LE(16, 16)
buffer.writeUInt16LE(1, 20)
buffer.writeUInt16LE(channels, 22)
buffer.writeUInt32LE(sampleRate, 24)
buffer.writeUInt32LE(sampleRate * channels * 2, 28)
buffer.writeUInt16LE(channels * 2, 32)
buffer.writeUInt16LE(16, 34)
buffer.write('data', 36)
buffer.writeUInt32LE(dataBytes, 40)

const chord = [55, 82.4069, 110, 138.591, 164.814]
const chimes = [220, 277.183, 329.628, 415.305, 554.365]
let randomState = 0x51a7cafe
let filteredNoiseLeft = 0
let filteredNoiseRight = 0
const random = () => {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0
  return randomState / 0xffffffff * 2 - 1
}

for (let frame = 0; frame < frames; frame += 1) {
  const time = frame / sampleRate
  const edgeFade = Math.min(1, time / 3, (duration - time) / 3)
  const breath = .72 + .28 * Math.sin(Math.PI * 2 * time / 18 - .8)
  let left = 0
  let right = 0

  chord.forEach((frequency, index) => {
    const level = (.16 - index * .018) * breath
    const phase = Math.PI * 2 * frequency * time
    const drift = .018 * Math.sin(Math.PI * 2 * time / (12 + index * 3))
    left += Math.sin(phase + drift + index * .31) * level
    right += Math.sin(phase - drift - index * .27) * level
  })

  const pulse = .5 + .5 * Math.sin(Math.PI * 2 * time / 9)
  left += Math.sin(Math.PI * 2 * 41.2034 * time) * .075 * pulse
  right += Math.sin(Math.PI * 2 * 41.2034 * time + .08) * .075 * pulse

  const chimeIndex = Math.floor(time / 9) % chimes.length
  const chimeAge = time % 9
  if (chimeAge < 5.8) {
    const envelope = Math.exp(-chimeAge * .62) * Math.min(1, chimeAge * 5)
    const frequency = chimes[chimeIndex]
    left += Math.sin(Math.PI * 2 * frequency * time + chimeIndex) * .09 * envelope
    right += Math.sin(Math.PI * 2 * frequency * 1.002 * time - chimeIndex) * .09 * envelope
  }

  filteredNoiseLeft += (random() - filteredNoiseLeft) * .004
  filteredNoiseRight += (random() - filteredNoiseRight) * .004
  left += filteredNoiseLeft * .035
  right += filteredNoiseRight * .035

  const master = edgeFade * .72
  left = Math.tanh(left * master)
  right = Math.tanh(right * master)
  const offset = 44 + frame * channels * 2
  buffer.writeInt16LE(Math.round(left * 32767), offset)
  buffer.writeInt16LE(Math.round(right * 32767), offset + 2)
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, buffer)
console.log(`Generated ${output} (${(buffer.length / 1024 / 1024).toFixed(2)} MiB)`)
