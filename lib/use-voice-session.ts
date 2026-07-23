"use client";

import { useEffect, useRef, useState } from "react";
import type { TranscriptEntry } from "@/lib/session-store";

type VoiceStatus =
  | "Connecting..."
  | "Listening..."
  | "Processing..."
  | "Speaking..."
  | "Paused"
  | "Disconnected";

type Options = {
  userId: string;
  muted: boolean;
  paused: boolean;
  speakerOn: boolean;
};

type ServerMessage = {
  type: string;
  text?: string;
  data?: string;
  message?: string;
  query?: string;
  handle?: string;
};

const configuredUrl =
  process.env.NEXT_PUBLIC_VOICE_WS_URL ?? "ws://localhost:8000/ws/voice";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return window.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function resample(input: Float32Array, inputRate: number, outputRate: number) {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const length = Math.round(input.length / ratio);
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(left + 1, input.length - 1);
    const amount = sourceIndex - left;
    output[index] = input[left] * (1 - amount) + input[right] * amount;
  }
  return output;
}

function floatToPcm16(input: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  input.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      index * 2,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true
    );
  });
  return new Uint8Array(buffer);
}

export function useVoiceSession({
  userId,
  muted,
  paused,
  speakerOn
}: Options) {
  const [status, setStatus] = useState<VoiceStatus>("Connecting...");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState("");
  const [ragQuery, setRagQuery] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackTimeRef = useRef(0);
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mutedRef = useRef(muted);
  const pausedRef = useRef(paused);
  const speakerRef = useRef(speakerOn);
  const currentSpeakerRef = useRef<TranscriptEntry["speaker"] | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
    pausedRef.current = paused;
    speakerRef.current = speakerOn;
    mediaRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted && !paused;
    });

    if (paused) {
      setStatus("Paused");
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "audio_stream_end" }));
      }
    } else if (socketRef.current?.readyState === WebSocket.OPEN) {
      setStatus("Listening...");
    }
  }, [muted, paused, speakerOn]);

  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    const url = new URL(configuredUrl);
    url.searchParams.set("user_id", userId);
    const socket = new WebSocket(url);
    socketRef.current = socket;
    setStatus("Connecting...");

    function appendTranscript(
      speaker: TranscriptEntry["speaker"],
      text: string
    ) {
      const clean = text.trim();
      if (!clean) return;
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      setTranscript((items) => {
        const last = items[items.length - 1];
        if (last && currentSpeakerRef.current === speaker && last.speaker === speaker) {
          return [
            ...items.slice(0, -1),
            { ...last, text: `${last.text} ${clean}`.trim() }
          ];
        }
        currentSpeakerRef.current = speaker;
        return [...items, { speaker, text: clean, time }];
      });
    }

    function stopPlayback() {
      playbackSourcesRef.current.forEach((source) => {
        try {
          source.stop();
        } catch {
          // Source may already have ended.
        }
      });
      playbackSourcesRef.current = [];
      playbackTimeRef.current = 0;
    }

    async function playAudio(base64: string) {
      if (!speakerRef.current || disposed) return;
      const context =
        playbackContextRef.current ?? new AudioContext({ sampleRate: 24000 });
      playbackContextRef.current = context;
      if (context.state === "suspended") await context.resume();

      const bytes = base64ToBytes(base64);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const samples = new Float32Array(Math.floor(bytes.byteLength / 2));
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = view.getInt16(index * 2, true) / 32768;
      }
      const buffer = context.createBuffer(1, samples.length, 24000);
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      const startAt = Math.max(context.currentTime, playbackTimeRef.current);
      source.start(startAt);
      playbackTimeRef.current = startAt + buffer.duration;
      playbackSourcesRef.current.push(source);
      source.onended = () => {
        playbackSourcesRef.current = playbackSourcesRef.current.filter(
          (item) => item !== source
        );
      };
    }

    async function startCapture() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        mediaRef.current = stream;
        const context = new AudioContext();
        captureContextRef.current = context;
        if (context.state === "suspended") await context.resume();
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(2048, 1, 1);
        const silentGain = context.createGain();
        silentGain.gain.value = 0;
        processorRef.current = processor;
        processor.onaudioprocess = (event) => {
          const activeSocket = socketRef.current;
          if (
            !activeSocket ||
            activeSocket.readyState !== WebSocket.OPEN ||
            mutedRef.current ||
            pausedRef.current
          ) {
            return;
          }
          const mono = event.inputBuffer.getChannelData(0);
          const pcm = floatToPcm16(resample(mono, context.sampleRate, 16000));
          activeSocket.send(
            JSON.stringify({ type: "audio", data: bytesToBase64(pcm) })
          );
        };
        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(context.destination);
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !mutedRef.current && !pausedRef.current;
        });
      } catch {
        setError("Microphone permission is required for a voice session.");
      }
    }

    socket.onopen = () => {
      if (disposed) return;
      setError("");
      setStatus(pausedRef.current ? "Paused" : "Listening...");
      void startCapture();
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "audio" && message.data) {
        setStatus("Speaking...");
        void playAudio(message.data);
      } else if (message.type === "transcript_input" && message.text) {
        setStatus("Processing...");
        appendTranscript("You", message.text);
      } else if (message.type === "transcript_output" && message.text) {
        setStatus("Speaking...");
        appendTranscript("Vox AI", message.text);
      } else if (message.type === "turn_complete") {
        currentSpeakerRef.current = null;
        setStatus(pausedRef.current ? "Paused" : "Listening...");
      } else if (message.type === "interrupted") {
        stopPlayback();
        setStatus(pausedRef.current ? "Paused" : "Listening...");
      } else if (message.type === "kb_lookup") {
        setRagQuery(message.query ?? "");
        setStatus("Processing...");
      } else if (message.type === "kb_result") {
        setRagQuery("");
      } else if (message.type === "session_token" && message.handle) {
        window.localStorage.setItem("vox_gemini_session", message.handle);
      } else if (message.type === "error") {
        setError(message.message ?? "The voice service returned an error.");
        setStatus("Disconnected");
      }
    };
    socket.onerror = () => {
      setError("Cannot connect to the Vox backend at localhost:8000.");
      setStatus("Disconnected");
    };
    socket.onclose = () => {
      if (!disposed) setStatus("Disconnected");
    };

    const ping = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 10000);

    return () => {
      disposed = true;
      window.clearInterval(ping);
      stopPlayback();
      processorRef.current?.disconnect();
      processorRef.current = null;
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      mediaRef.current = null;
      void captureContextRef.current?.close();
      captureContextRef.current = null;
      void playbackContextRef.current?.close();
      playbackContextRef.current = null;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "audio_stream_end" }));
        socket.close(1000, "Session ended");
      }
      socketRef.current = null;
    };
  }, [userId]);

  return {
    status,
    transcript,
    error,
    ragQuery,
    connected: status !== "Connecting..." && status !== "Disconnected"
  };
}
