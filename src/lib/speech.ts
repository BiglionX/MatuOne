/**
 * 朗读助手：绘本页、提示气泡都用系统语音读中文。
 *
 * Python 模块的「进关小绘本」和 Blockly 的「绘本情境导入」共用这一套参数，
 * 免得两处各写一份 voice / rate，念出来的声音不一样。
 */

/** 浏览器不支持语音合成时静默跳过。 */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** 读一段中文。会自动打断上一句，避免两页叠在一起念。 */
export function speak(text: string): void {
  if (!canSpeak() || !text.trim()) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 0.92
  utter.pitch = 1.05
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang?.toLowerCase().startsWith('zh'))
  if (voice) utter.voice = voice
  window.speechSynthesis.speak(utter)
}

/** 停止朗读。组件卸载时必须调，否则会在别的页面上继续念。 */
export function stopSpeaking(): void {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
}
