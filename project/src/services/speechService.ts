export class SpeechService {
  private synth: SpeechSynthesis;
  private japaneseVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
    this.synth.addEventListener('voiceschanged', () => this.loadVoices());
  }

  private loadVoices() {
    const voices = this.synth.getVoices();
    const ja = voices.find(v => v.lang === 'ja-JP') || voices.find(v => v.lang.startsWith('ja'));
    this.japaneseVoice = ja || null;
  }

  speak(text: string): void {
    if (!text?.trim()) return;
    if (typeof this.synth.speak !== 'function') return;

    // Chrome 可能处于暂停/挂起状态，需先 resume 才能播放
    if (typeof this.synth.resume === 'function') {
      this.synth.resume();
    }
    this.synth.cancel();
    this.loadVoices();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8;

    if (this.japaneseVoice) {
      utterance.voice = this.japaneseVoice;
    }

    this.synth.speak(utterance);
  }

  stop(): void {
    this.synth.cancel();
  }
}

export const speechService = new SpeechService();
