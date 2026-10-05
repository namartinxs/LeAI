import type { SpeechCallbacks, SpeechPlayer } from '@leai/domain';

export class WebSpeechPlayer implements SpeechPlayer {
  speak(text: string, { onWord, onEnd }: SpeechCallbacks): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.onboundary = (e) => {
      if (e.name === 'word') onWord(e.charIndex);
    };
    utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  }

  cancel(): void {
    window.speechSynthesis.cancel();
  }
}
