import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, ZoomIn, ArrowLeft, Check, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PhotoEditorModalProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onDone: (croppedBase64: string) => void;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  imageSrc,
  isOpen,
  onClose,
  onDone
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setShowConfirmDiscard(false);
      setHasChanges(false);
    }
  }, [isOpen, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    setHasChanges(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
      setHasChanges(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
    setHasChanges(true);
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
    setHasChanges(true);
  };

  const handleBackOrCreateClose = () => {
    if (hasChanges) {
      setShowConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const handleDone = () => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onDone(imageSrc);
        return;
      }

      // Draw active backdrop
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);

      // Setup translations and transforms matching cropper values
      ctx.translate(100, 100);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Scale to center
      const aspectRatio = img.width / img.height;
      let drawWidth = 200;
      let drawHeight = 200;
      if (aspectRatio > 1) {
        drawHeight = 200 / aspectRatio;
      } else {
        drawWidth = 200 * aspectRatio;
      }

      // Render the image with offset translations scaled to the output size
      ctx.drawImage(
        img,
        -drawWidth / 2 + (position.x * 200) / 256,
        -drawHeight / 2 + (position.y * 200) / 256,
        drawWidth,
        drawHeight
      );

      // Output as optimized, compact JPEG to stay well within 20KB
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      onDone(croppedBase64);
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md overflow-hidden bg-white rounded-[2.5rem] shadow-2xl border border-stone-100"
      >
        <AnimatePresence mode="wait">
          {!showConfirmDiscard ? (
            <motion.div 
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <button 
                  onClick={handleBackOrCreateClose}
                  className="flex items-center justify-center p-2 rounded-xl text-stone-500 hover:bg-stone-50 active:scale-95 transition-all text-sm font-bold gap-1"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-600">Back</span>
                </button>
                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-800">Edit Profile Image</h3>
                <button 
                  onClick={handleBackOrCreateClose}
                  className="p-2 text-stone-400 hover:text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-xl transition-all"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cropper Container */}
              <div 
                ref={containerRef}
                className="relative mx-auto w-64 h-64 overflow-hidden rounded-full ring-4 ring-emerald-600/20 shadow-inner bg-stone-50 select-none cursor-move flex items-center justify-center"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                <div 
                  className="absolute transition-transform duration-75 inline-block"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  }}
                >
                  <img 
                    src={imageSrc} 
                    alt="Upload Preview" 
                    className="max-w-xs h-auto pointer-events-none select-none max-h-60"
                    draggable="false"
                  />
                </div>
                {/* Visual Circle Outline overlay */}
                <div className="absolute inset-0 border-2 border-emerald-600 rounded-full pointer-events-none opacity-40" />
              </div>

              {/* Controls */}
              <div className="space-y-4">
                {/* Zoom control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><ZoomIn className="w-3.5 h-3.5" /> Scale</span>
                    <span className="text-emerald-600">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={handleZoomChange}
                    className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Rotate Actions */}
                <div className="flex justify-center">
                  <button 
                    type="button"
                    onClick={handleRotate}
                    className="flex items-center gap-2 px-6 py-3 border border-stone-200 hover:bg-stone-50 active:scale-95 text-stone-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <RotateCw className="w-4 h-4 text-emerald-600" />
                    Rotate 90°
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-5">
                <button 
                  type="button"
                  onClick={handleBackOrCreateClose}
                  className="w-full py-4 border border-stone-200 text-stone-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-stone-50 active:scale-95 transition-all text-center"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleDone}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Done
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="confirm"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-[1.5rem] flex items-center justify-center text-rose-500 mx-auto shadow-sm ring-4 ring-rose-50">
                <ShieldAlert className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-900 tracking-tight">Discard photo?</h4>
                <p className="text-xs text-stone-500 leading-relaxed font-semibold max-w-xs mx-auto">
                  You have unsaved edits in this profile photo. Are you sure you want to discard your changes?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowConfirmDiscard(false)}
                  className="w-full py-4 border border-stone-200 text-stone-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-stone-50 active:scale-95 transition-all text-center"
                >
                  Keep Editing
                </button>
                <button 
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all text-center"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
