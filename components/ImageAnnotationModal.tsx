import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageFile } from '../types';
import { analyzeImageForAnnotation, annotateImage } from '../services/geminiService';
import Loader from './Loader';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';

interface ImageAnnotationModalProps {
  image: ImageFile;
  onClose: () => void;
  onSave: (imageId: string, newSrc: string, annotationPrompt: string) => void;
}

const ImageAnnotationModal: React.FC<ImageAnnotationModalProps> = ({ image, onClose, onSave }) => {
  const [userPrompt, setUserPrompt] = useState('');
  // Fix: The state type was too restrictive. Changed from '... | false' to '... | boolean' to allow `true` as a valid initial loading state.
  const [isLoading, setIsLoading] = useState<'analyzing' | 'annotating' | boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [annotatedSrc, setAnnotatedSrc] = useState<string | null>(image.annotatedSrc || null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // If image is already annotated, load its data. Otherwise, analyze it for a suggestion.
    if (image.isAnnotated && image.annotationPrompt) {
      setUserPrompt(image.annotationPrompt);
      setIsLoading(false);
    } else {
      const getSuggestion = async () => {
        setError(null);
        setIsLoading('analyzing');
        try {
          const suggestion = await analyzeImageForAnnotation(image);
          setUserPrompt(suggestion);
        } catch (e) {
          console.error(e);
          setError('Could not analyze image. Please write your own prompt.');
          setUserPrompt(''); // Clear prompt on error
        } finally {
          setIsLoading(false);
        }
      };
      getSuggestion();
    }
  }, [image]);
  
  useEffect(() => {
    // Auto-resize textarea whenever the prompt is set programmatically
    if (textareaRef.current) {
        const target = textareaRef.current;
        target.style.height = 'auto'; // Reset height
        target.style.height = `${target.scrollHeight}px`; // Set to scroll height
    }
  }, [userPrompt]);

  const handleAnnotate = useCallback(async () => {
    if (!userPrompt.trim()) return;
    setError(null);
    setIsLoading('annotating');
    try {
      const newImageSrc = await annotateImage(image, userPrompt);
      setAnnotatedSrc(newImageSrc);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [image, userPrompt]);

  const handleSaveAndClose = () => {
    if (annotatedSrc) {
      onSave(image.id, annotatedSrc, userPrompt);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 print-hidden"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <MagicWandIcon />
            <span>Annotate Image</span>
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-2xl font-bold leading-none">&times;</button>
        </header>

        <main className="flex-grow flex flex-col md:flex-row gap-4 p-4 overflow-y-auto">
          {/* Image Display */}
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 rounded-lg p-2 min-h-[300px] relative">
             <div className="w-full max-w-lg aspect-square relative">
                <img 
                    src={image.src} 
                    alt="Original" 
                    className={`w-full h-full object-contain transition-opacity duration-300 rounded ${annotatedSrc ? 'opacity-30' : 'opacity-100'}`}
                />
                {annotatedSrc && (
                    <img 
                        src={annotatedSrc} 
                        alt="Annotated"
                        className="absolute inset-0 w-full h-full object-contain rounded animate-[fadeIn_0.5s_ease-in-out]"
                    />
                )}
                 {isLoading === 'analyzing' && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 rounded-lg">
                        <Loader />
                        <p className="text-slate-600 font-semibold mt-4">AI is analyzing your photo...</p>
                        <p className="text-slate-500 text-sm mt-1">Generating a suggested prompt.</p>
                    </div>
                )}
                {isLoading === 'annotating' && (
                    <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center text-center p-4">
                        <Loader />
                        <p className="text-slate-600 font-semibold mt-4">AI is marking up your photo...</p>
                    </div>
                )}
             </div>
          </div>
          
          {/* Controls */}
          <div className="md:w-1/3 flex flex-col gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label htmlFor="prompt-input" className="block text-sm font-medium text-slate-600 mb-2">Annotation Prompt</label>
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 mb-3 animate-[fadeIn_0.3s_ease-in-out]">
                    <p className="font-semibold">AI Assistant:</p>
                    <p className="mt-1">{error}</p>
                  </div>
                )}

                {isLoading === 'analyzing' ? (
                    <div className="w-full p-3 bg-slate-200 rounded-md animate-pulse min-h-[48px]"></div>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <textarea
                                ref={textareaRef}
                                id="prompt-input"
                                value={userPrompt}
                                onChange={(e) => setUserPrompt(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAnnotate();
                                    }
                                }}
                                onInput={(e) => {
                                    const target = e.currentTarget;
                                    target.style.height = 'auto'; // Reset height
                                    target.style.height = `${target.scrollHeight}px`; // Set to scroll height
                                }}
                                placeholder="e.g., 'The repaired section of the wall'"
                                className="flex-grow p-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 resize-y"
                                style={{minHeight: '48px'}}
                                disabled={!!isLoading}
                                rows={1}
                            />
                            <button
                                onClick={handleAnnotate}
                                disabled={!!isLoading || !userPrompt.trim()}
                                className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-400 transition-colors self-start"
                                aria-label="Apply annotation"
                            >
                                <ArrowRightIcon />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Describe the detail to highlight. The AI will draw a professional-looking circle or arrow on the image.
                        </p>
                    </>
                )}
            </div>

            {annotatedSrc && !isLoading && (
                 <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center animate-[fadeIn_0.5s_ease-in-out]">
                    <h3 className="font-semibold text-green-800">Annotation Applied!</h3>
                    <p className="text-sm text-green-700 mt-1">You can refine it by changing the prompt and annotating again.</p>
                 </div>
            )}
          </div>
        </main>
        
        <footer className="p-4 bg-slate-50 border-t border-slate-200 flex-shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          <button 
            onClick={handleSaveAndClose}
            disabled={!annotatedSrc || !!isLoading}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 rounded-lg transition-colors"
          >
            Use This Version
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ImageAnnotationModal;