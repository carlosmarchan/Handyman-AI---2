
import React, { useState, useCallback } from 'react';
import { ImageFile } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { TrashIcon } from './icons/TrashIcon';

interface PhotoGalleryProps {
  images: ImageFile[];
  setImages: (images: ImageFile[]) => void;
  layout?: 'grid' | 'row';
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ images, setImages, layout = 'grid' }) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setImages(
      images.map(image =>
        image.id === id ? { ...image, selected: !image.selected } : image
      )
    );
  };

  const deleteImage = (id: string) => {
    setImages(images.filter(image => image.id !== id));
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, dropId: string) => {
    e.preventDefault();
    if (draggedItemId === null || draggedItemId === dropId) {
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
  }, [draggedItemId, images, setImages]);


  if (images.length === 0 && layout === 'grid') {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-md">
        <p className="text-slate-500">Your captured photos will appear here.</p>
        <p className="text-sm text-slate-400 mt-2">You can reorder them by dragging and dropping.</p>
      </div>
    );
  }
  
  const imageElements = images.map(image => (
      <div
        key={image.id}
        draggable
        onDragStart={(e) => handleDragStart(e, image.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, image.id)}
        className={`relative group aspect-square rounded-lg overflow-hidden cursor-pointer transition-transform transform-gpu ${draggedItemId === image.id ? 'scale-95 opacity-50' : 'hover:scale-105'} ${layout === 'row' ? 'h-20 w-20 flex-shrink-0' : ''}`}
        onClick={() => toggleSelect(image.id)}
      >
        <img src={image.src} alt="Captured work" className="w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-black transition-opacity ${image.selected ? 'opacity-20' : 'opacity-60'}`}></div>
        
        {image.selected && (
          <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white border-2 border-white">
            <CheckIcon />
          </div>
        )}
        
        <button
            onClick={(e) => {
                e.stopPropagation(); // prevent toggleSelect
                deleteImage(image.id);
            }}
            className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete image"
        >
            <TrashIcon />
        </button>
      </div>
  ));

  if (layout === 'row') {
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