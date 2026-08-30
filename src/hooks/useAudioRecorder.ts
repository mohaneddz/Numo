import { useCallback, useRef, useState } from "react";
import { inputConstraints } from "../services/audio/audioDevices";

export interface AudioRecorderResult {
    isRecording: boolean;
    audioLevel: number;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    cancelRecording: () => void;
}

export function useAudioRecorder(): AudioRecorderResult {
    const [isRecording, setIsRecording] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const stopStream = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            void audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    const startRecording = useCallback(async () => {
        try {
            // Honours the microphone chosen in Settings, falling back to the
            // system default if that device has since been unplugged.
            const stream = await navigator.mediaDevices.getUserMedia(inputConstraints());
            mediaStreamRef.current = stream;

            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = recorder;
            recordedChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            // Audio Level Meter
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateLevel = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                const normalized = Math.min(1, average / 128);
                setAudioLevel(normalized);
                animationFrameRef.current = requestAnimationFrame(updateLevel);
            };

            updateLevel();
            recorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Failed to start recording:", error);
            throw error;
        }
    }, []);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
                stopStream();
                setIsRecording(false);
                resolve(null);
                return;
            }

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
                stopStream();
                setIsRecording(false);
                setAudioLevel(0);
                resolve(blob);
            };

            mediaRecorderRef.current.stop();
        });
    }, [stopStream]);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }
        stopStream();
        setIsRecording(false);
        setAudioLevel(0);
        recordedChunksRef.current = [];
    }, [stopStream]);

    return {
        isRecording,
        audioLevel,
        startRecording,
        stopRecording,
        cancelRecording,
    };
}
