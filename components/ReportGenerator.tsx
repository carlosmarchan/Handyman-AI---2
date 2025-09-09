import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ImageFile } from '../types';
import { refineReport, initializeChat, getReportSuggestionAfterAnnotation, getPromptSuggestions } from '../services/geminiService';
import Loader from './Loader';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import type { Chat } from '@google/genai';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import remarkGfm from 'https://esm.sh/remark-gfm@4';
import PhotoGallery from './PhotoGallery';
import ImageAnnotationModal from './ImageAnnotationModal';
import CameraCapture from './CameraCapture';

interface ReportGeneratorProps {
  isLoading: boolean;
  report: string;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  images: ImageFile[];
  setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
  initialNotes: string;
  onGoToPreview: () => void;
}

// Check for browser support outside component to avoid re-declaration
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

const findAddedText = (original: string, modified: string): string | null => {
    // This simple diff function finds the first new sentence in the modified text.
    // It's tailored for the common case where the AI adds a single sentence.
    const originalSentences = new Set(original.match(/[^.!?]+[.!?\n]+/g) || []);
    const modifiedSentences = modified.match(/[^.!?]+[.!?\n]+/g) || [];

    if (!modifiedSentences) return null;

    for (const sentence of modifiedSentences) {
        if (!originalSentences.has(sentence)) {
            return sentence.trim(); // Return the first new sentence found
        }
    }
    return null;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ isLoading, report, chatHistory, setChatHistory, images, setImages, initialNotes, onGoToPreview }) => {
  const [userInput, setUserInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGettingSuggestion, setIsGettingSuggestion] = useState<boolean>(false);
  const [promptPills, setPromptPills] = useState<string[]>([]);
  const [isGettingPills, setIsGettingPills] = useState<boolean>(false);
  const [showAddPhotos, setShowAddPhotos] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any | null>(null);
  const highlightRef = useRef<HTMLParagraphElement | null>(null);
  const highlightAppliedRef = useRef(false);

  useEffect(() => {
    if (!isSpeechRecognitionSupported) {
      console.warn("Speech recognition not supported by this browser.");
      return;
    }
    
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setUserInput(prev => (prev ? prev.trim() + ' ' : '') + text);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsDictating(false);
    };
    
    recognition.onend = () => {
        setIsDictating(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  
  useEffect(() => {
    if(report && !chatSessionRef.current) {
        // Initialize chat with only the currently selected images
        const selectedImages = images.filter(img => img.selected);
        chatSessionRef.current = initializeChat(selectedImages, initialNotes, report);
    }
  }, [report, images, initialNotes]);

  useEffect(() => {
    if (chatContainerRef.current && !highlightedText) {
        // Scroll to bottom for normal chat flow
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    if (highlightedText && highlightRef.current) {
        // Scroll to the highlighted element
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // After animation, clear the highlight to prevent re-triggering
        const timer = setTimeout(() => setHighlightedText(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [chatHistory, highlightedText]);

  const aiMessages = chatHistory.filter(m => m.author === 'ai');
  const userMessages = chatHistory.filter(m => m.author === 'user');
  const latestReport = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].content : '';
  
  // Fetch prompt suggestions when the report changes or after refining is done
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (latestReport && !isRefining) {
        setIsGettingPills(true);
        setPromptPills([]);
        try {
          const suggestions = await getPromptSuggestions(latestReport);
          setPromptPills(suggestions);
        } catch (e) {
          console.error("Failed to get prompt suggestions", e);
          setPromptPills([]);
        } finally {
          setIsGettingPills(false);
        }
      }
    };
    fetchSuggestions();
  }, [latestReport, isRefining]);

  const submitPrompt = async (prompt: string) => {
    if (!prompt.trim() || !chatSessionRef.current) return;
    
    const oldReport = latestReport;
    setHighlightedText(null); // Clear previous highlight before new request
    highlightAppliedRef.current = false; // Reset the applied flag

    const newUserMessage: ChatMessage = { author: 'user', content: prompt };
    setChatHistory(prev => [...prev, newUserMessage]);
    setIsRefining(true);
    setAiSuggestion(null); // Clear suggestion once it's used or a new prompt is sent
    setPromptPills([]); // Clear pills while refining

    try {
      const refinedContent = await refineReport(chatSessionRef.current, prompt);
      
      const addedText = findAddedText(oldReport, refinedContent);
      if (addedText) {
        setHighlightedText(addedText);
      }
      
      setChatHistory(prev => {
        const newHistory = [...prev];
        const lastAiMessageIndex = newHistory.map(m => m.author).lastIndexOf('ai');
        
        if (lastAiMessageIndex !== -1) {
            newHistory[lastAiMessageIndex].content = refinedContent;
        } else {
            newHistory.push({ author: 'ai', content: refinedContent });
        }
        return newHistory;
      });

    } catch (e) {
      console.error(e);
      const errorMessage: ChatMessage = { author: 'ai', content: "Sorry, I encountered an error. Please try again." };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsRefining(false);
    }
  };

  const handleRefine = () => {
    submitPrompt(userInput);
    setUserInput(''); // Clear input only when sending from the input box
  };

  const handleDictateClick = () => {
    if (!recognitionRef.current || !isSpeechRecognitionSupported) return;

    if (isDictating) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsDictating(true);
    }
  };
  
  const handleSaveAnnotation = async (imageId: string, newSrc: string, annotationPrompt: string) => {
    setImages(prevImages => prevImages.map(img => 
      img.id === imageId 
        ? { ...img, annotatedSrc: newSrc, isAnnotated: true, annotationPrompt: annotationPrompt } 
        : img
    ));
    setEditingImage(null);
    
    if (chatSessionRef.current) {
        setIsGettingSuggestion(true);
        setAiSuggestion(null); // Clear previous suggestion
        try {
            const suggestion = await getReportSuggestionAfterAnnotation(chatSessionRef.current, annotationPrompt);
            setAiSuggestion(suggestion);
        } catch (e) {
            console.error(e);
            setAiSuggestion(null); // Clear on error
        } finally {
            setIsGettingSuggestion(false);
        }
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

  const customRenderers = {
      // FIX: The original `p` renderer had multiple issues: it used `any` for props which caused type errors,
      // passed invalid props to the DOM, and failed to render its children. This implementation fixes those issues.
      p: (props: { node?: any; inline?: boolean; children?: React.ReactNode;[key: string]: any; }) => {
          const { node, inline, children, ...rest } = props;
          // Do not highlight if there's nothing to highlight, or if it has already been applied in this render pass.
          if (!highlightedText || highlightAppliedRef.current) {
              return <p {...rest}>{children}</p>;
          }
          
          // Helper to recursively get all text from children nodes
          const childrenToText = (children: React.ReactNode): string => {
              return React.Children.toArray(children).reduce((text: string, child: React.ReactNode) => {
                  if (typeof child === 'string') {
                      return text + child;
                  }
                  if (React.isValidElement(child) && child.props && 'children' in child.props) {
                       return text + childrenToText(child.props.children);
                  }
                  return text;
              }, '');
          };

          const paragraphText = childrenToText(children);

          // If the paragraph includes the new sentence, apply the highlight and ref
          if (paragraphText.includes(highlightedText)) {
              highlightAppliedRef.current = true; // Mark as applied to prevent multiple highlights
              return <p {...rest} ref={highlightRef} className="highlight-fade">{children}</p>;
          }
          
          return <p {...rest}>{children}</p>;
      }
  };


  return (
    <>
      {editingImage && (
        <ImageAnnotationModal
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={handleSaveAnnotation}
        />
      )}
      <div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">Step 3: Review and Refine Your Report</h2>
                  <p className="text-slate-500 mt-1">Here is the draft of your report. Ask for changes below, and the AI will edit it directly.</p>
              </div>
              <button
                onClick={onGoToPreview}
                className="ml-4 flex-shrink-0 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                Preview & Finalize
              </button>
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
                          components={customRenderers}
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
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-slate-500">Evidence Tray (Click ✨ to annotate photos, ✏️ to re-annotate)</p>
                    <button onClick={() => setShowAddPhotos(!showAddPhotos)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                        {showAddPhotos ? 'Cancel' : '+ Add More Photos'}
                    </button>
                </div>

                {showAddPhotos && (
                    <div className="my-3 p-1 bg-slate-100 rounded-lg">
                       <CameraCapture images={images} onImagesChange={setImages} />
                    </div>
                )}
                  
                <PhotoGallery 
                    images={images} 
                    setImages={setImages} 
                    layout="row" 
                    display="selectedOnly" 
                    onAnnotateClick={(image) => setEditingImage(image)}
                    isReadOnly
                />
              </div>

              {/* AI Suggestion Chip */}
              {(aiSuggestion || isGettingSuggestion) && (
                <div className="mb-3 animate-[fadeIn_0.5s_ease-in-out]">
                    {isGettingSuggestion ? (
                        <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
                            <Loader />
                            <span className="text-sm text-slate-500">AI is thinking of a suggestion...</span>
                        </div>
                    ) : (
                        aiSuggestion && (
                            <div className="flex items-start gap-2">
                                <div className="p-2 bg-amber-100 text-amber-700 rounded-full mt-0.5">
                                    <LightbulbIcon />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-slate-500">Apply suggestion:</p>
                                    <button 
                                      onClick={() => submitPrompt(aiSuggestion)} 
                                      title="Click to apply this change to the report" 
                                      disabled={isRefining}
                                      className="w-full text-left text-sm text-blue-800 p-2 rounded-lg bg-blue-100 hover:bg-blue-200 border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {aiSuggestion}
                                    </button>
                                </div>
                            </div>
                        )
                    )}
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
                  {isSpeechRecognitionSupported && (
                      <button
                          onClick={handleDictateClick}
                          disabled={isRefining}
                          title={isDictating ? "Stop dictation" : "Start dictation"}
                          className={`p-3 text-white rounded-lg transition-colors disabled:bg-slate-400 ${isDictating ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-slate-500 hover:bg-slate-600'}`}
                      >
                          <MicrophoneIcon />
                      </button>
                  )}
                  <button
                      onClick={handleRefine}
                      disabled={isRefining || !userInput.trim()}
                      className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
                  >
                      <ArrowRightIcon />
                  </button>
              </div>

               {/* Dynamic Prompt Pills */}
               <div className="mt-3 min-h-[28px]">
                {isGettingPills ? (
                    <div className="text-xs text-slate-400 text-center py-1">Generating suggestions...</div>
                ) : (
                    promptPills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 animate-[fadeIn_0.5s_ease-in-out]">
                            {promptPills.map((suggestion, index) => (
                                <button
                                key={index}
                                onClick={() => submitPrompt(suggestion)}
                                disabled={isRefining}
                                className="px-3 py-1 text-sm text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                {suggestion}
                                </button>
                            ))}
                        </div>
                    )
                )}
               </div>

          </div>
      </div>
    </>
  );
};

export default ReportGenerator;
