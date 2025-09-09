
import React, { useState, useCallback } from 'react';
import { AppStage, ImageFile, ChatMessage } from './types';
import CameraCapture from './components/CameraCapture';
import PhotoGallery from './components/PhotoGallery';
import Dictation from './components/Dictation';
import ReportGenerator from './components/ReportGenerator';
import { generateInitialReport } from './services/geminiService';
import { ArrowRightIcon } from './components/icons/ArrowRightIcon';
import ReportPreview from './components/ReportPreview';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.CAPTURE);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dictatedText, setDictatedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [report, setReport] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const handleImagesCaptured = (newImages: ImageFile[]) => {
    setImages(newImages);
  };

  const handleDictation = (text: string) => {
    setDictatedText(text);
  };

  const handleGenerateReport = useCallback(async () => {
    const selectedImages = images.filter(img => img.selected);
    if (selectedImages.length === 0) {
      setError('Please select at least one photo to include in the report.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setStage(AppStage.GENERATING);

    try {
      const initialReport = await generateInitialReport(selectedImages, dictatedText);
      setReport(initialReport);
      setChatHistory([{ author: 'ai', content: initialReport }]);
      setStage(AppStage.REFINE);
    } catch (e) {
      console.error(e);
      setError('Failed to generate the report. Please check your connection and try again.');
      setStage(AppStage.CAPTURE);
    } finally {
      setIsLoading(false);
    }
  }, [images, dictatedText]);
  
  const resetApp = () => {
    setStage(AppStage.CAPTURE);
    setImages([]);
    setDictatedText('');
    setError(null);
    setIsLoading(false);
    setReport('');
    setChatHistory([]);
  };

  const handleGoToPreview = () => {
    setStage(AppStage.PREVIEW);
  };
  
  const handleReturnToRefine = () => {
    setStage(AppStage.REFINE);
  };

  const selectedImages = images.filter(img => img.selected);
  const aiMessages = chatHistory.filter(m => m.author === 'ai');
  const latestReport = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].content : report;

  const renderContent = () => {
    switch (stage) {
      case AppStage.CAPTURE:
        return (
          <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-semibold mb-2 text-slate-700">Step 1: Capture Your Work</h2>
                <p className="text-slate-500">Take photos of the job you completed. These will be used by the AI to understand the work done.</p>
            </div>
            <CameraCapture onImagesChange={handleImagesCaptured} images={images} />
            <PhotoGallery images={images} setImages={setImages} />
            <div>
                <h2 className="text-2xl font-semibold mb-2 text-slate-700">Step 2: Add Notes (Optional)</h2>
                <p className="text-slate-500">Dictate any specific details you want to include. Mention materials used, challenges overcome, or client requests.</p>
            </div>
            <Dictation onDictation={handleDictation} />
            
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">{error}</div>}

            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-center">
              <button
                onClick={handleGenerateReport}
                disabled={selectedImages.length === 0}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                <span>Generate Report ({selectedImages.length} {selectedImages.length === 1 ? 'photo' : 'photos'} selected)</span>
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        );
      case AppStage.GENERATING:
      case AppStage.REFINE:
        return (
            <ReportGenerator 
                isLoading={stage === AppStage.GENERATING} 
                report={report} 
                chatHistory={chatHistory} 
                setChatHistory={setChatHistory}
                images={images}
                setImages={setImages}
                initialNotes={dictatedText}
                onGoToPreview={handleGoToPreview}
            />
        );
      case AppStage.PREVIEW:
        return (
          <ReportPreview
            reportMarkdown={latestReport}
            images={selectedImages}
            onBackToRefine={handleReturnToRefine}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white shadow-md sticky top-0 z-10 print-hidden">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-slate-700">
            Handy<span className="text-blue-600">AI</span> Report
          </h1>
          {(stage === AppStage.REFINE || stage === AppStage.PREVIEW) && (
            <button
              onClick={resetApp}
              className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              Start New Report
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        {renderContent()}
      </main>

       <footer className="text-center p-4 text-sm text-slate-400 print-hidden">
        <p>&copy; {new Date().getFullYear()} HandyAI Report. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;