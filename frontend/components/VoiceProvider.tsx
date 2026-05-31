"use client";

import React, { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CommandSpeaker } from "../lib/command-communications";
import {
  defaultVoiceSettings,
  readStoredVoiceSettings,
  shouldSpeakTransmission,
  speechModeLabels,
  speechTextForTransmission,
  voiceProfileForSpeaker,
  voiceSettingsKey,
  type VoiceSettings
} from "../lib/voice-command";

type VoiceContextValue = {
  isSpeechSupported: boolean;
  isSpeaking: boolean;
  settings: VoiceSettings;
  speak: (content: string, speaker: CommandSpeaker, sourceLabel: string) => void;
  stopSpeaking: () => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  voices: SpeechSynthesisVoice[];
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

function writeVoiceStorage(value: VoiceSettings) {
  try {
    window.localStorage.setItem(voiceSettingsKey, JSON.stringify(value));
  } catch {
    // Voice settings are optional local preferences; rendering should continue.
  }
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<VoiceSettings>(defaultVoiceSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  useEffect(() => {
    setSettings(readStoredVoiceSettings());
    setIsSpeechSupported("speechSynthesis" in window);
  }, []);

  useEffect(() => {
    writeVoiceStorage(settings);
  }, [settings]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;

    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((content: string, speaker: CommandSpeaker, sourceLabel: string) => {
    if (!("speechSynthesis" in window) || !shouldSpeakTransmission(settings.mode, content)) return;

    const utterance = new SpeechSynthesisUtterance(speechTextForTransmission(sourceLabel, content));
    const voice = voices.find((candidate) => candidate.voiceURI === settings.voiceURI) ?? voices.find((candidate) => candidate.lang.toLowerCase().startsWith("en"));
    const profile = voiceProfileForSpeaker(speaker);

    if (voice) {
      utterance.voice = voice;
    }

    utterance.volume = settings.volume;
    utterance.rate = Math.min(Math.max(settings.rate + profile.rateOffset, 0.55), 1.45);
    utterance.pitch = profile.pitch;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [settings, voices]);

  const value = useMemo<VoiceContextValue>(() => ({
    isSpeechSupported,
    isSpeaking,
    settings,
    speak,
    stopSpeaking,
    updateVoiceSettings: (nextSettings) => setSettings((current) => ({ ...current, ...nextSettings })),
    voices
  }), [isSpeechSupported, isSpeaking, settings, speak, stopSpeaking, voices]);

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const value = useContext(VoiceContext);

  if (!value) {
    throw new Error("useVoice must be used inside VoiceProvider.");
  }

  return value;
}

export { speechModeLabels };
