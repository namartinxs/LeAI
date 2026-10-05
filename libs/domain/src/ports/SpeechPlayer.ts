export interface SpeechCallbacks {
  onWord(charIndex: number): void;
  onEnd(): void;
}

/** Porta: fala um texto e avisa a posição de cada palavra enquanto fala. */
export interface SpeechPlayer {
  speak(text: string, callbacks: SpeechCallbacks): void;
  cancel(): void;
}
