"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { Button } from "./Button";

type ChatInputProps = {
  disabled?: boolean;
  error?: string;
  initialText?: string;
  onSend: (text: string) => Promise<boolean>;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    0: {
      transcript: string;
    };
  }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition() {
  const browserWindow = window as Window & typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

export function ChatInput({ disabled = false, error, initialText = "", onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sent = await onSend(text);

    if (sent) {
      setText("");
    }
  }

  function toggleVoiceInput() {
    setVoiceError("");

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setVoiceError("Voice input was blocked or unavailable.");
    };
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      setText((current) => `${current}${current ? " " : ""}${transcript.trim()}`.trim());
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  const visibleError = error || voiceError;

  return (
    <form className="chat-input" onSubmit={handleSubmit} noValidate>
      <label htmlFor="chat-message">Enter directive</label>
      <div>
        <textarea
          aria-label="Enter command directive"
          aria-describedby={error ? "chat-message-error" : undefined}
          disabled={disabled}
          id="chat-message"
          name="message"
          onChange={(event) => setText(event.target.value)}
          placeholder="Issue a directive or request a report..."
          rows={2}
          value={text}
        />
        <Button type="button" disabled={disabled} onClick={toggleVoiceInput} variant="secondary" aria-label={isListening ? "Stop voice input" : "Start voice input"}>
          {isListening ? <MicOff aria-hidden="true" size={20} /> : <Mic aria-hidden="true" size={20} />}
          Voice
        </Button>
        <Button type="submit" disabled={disabled} aria-label="Send directive">
          <Send aria-hidden="true" size={20} />
          Send
        </Button>
      </div>
      {visibleError ? (
        <p className="field-error" id="chat-message-error" role="alert">
          {visibleError}
        </p>
      ) : null}
    </form>
  );
}
