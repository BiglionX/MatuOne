/**
 * 启动器音效：全部用 WebAudio 现场合成，不带任何音频文件。
 * 默认关闭，由顶栏的喇叭按钮开启（浏览器也要求用户手势后才能出声）。
 */

type LauncherSound = 'hover' | 'click' | 'locked' | 'boot'

let context: AudioContext | null = null
let enabled = false

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  if (context.state === 'suspended') void context.resume()
  return context
}

export function isLauncherAudioEnabled(): boolean {
  return enabled
}

/** 打开或关闭音效，返回关闭后的状态 */
export function toggleLauncherAudio(): boolean {
  enabled = !enabled
  if (enabled) ensureContext()
  return enabled
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  const ctx = ensureContext()
  if (!ctx || !enabled) return
  const start = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  amp.gain.setValueAtTime(0, start)
  amp.gain.linearRampToValueAtTime(gain, start + 0.02)
  amp.gain.linearRampToValueAtTime(0, start + dur)
  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + dur)
}

export function playLauncherSound(kind: LauncherSound): void {
  if (!enabled) return
  if (kind === 'hover') {
    tone(880, 0.08, 'square', 0.05)
    return
  }
  if (kind === 'click') {
    tone(520, 0.12, 'sine', 0.1)
    tone(780, 0.16, 'sine', 0.08, 0.05)
    return
  }
  if (kind === 'locked') {
    tone(120, 0.26, 'sawtooth', 0.07)
    return
  }
  // boot：开机完成的三音上行
  tone(320, 0.2, 'sine', 0.08)
  tone(440, 0.28, 'sine', 0.08, 0.12)
  tone(660, 0.4, 'sine', 0.07, 0.24)
}
