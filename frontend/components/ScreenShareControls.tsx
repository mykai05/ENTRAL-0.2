"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { Eye, MonitorUp, ShieldAlert, Square } from "lucide-react";
import { Button } from "./Button";

export type ScreenShareControlsHandle = {
  getLatestScreenshot: () => Promise<string | null>;
  isSharing: () => boolean;
  stopSharing: () => void;
};

type ScreenShareControlsProps = {
  disabled?: boolean;
  onAnalyze: (screenshot: string, prompt: string) => Promise<void>;
  onError: (message: string) => void;
};

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export const ScreenShareControls = forwardRef<ScreenShareControlsHandle, ScreenShareControlsProps>(
  function ScreenShareControls({ disabled = false, onAnalyze, onError }, ref) {
    const [isSharing, setIsSharing] = useState(false);
    const [showNotice, setShowNotice] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [latestCapturedAt, setLatestCapturedAt] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const latestFrameRef = useRef<string | null>(null);

    const captureFrame = useCallback(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
        return latestFrameRef.current;
      }

      const maxWidth = 1280;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d");

      if (!context) {
        return latestFrameRef.current;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      latestFrameRef.current = canvas.toDataURL("image/jpeg", 0.68);
      setLatestCapturedAt(new Date().toLocaleTimeString());
      return latestFrameRef.current;
    }, []);

    const stopSharing = useCallback(() => {
      stopTracks(streamRef.current);
      streamRef.current = null;
      latestFrameRef.current = null;
      setIsSharing(false);
      setShowNotice(false);
      setLatestCapturedAt(null);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      getLatestScreenshot: async () => captureFrame(),
      isSharing: () => isSharing,
      stopSharing
    }), [captureFrame, isSharing, stopSharing]);

    useEffect(() => {
      if (!isSharing) {
        return;
      }

      const timer = window.setInterval(() => {
        captureFrame();
      }, 2500);

      return () => window.clearInterval(timer);
    }, [captureFrame, isSharing]);

    useEffect(() => () => stopTracks(streamRef.current), []);

    async function startSharing() {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        onError("Screen sharing is not available in this browser.");
        setShowNotice(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        streamRef.current = stream;

        const [track] = stream.getVideoTracks();
        track?.addEventListener("ended", stopSharing);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsSharing(true);
        setShowNotice(false);
        window.setTimeout(() => captureFrame(), 500);
      } catch {
        onError("Screen sharing permission was denied.");
        setShowNotice(false);
      }
    }

    async function analyzeScreen() {
      const screenshot = captureFrame();

      if (!screenshot) {
        onError("Share your screen first, then try analysis again.");
        return;
      }

      setIsAnalyzing(true);

      try {
        await onAnalyze(screenshot, "What do you see on my screen?");
      } finally {
        setIsAnalyzing(false);
      }
    }

    return (
      <section className="screen-share-panel" data-academy="screen-share" aria-label="Screen sharing">
        <div>
          <strong>{isSharing ? "Screen sharing active" : "Screen view"}</strong>
          <span>{isSharing ? `Latest frame ${latestCapturedAt ?? "pending"}` : "Optional. Nothing is shared until you approve it."}</span>
        </div>
        <div className="screen-share-actions">
          {isSharing ? (
            <>
              <Button type="button" variant="secondary" onClick={() => void analyzeScreen()} disabled={disabled || isAnalyzing}>
                <Eye aria-hidden="true" size={18} />
                {isAnalyzing ? "Analyzing..." : "Analyze screen"}
              </Button>
              <Button type="button" variant="secondary" onClick={stopSharing}>
                <Square aria-hidden="true" size={18} />
                Stop sharing
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setShowNotice(true)} disabled={disabled}>
              <MonitorUp aria-hidden="true" size={18} />
              Share Screen
            </Button>
          )}
        </div>
        {isSharing ? <span className="live-indicator" role="status">Live screen context enabled</span> : null}
        {showNotice ? (
          <div className="privacy-notice" role="dialog" aria-label="Screen sharing privacy notice">
            <ShieldAlert aria-hidden="true" size={22} />
            <p>The AI will see everything on your screen. This can be stopped at any time.</p>
            <div className="row-actions">
              <Button type="button" onClick={() => void startSharing()}>
                Start sharing
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowNotice(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        <video ref={videoRef} className="screen-share-video" muted playsInline />
        <canvas ref={canvasRef} className="screen-share-canvas" />
      </section>
    );
  }
);
