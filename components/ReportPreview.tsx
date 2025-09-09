import React, { useState } from 'react';
import { ImageFile } from '../types';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import remarkGfm from 'https://esm.sh/remark-gfm@4';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SaveIcon } from './icons/SaveIcon';
import Loader from './Loader';

interface ReportPreviewProps {
  reportMarkdown: string;
  images: ImageFile[];
  onBackToRefine: () => void;
}

// Declare global vars for libraries loaded via script tags
declare const html2canvas: any;
declare const jspdf: any;

const ReportPreview: React.FC<ReportPreviewProps> = ({ reportMarkdown, images, onBackToRefine }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleSaveAsPdf = async () => {
    const reportElement = document.getElementById('report-content');
    if (!reportElement) {
      console.error("Report content element not found!");
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        backgroundColor: '#ffffff', // Ensure background is white for the capture
      });
      
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = jspdf;
      
      // A4 page in points (pt)
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Calculate image's height on the PDF while maintaining aspect ratio
      const ratio = canvasWidth / pdfWidth;
      const imgHeightOnPdf = canvasHeight / ratio;

      let heightLeft = imgHeightOnPdf;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
      heightLeft -= pdfHeight;

      // Add new pages if content is taller than one page
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
        heightLeft -= pdfHeight;
      }

      pdf.save('HandyAI-Report.pdf');

    } catch (error) {
      console.error("Error generating PDF:", error);
      // Optionally, show an error message to the user here
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2 print-hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Step 4: Final Report Preview</h2>
          <p className="text-sm text-slate-500">This is how your client will see the report. Print or save as PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToRefine}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon />
            <span>Back to Editor</span>
          </button>
          <button
            onClick={handleSaveAsPdf}
            disabled={isGeneratingPdf}
            className="flex items-center justify-center gap-2 w-40 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-wait"
          >
            {isGeneratingPdf ? (
                <>
                    <Loader />
                    <span>Generating...</span>
                </>
            ) : (
                <>
                    <SaveIcon />
                    <span>Save as PDF</span>
                </>
            )}
          </button>
        </div>
      </div>

      {/* Report Template */}
      <div id="report-content" className="p-8 md:p-12 bg-white">
        <header className="border-b-2 border-slate-200 pb-4 mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Handy<span className="text-blue-600">AI</span> Work Report
          </h1>
          <p className="text-slate-500 mt-1">Summary of work completed on {new Date().toLocaleDateString()}</p>
        </header>

        <main>
          <ReactMarkdown
            className="prose prose-slate max-w-none"
            remarkPlugins={[remarkGfm]}
          >
            {reportMarkdown}
          </ReactMarkdown>
        </main>

        {images.length > 0 && (
          <section className="mt-12 pt-8 border-t border-slate-200">
            <h3 className="text-2xl font-semibold text-slate-700 mb-6">Supporting Photos</h3>
            <div className="grid grid-cols-1 gap-6 break-inside-avoid">
              {images.map(image => (
                <div key={image.id} className="rounded-lg overflow-hidden border border-slate-200 break-inside-avoid mb-6">
                  <img src={image.annotatedSrc || image.src} alt="Evidence of work completed" className="w-full h-auto object-cover" />
                  {/* Placeholder for future caption functionality */}
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-12 pt-6 border-t-2 border-slate-200 text-center text-sm text-slate-500">
          <p>Thank you for your business!</p>
          <p className="text-xs text-slate-400 mt-1">Report generated by HandyAI.</p>
        </footer>
      </div>
    </div>
  );
};

export default ReportPreview;