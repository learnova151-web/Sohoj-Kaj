const fs = require('fs');

function resampleTo16k(chunks, sampleRate) {
  const totalLen = chunks.reduce((n, c) => n + c.length, 0);
  const mixed = new Float32Array(totalLen);
  let off = 0;
  for (const c of chunks) {
    mixed.set(c, off);
    off += c.length;
  }
  const targetRate = 16000;
  if (sampleRate === targetRate) return mixed;
  const ratio = sampleRate / targetRate;
  const outLen = Math.floor(totalLen / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, totalLen - 1);
    const frac = pos - i0;
    out[i] = mixed[i0] * (1 - frac) + mixed[i1] * frac;
  }
  return out;
}

function writeWav(filePath, samples, sampleRate) {
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    pcm.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(filePath, Buffer.concat([header, pcm]));
}

function rms(chunk) {
  let sum = 0;
  for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
  return Math.sqrt(sum / Math.max(1, chunk.length));
}

module.exports = { resampleTo16k, writeWav, rms };
