
import React, { useState, useCallback } from 'react';
import { ImageFile } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { TrashIcon } from './icons/TrashIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { PencilIcon } from './icons/PencilIcon';

interface PhotoGalleryProps {
  images: ImageFile[];
  setImages: (images: ImageFile[]) => void;
  layout?: 'grid' | 'row';
  display?: 'all' | 'selectedOnly';
  onAnnotateClick?: (image: ImageFile) => void;
  isReadOnly?: boolean;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ images, setImages, layout = 'grid', display = 'all', onAnnotateClick, isReadOnly = false }) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    if (isReadOnly) return;
    setImages(
      images.map(image =>
        image.id === id ? { ...image, selected: !image.selected } : image
      )
    );
  };

  const deleteImage = (id: string) => {
    // Deletion is allowed even in "read-only" mode (which prevents re-ordering and de-selection)
    setImages(images.filter(image => image.id !== id));
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (isReadOnly) return;
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    e.preventDefault();
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, dropId: string) => {
    e.preventDefault();
    if (isReadOnly || draggedItemId === null || draggedItemId === dropId) {
        setDraggedItemId(null);
        return;
    };
    
    const fromIndex = images.findIndex(img => img.id === draggedItemId);
    const toIndex = images.findIndex(img => img.id === dropId);
    
    if (fromIndex !== -1 && toIndex !== -1) {
        const updatedImages = [...images];
        const [reorderedItem] = updatedImages.splice(fromIndex, 1);
        updatedImages.splice(toIndex, 0, reorderedItem);
        setImages(updatedImages);
    }
    setDraggedItemId(null);
  }, [draggedItemId, images, setImages, isReadOnly]);


  const imagesToRender = display === 'selectedOnly' ? images.filter(img => img.selected) : images;

  if (imagesToRender.length === 0 && layout === 'grid') {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-md">
        <p className="text-slate-500">Your captured photos will appear here.</p>
        <p className="text-sm text-slate-400 mt-2">You can reorder them by dragging and dropping.</p>
      </div>
    );
  }
  
  const imageElements = imagesToRender.map(image => (
      <div
        key={image.id}
        draggable={!isReadOnly}
        onDragStart={(e) => handleDragStart(e, image.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, image.id)}
        className={`relative group aspect-square rounded-lg overflow-hidden transition-transform transform-gpu ${isReadOnly ? 'cursor-default' : 'cursor-pointer'} ${draggedItemId === image.id ? 'scale-95 opacity-50' : 'hover:scale-105'} ${layout === 'row' ? 'h-20 w-20 flex-shrink-0' : ''}`}
      >
        <img src={image.annotatedSrc || image.src} alt="Captured work" className="w-full h-full object-cover" onClick={() => onAnnotateClick ? onAnnotateClick(image) : toggleSelect(image.id)} />
        <div className={`absolute inset-0 bg-black transition-opacity pointer-events-none ${image.selected ? 'opacity-20' : 'opacity-60'}`}></div>
        
        {/* Selection Checkmark */}
        <div 
            className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white transition-all ${image.selected ? 'bg-blue-600 text-white' : 'bg-white/30 text-transparent'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
            onClick={(e) => {
                e.stopPropagation();
                toggleSelect(image.id)
            }}
        >
            <CheckIcon />
        </div>
        
        {/* Delete button */}
        <button
            onClick={(e) => {
                e.stopPropagation();
                deleteImage(image.id);
            }}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-red-600/80 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all"
            aria-label="Delete image"
        >
            <TrashIcon />
        </button>

        {/* Annotation Button */}
        {onAnnotateClick && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onAnnotateClick(image);
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-purple-600/80 rounded-full flex items-center justify-center text-white hover:bg-purple-600 transition-all"
                aria-label={image.isAnnotated ? "Edit annotation" : "Annotate image"}
                title={image.isAnnotated ? "Edit annotation" : "Annotate image"}
            >
                {image.isAnnotated ? <PencilIcon /> : <MagicWandIcon />}
            </button>
        )}
      </div>
  ));

  if (layout === 'row') {
    if (imagesToRender.length === 0) return null;
    return (
        <div className="flex gap-2 overflow-x-auto pb-2">
            {imageElements}
        </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
       <p className="text-slate-500 mb-4 text-sm">Click a photo to select/deselect it for the report. Drag to reorder.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {imageElements}
      </div>
    </div>
  );
};

export default PhotoGallery;
