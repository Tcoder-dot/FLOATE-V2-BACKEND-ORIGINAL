import React, { useState, useRef, useEffect } from "react";
import { Search, Mic, Camera, ArrowRight, Loader2, StopCircle } from "lucide-react";
import { api } from "../../services/api";

interface CommandBarProps {
  initialQuery?: string;
  onSearchSubmit?: (query: string, category?: string, maxPrice?: number) => void;
  onSearch?: (query: string, category?: string, maxPrice?: number) => void;
  isSticky?: boolean;
  className?: string;
}

const SEARCH_PLACEHOLDERS = [
  "Wetin you dey find? e.g. 'human hair, 15k, Balogun'",
  "Kedu ihe ị na-achọ? e.g. 'phones, laptops, Alaba'",
  "Kí ni o ń wá? e.g. 'fabrics, shoes, Balogun'",
  "Mene ne kake nema? e.g. 'perfumes, wristwatches, Kano'",
  "What are you looking for? e.g. 'designer bags, Trade Fair'"
];

export const CommandBar: React.FC<CommandBarProps> = ({
  initialQuery = "",
  onSearchSubmit,
  onSearch,
  className = ""
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [langIndex, setLangIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intakeMessage, setIntakeMessage] = useState<string | null>(null);

  // Rotate language prompt every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setLangIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const triggerSearch = (q: string, cat?: string, price?: number) => {
    const cleanQ = q.trim();
    if (!cleanQ) return;
    if (typeof onSearchSubmit === 'function') {
      onSearchSubmit(cleanQ, cat, price);
    } else if (typeof onSearch === 'function') {
      onSearch(cleanQ, cat, price);
    } else {
      window.location.href = `/search?q=${encodeURIComponent(cleanQ)}`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(query);
  };

  // Voice Intake Flow
  const startRecording = async () => {
    setIntakeMessage("Listening... Speak your shopping request");
    audioChunksRef.current = [];

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          setIsProcessing(true);
          setIntakeMessage("Analyzing voice request...");

          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result ? (reader.result as string).split(",")[1] : "";
            try {
              const res = await api.intakeVoice(undefined, base64Audio);
              setIsProcessing(false);
              setIsRecording(false);
              if (res.intent === "search" && res.query) {
                setQuery(res.query);
                setIntakeMessage(null);
                triggerSearch(res.query, undefined, res.max_price_naira);
              } else {
                setIntakeMessage(res.message || "Could not detect product. Please try typing.");
                setTimeout(() => setIntakeMessage(null), 3000);
              }
            } catch (err) {
              setIsProcessing(false);
              setIsRecording(false);
              setIntakeMessage("Voice error. Please type your query.");
              setTimeout(() => setIntakeMessage(null), 3000);
            }
          };

          // Stop all audio tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } else {
        fallbackVoicePrompt();
      }
    } catch (err) {
      console.warn("Microphone access error:", err);
      fallbackVoicePrompt();
    }
  };

  const fallbackVoicePrompt = async () => {
    setIsRecording(true);
    setIntakeMessage("Listening... (Speak naturally)");
    setTimeout(async () => {
      setIsProcessing(true);
      try {
        const res = await api.intakeVoice("I am looking for quality shoes under 50000");
        setIsProcessing(false);
        setIsRecording(false);
        if (res.query) {
          setQuery(res.query);
          setIntakeMessage(null);
          triggerSearch(res.query, undefined, res.max_price_naira);
        }
      } catch (err) {
        setIsProcessing(false);
        setIsRecording(false);
      }
    }, 2000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  };

  // Photo Drop Flow
  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setIntakeMessage("Scanning photo with Gemini AI...");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await api.intakeImage(base64Data);
        setIsProcessing(false);
        if (res.intent === "search" && res.query) {
          setQuery(res.query);
          setIntakeMessage(null);
          onSearchSubmit(res.query, res.category);
        } else {
          setIntakeMessage("No matching product found. Try another image.");
          setTimeout(() => setIntakeMessage(null), 3000);
        }
      } catch (err) {
        setIsProcessing(false);
        setIntakeMessage("Could not scan photo. Please try typing.");
        setTimeout(() => setIntakeMessage(null), 3000);
      }
    };
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center bg-[#FFFFFF] border-2 border-[#0A4D3C]/15 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 shadow-floate-card focus-within:border-[#0A4D3C] transition-all"
        >
          <Search className="w-5 h-5 text-[#0A4D3C] ml-1 flex-shrink-0" />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={SEARCH_PLACEHOLDERS[langIndex]}
            className="w-full bg-transparent px-3 py-1 text-xs sm:text-sm text-[#13241F] placeholder-[#5B6E66] focus:outline-none focus:ring-0 focus:border-transparent outline-none font-semibold truncate transition-all duration-300"
            aria-label={SEARCH_PLACEHOLDERS[langIndex]}
          />

          {/* Voice Intake Button (Gold Circle Button) */}
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse mr-1"
              aria-label="Stop recording"
            >
              <StopCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-[#F59E0B] text-[#13241F] hover:bg-[#D97706] transition-all flex items-center justify-center flex-shrink-0 shadow-xs active:scale-95"
              aria-label="Voice search with mic"
            >
              <Mic className="w-4 h-4 font-black" />
            </button>
          )}

          {/* Camera Button */}
          <button
            type="button"
            onClick={handlePhotoClick}
            disabled={isProcessing || isRecording}
            className="p-1.5 ml-1 rounded-full hover:bg-[#E6F4EA] text-[#5B6E66] hover:text-[#0A4D3C] transition-colors flex-shrink-0"
            aria-label="Photo search"
          >
            <Camera className="w-4 h-4" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={!query.trim() || isProcessing}
            className="ml-1.5 px-3.5 py-1.5 bg-[#0A4D3C] hover:bg-[#064E3B] text-white rounded-full flex items-center justify-center font-extrabold text-xs transition-all active:scale-95 disabled:opacity-40 shadow-xs flex-shrink-0"
            aria-label="Submit search"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="flex items-center gap-1">
                <span className="hidden sm:inline">Find</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F59E0B]" />
              </span>
            )}
          </button>
        </form>

        {/* Processing / Intake Feedback Banner */}
        {intakeMessage && (
          <div className="absolute top-full left-0 right-0 mt-2 px-4 py-2 bg-[#E6F4EA] border border-[#CEEAD6] rounded-xl text-xs text-[#0A4D3C] font-semibold flex items-center justify-between animate-fade-in shadow-sm z-20">
            <div className="flex items-center gap-2">
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{intakeMessage}</span>
            </div>
            <button
              onClick={() => setIntakeMessage(null)}
              className="text-[#5B6E66] hover:text-[#13241F] text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
