import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface DictationProps {
  onDictation: (text: string) => void;
}

// Fix: Cast window to any to access non-standard SpeechRecognition APIs
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

const Dictation: React.FC<DictationProps> = ({ onDictation }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Fix: Use 'any' for the ref type to avoid a name collision with the 'SpeechRecognition' constant.
  const recognitionRef = useRef<any | null>(null);

  // Use a ref to track the "isListening" state to avoid stale closures in recognition event handlers
  const listeningRef = useRef(false);
  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (!isSpeechRecognitionSupported) {
      console.warn("Speech recognition not supported by this browser.");
      return;
    }
    
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const fullTranscript = finalTranscript + interimTranscript;
      setTranscript(fullTranscript);
      onDictation(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
        // If the user didn't manually stop it, restart the recognition service.
        // This handles cases where the browser times out after a pause.
        if (listeningRef.current) {
            recognition.start();
        }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      // Sync transcript in case of manual edits before starting
      onDictation(transcript);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTranscript(newText);
    onDictation(newText);
  }

  if (!isSpeechRecognitionSupported) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md">
            <textarea
              className="w-full p-3 bg-white border border-slate-300 rounded-md h-32 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Your browser does not support voice dictation. You can type your notes here."
              value={transcript}
              onChange={handleTextChange}
            />
        </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleListening}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors text-white ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          <MicrophoneIcon />
          <span>{isListening ? 'Stop Listening' : 'Start Dictation'}</span>
        </button>
        {isListening && <div className="text-sm text-slate-500 animate-pulse">Listening...</div>}
      </div>
      <textarea
        className="w-full p-3 bg-white border border-slate-300 rounded-md h-32 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        placeholder="Your dictated notes or typed text will appear here..."
        value={transcript}
        onChange={handleTextChange}
      />
    </div>
  );
};

export default Dictation;