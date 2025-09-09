import React, { useState, useEffect, useCallback } from 'react';
import { LandingPhotoIcon } from './icons/LandingPhotoIcon';
import { LandingMicIcon } from './icons/LandingMicIcon';
import { LandingWrenchIcon } from './icons/LandingWrenchIcon';
import Loader from './Loader';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ToolIcon } from './icons/ToolIcon';
import { PlumbingIcon } from './icons/PlumbingIcon';
import { PaintIcon } from './icons/PaintIcon';


interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [dropped, setDropped] = useState<{ [key: string]: boolean }>({ photo: false, mic: false, wrench: false });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const allDropped = Object.values(dropped).every(Boolean);

  useEffect(() => {
    // Only trigger the generation animation if all items have been dropped
    // and the animation hasn't already completed or started.
    if (allDropped && !isComplete && !isGenerating) {
      setIsGenerating(true);
      const timer = setTimeout(() => {
        setIsGenerating(false);
        setIsComplete(true);
      }, 2000);
      // Cleanup the timer if the component unmounts
      return () => clearTimeout(timer);
    }
    // FIX: Removed `isGenerating` from the dependency array. Including it caused the effect to re-run
    // after `setIsGenerating(true)` was called, which cleared the timeout before it could fire.
  }, [allDropped, isComplete]);
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const item = e.dataTransfer.getData("text/plain");
    if (item && !dropped[item]) {
      setDropped(prev => ({ ...prev, [item]: true }));
    }
  };

  const DraggableItem = ({ id, icon, label }: { id: string, icon: React.ReactNode, label: string }) => {
    const isDropped = dropped[id];
    return (
        <div
            id={id}
            draggable={!isDropped}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
            className={`flex items-center gap-4 p-4 border-2 border-dashed rounded-lg transition-all duration-300 ${isDropped ? 'border-green-400 bg-green-50 text-slate-400 cursor-default' : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50 cursor-grab'}`}
        >
            <div className={`transition-transform ${isDropped ? '' : 'group-hover:scale-110'}`}>{icon}</div>
            <div className="flex flex-col">
                <span className={`font-semibold ${isDropped ? 'text-green-600' : 'text-slate-700'}`}>{label}</span>
                <span className="text-sm text-slate-500">{isDropped ? 'Added!' : 'Drag me to the phone'}</span>
            </div>
        </div>
    );
  };
  
  return (
    <div className="bg-slate-50">
        {/* Hero Section */}
        <div className="text-center px-6 py-16 md:py-24 bg-white">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                Handy<span className="text-blue-600">AI</span>
            </h2>
            <h1 className="mt-4 text-4xl md:text-6xl font-extrabold text-slate-800 tracking-tight">
                Your Work is <span className="text-blue-600">Professional.</span>
                <br />
                Your Reports Should Be Too.
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
                Impress clients, justify your costs, and get paid faster with stunning, AI-generated reports. <span className="font-semibold">Handy<span className="text-blue-600">AI</span></span> is the ultimate tool for the modern technician who's serious about growth.
            </p>
            <button
                onClick={onStart}
                className="mt-10 inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
                <span>Start Your First Report</span>
                <ArrowRightIcon />
            </button>
        </div>

        {/* Interactive Demo */}
        <div className="px-6 py-16 md:py-24">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-800">Snap. Speak. Done.</h2>
                <p className="mt-2 text-slate-500">Experience the magic. Drag the items onto the phone to generate a sample report.</p>
            </div>
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                {/* Draggable Items */}
                <div className="space-y-6">
                    <DraggableItem id="photo" icon={<LandingPhotoIcon />} label="Job Site Photos" />
                    <DraggableItem id="mic" icon={<LandingMicIcon />} label="Voice Notes" />
                    <DraggableItem id="wrench" icon={<LandingWrenchIcon />} label="Work Details" />
                </div>
                {/* Phone Dropzone */}
                <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="flex justify-center"
                >
                    <div className="w-80 h-[580px] bg-slate-800 rounded-[40px] p-4 shadow-2xl border-4 border-slate-900">
                        <div className={`w-full h-full bg-white rounded-[24px] flex flex-col items-center justify-center p-4 text-center transition-all duration-300 ${allDropped ? 'bg-slate-50' : 'bg-slate-100'}`}>
                            {isGenerating ? (
                                <>
                                    <Loader />
                                    <p className="mt-4 font-semibold text-blue-600">Generating Report...</p>
                                    <p className="text-sm text-slate-500">AI is analyzing the evidence.</p>
                                </>
                            ) : isComplete ? (
                                <div className="text-left w-full h-full overflow-y-auto p-2 animate-[fadeIn_0.5s_ease-in-out]">
                                    <h3 className="font-bold text-slate-800 text-base mb-1">Work Report</h3>
                                    <p className="text-xs text-slate-500 mb-4">Summary of work completed.</p>
                                    <div className="space-y-4 text-sm text-slate-700">
                                        <p className="text-xs font-medium">Based on our inspection, we completed the following tasks:</p>
                                        
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 text-blue-500 pt-0.5"><ToolIcon /></div>
                                            <p className="text-xs text-slate-600">Repaired the drywall crack in the main hallway.</p>
                                        </div>
                                        
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 text-blue-500 pt-0.5"><PlumbingIcon /></div>
                                            <p className="text-xs text-slate-600">Replaced the faulty P-trap under the kitchen sink.</p>
                                        </div>
                                        
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 text-blue-500 pt-0.5"><PaintIcon /></div>
                                            <p className="text-xs text-slate-600">Sealed and painted the repaired area to match existing color.</p>
                                        </div>

                                        <p className="text-xs pt-2">The work area was thoroughly cleaned upon completion.</p>
                                    </div>
                                    <div className="mt-6 p-3 bg-green-100 text-green-800 rounded-lg text-center font-semibold text-sm">
                                        Report Complete!
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 w-full">
                                    <h3 className="font-bold text-slate-600">Drop Evidence Here</h3>
                                    <div className={`p-2 border rounded-md flex items-center gap-2 transition-colors ${dropped.photo ? 'bg-green-100 border-green-200' : 'bg-white'}`}>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${dropped.photo ? 'bg-green-500' : 'bg-slate-300'}`}><CheckIcon/></span>
                                        <span className="text-sm text-slate-500">Photos</span>
                                    </div>
                                    <div className={`p-2 border rounded-md flex items-center gap-2 transition-colors ${dropped.mic ? 'bg-green-100 border-green-200' : 'bg-white'}`}>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${dropped.mic ? 'bg-green-500' : 'bg-slate-300'}`}><CheckIcon/></span>
                                        <span className="text-sm text-slate-500">Notes</span>
                                    </div>
                                    <div className={`p-2 border rounded-md flex items-center gap-2 transition-colors ${dropped.wrench ? 'bg-green-100 border-green-200' : 'bg-white'}`}>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${dropped.wrench ? 'bg-green-500' : 'bg-slate-300'}`}><CheckIcon/></span>
                                        <span className="text-sm text-slate-500">Details</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LandingPage;