import type { CommandSpeaker } from "./command-communications";

export type SpeechMode = "silent" | "reports" | "full";

export type VoiceSettings = {
  mode: SpeechMode;
  pushToTalk: boolean;
  rate: number;
  volume: number;
  voiceURI: string;
  wakeWordEnabled: boolean;
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    0: {
      transcript: string;
    };
  }>;
};

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

export const voiceSettingsKey = "entral-voice-settings";

export const defaultVoiceSettings: VoiceSettings = {
  mode: "reports",
  pushToTalk: true,
  rate: 0.94,
  volume: 0.82,
  voiceURI: "",
  wakeWordEnabled: false
};

export const speechModeLabels: Record<SpeechMode, string> = {
  full: "Full Voice",
  reports: "Reports Only",
  silent: "Silent"
};

export function sanitizeVoiceSettings(value: unknown): VoiceSettings {
  const parsed = typeof value === "object" && value !== null ? value as Partial<VoiceSettings> : {};
  const mode = parsed.mode === "silent" || parsed.mode === "full" || parsed.mode === "reports" ? parsed.mode : defaultVoiceSettings.mode;

  return {
    mode,
    pushToTalk: typeof parsed.pushToTalk === "boolean" ? parsed.pushToTalk : defaultVoiceSettings.pushToTalk,
    rate: typeof parsed.rate === "number" ? Math.min(Math.max(parsed.rate, 0.65), 1.35) : defaultVoiceSettings.rate,
    volume: typeof parsed.volume === "number" ? Math.min(Math.max(parsed.volume, 0), 1) : defaultVoiceSettings.volume,
    voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : defaultVoiceSettings.voiceURI,
    wakeWordEnabled: typeof parsed.wakeWordEnabled === "boolean" ? parsed.wakeWordEnabled : defaultVoiceSettings.wakeWordEnabled
  };
}

export function readStoredVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") {
    return defaultVoiceSettings;
  }

  try {
    return sanitizeVoiceSettings(JSON.parse(window.localStorage.getItem(voiceSettingsKey) ?? "{}"));
  } catch {
    return defaultVoiceSettings;
  }
}

export function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return undefined;

  const browserWindow = window as Window & typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

export function collectTranscript(event: SpeechRecognitionEventLike) {
  let transcript = "";

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    transcript += event.results[index][0].transcript;
  }

  return transcript.trim();
}

export function normalizeWakeWordCommand(transcript: string, wakeWordEnabled: boolean) {
  const cleaned = transcript.trim();
  const wakeMatch = /^(entral|commander|marshal|general)[,\s:;-]+(.+)$/i.exec(cleaned);

  if (wakeMatch) {
    return {
      accepted: true,
      command: wakeMatch[2].trim()
    };
  }

  return {
    accepted: !wakeWordEnabled,
    command: cleaned
  };
}

export function isReportTransmission(content: string) {
  return /\b(situation|analysis|recommendation|next actions|report|briefing|alert|mission update|readiness|critical|offline|error)\b/i.test(content);
}

export function shouldSpeakTransmission(mode: SpeechMode, content: string) {
  if (mode === "silent") return false;
  if (mode === "full") return true;
  return isReportTransmission(content);
}

export function voiceProfileForSpeaker(speaker: CommandSpeaker) {
  if (speaker === "marshal") return { pitch: 0.92, rateOffset: -0.02 };
  if (speaker === "general") return { pitch: 0.94, rateOffset: -0.01 };
  if (speaker === "commander") return { pitch: 1, rateOffset: 0.02 };
  if (speaker === "soldier") return { pitch: 1.06, rateOffset: 0.04 };
  return { pitch: 0.9, rateOffset: -0.03 };
}

export function speechTextForTransmission(sourceLabel: string, content: string) {
  return `${sourceLabel.replace("[", "").replace("]", "")}. ${content.replace(/\n+/g, ". ")}`;
}
