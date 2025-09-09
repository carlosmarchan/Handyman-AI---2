import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ImageFile } from '../types';
import { refineReport, initializeChat } from '../services/geminiService';
import Loader from './Loader';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import type { Chat } from '@google/genai';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import remarkGfm from 'https://esm.sh/remark-gfm@4';
import PhotoGallery from './PhotoGallery';

interface ReportGeneratorProps {
  isLoading: boolean;
  report: string;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  initialImages: ImageFile[];
  initialNotes: string;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ isLoading, report, chatHistory, setChatHistory, initialImages, initialNotes }) => {
  const [userInput, setUserInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [evidenceImages, setEvidenceImages] = useState<ImageFile[]>(initialImages);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if(report && !chatSessionRef.current) {
        chatSessionRef.current = initializeChat(initialImages, initialNotes, report);
    }
  }, [report, initialImages, initialNotes]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleRefine = async () => {
    if (!userInput.trim() || !chatSessionRef.current) return;

    const newUserMessage: ChatMessage = { author: 'user', content: userInput };
    // Show the user's prompt immediately
    setChatHistory(prev => [...prev, newUserMessage]);
    
    setUserInput('');
    setIsRefining(true);

    try {
      // The AI will return the entire updated report
      const refinedContent = await refineReport(chatSessionRef.current, userInput);
      
      // Find the last AI message and update it, or add a new one if none exists
      setChatHistory(prev => {
        const newHistory = [...prev];
        const lastAiMessageIndex = newHistory.map(m => m.author).lastIndexOf('ai');
        
        if (lastAiMessageIndex !== -1) {
            newHistory[lastAiMessageIndex].content = refinedContent;
        } else {
            // This case is unlikely if we start with an AI message, but as a fallback:
            newHistory.push({ author: 'ai', content: refinedContent });
        }
        return newHistory;
      });

    } catch (e) {
      console.error(e);
      // Add a new, separate error message instead of replacing the report
      const errorMessage: ChatMessage = { author: 'ai', content: "Sorry, I encountered an error. Please try again." };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsRefining(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-lg shadow-xl">
        <Loader />
        <h2 className="text-2xl font-semibold text-slate-700 mt-4">Generating Your Report</h2>
        <p className="text-slate-500 mt-2">The AI is analyzing your photos and notes. This might take a moment...</p>
      </div>
    );
  }

  const aiMessages = chatHistory.filter(m => m.author === 'ai');
  const userMessages = chatHistory.filter(m => m.author === 'user');
  const latestReport = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].content : '';

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">Step 3: Review and Refine Your Report</h2>
            <p className="text-slate-500 mt-1">Here is the draft of your report. Ask for changes below, and the AI will edit it directly.</p>
        </div>
        
        {/* Main content area with report and user prompts */}
        <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-6 bg-slate-50 space-y-6">
            {/* AI Report Block */}
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">AI</div>
                <div className="p-4 rounded-lg bg-white shadow-sm flex-1">
                    <ReactMarkdown 
                        className="prose prose-slate max-w-none"
                        remarkPlugins={[remarkGfm]}
                    >
                        {latestReport}
                    </ReactMarkdown>
                </div>
            </div>

             {/* User Prompts History */}
             {userMessages.slice(0, -1).map((msg, index) => (
                <div key={`user-old-${index}`} className="flex items-start gap-3 justify-end">
                     <div className="p-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 max-w-lg text-sm">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">You</div>
                </div>
             ))}
             
             {/* The latest user message */}
             {userMessages.length > 0 && (
                 <div className="flex items-start gap-3 justify-end">
                    <div className="p-4 rounded-lg bg-blue-100 text-blue-900 max-w-lg">
                        <p className="whitespace-pre-wrap">{userMessages[userMessages.length - 1].content}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">You</div>
                 </div>
             )}

             {isRefining && (
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">AI</div>
                    <div className="p-4 rounded-lg bg-white shadow-sm">
                        <Loader />
                    </div>
                </div>
            )}
        </div>
      
        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
            {/* Evidence Tray */}
            {evidenceImages.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-2">Evidence Tray (Drag to reorder, click to select, or mention in your chat)</p>
                    <PhotoGallery images={evidenceImages} setImages={setEvidenceImages} layout="row" />
                </div>
            )}

            <div className="flex gap-2">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                    placeholder="e.g., 'Add a table with itemized costs' or 'Place the first photo after the intro'"
                    className="flex-grow p-3 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    disabled={isRefining}
                />
                <button
                    onClick={handleRefine}
                    disabled={isRefining || !userInput.trim()}
                    className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
                >
                    <ArrowRightIcon />
                </button>
            </div>
        </div>
    </div>
  );
};

export default ReportGenerator;