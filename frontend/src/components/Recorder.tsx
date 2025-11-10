// src/components/Recorder.tsx
import { useRef, useState } from "react";
import axios from "axios";

export default function VoiceRecorder({ onTranscribed }: { onTranscribed: (t: string) => void }) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = []; // reset
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = []; // clear
        const file = new File([blob], "speech.webm", { type: "audio/webm" });
        const form = new FormData();
        form.append("file", file);

        try {
          const { data } = await axios.post("http://localhost:8000/api/v1/transcribe_audio", form);
          if (data.text) onTranscribed(data.text.trim());
        } catch (err) {
          console.error("Transcription failed:", err);
          alert("Transcription failed. Check backend logs or FFmpeg support.");
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Unable to access microphone. Check permissions.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
    }
  };

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      className={`rounded-2xl px-4 py-2 text-white font-medium transition ${
        recording ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
      }`}
    >
      {recording ? "⏹ Stop Recording" : "🎙️ Speak"}
    </button>
  );
}
