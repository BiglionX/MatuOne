/**
 * 关卡音效：全部用 WebAudio 现场合成，不带任何音频文件。
 *
 * 和启动器音效（launcherAudio）一个路子：默认关闭，由关卡页的喇叭按钮打开，
 * 浏览器也要求用户手势之后才能出声。
 *
 * 关卡里会响的有四种：走一步、吃金币、撞墙、通关；外加一次「没通关」的失败音。
 */

export type GameSound = 'step' | 'coin' | 'bump' | 'win' | 'fail'

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

export function isGameSoundEnabled(): boolean {
  return enabled
}

/** 打开或关闭关卡音效，返回关闭后的状态。 */
export function toggleGameSound(): boolean {
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
  amp.gain.linearRampToValueAtTime(gain, start + 0.015)
  amp.gain.linearRampToValueAtTime(0, start + dur)
  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + dur)
}

export function playGameSound(kind: GameSound): void {
  if (!enabled) return
  if (kind === 'step') {
    // 走一步：很轻的一声「哒」，连着走也不吵。
    tone(660, 0.07, 'sine', 0.05)
    return
  }
  if (kind === 'coin') {
    // 吃金币：两声上行，叮咚。
    tone(880, 0.1, 'square', 0.07)
    tone(1320, 0.16, 'square', 0.06, 0.07)
    return
  }
  if (kind === 'bump') {
    // 撞墙：闷闷的一声低响。
    tone(140, 0.16, 'sawtooth', 0.08)
    return
  }
  if (kind === 'win') {
    // 通关：四音上行的小乐句。
    tone(523, 0.16, 'sine', 0.08)
    tone(659, 0.18, 'sine', 0.08, 0.12)
    tone(784, 0.2, 'sine', 0.08, 0.24)
    tone(1047, 0.34, 'sine', 0.09, 0.36)
    return
  }
  // fail：没通关，两声下行，提醒再来一次。
  tone(392, 0.18, 'triangle', 0.07)
  tone(294, 0.26, 'triangle', 0.07, 0.14)
}
