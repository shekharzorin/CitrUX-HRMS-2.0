import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropUtils';

interface ImageCropperProps {
    imageFile: File;
    aspectRatio?: number;
    onCropComplete: (croppedFile: File) => void;
    onCancel: () => void;
}

/**
 * A centralized modal component for cropping images before upload.
 * Integrates with the backend image processing pipeline.
 */
export const ImageCropper: React.FC<ImageCropperProps> = ({ imageFile, aspectRatio = 1, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const imageUrl = URL.createObjectURL(imageFile);

    const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            if (!croppedAreaPixels) return;
            const croppedImageBlob = await getCroppedImg(imageUrl, croppedAreaPixels);
            const newFile = new File([croppedImageBlob], imageFile.name, { type: 'image/jpeg' });
            onCropComplete(newFile);
        } catch (e) {
            console.error('Cropping failed', e);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl h-[600px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-semibold dark:text-white">Crop Image</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="relative flex-1 bg-slate-100 dark:bg-slate-950">
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={setZoom}
                    />
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-2">
                        <button 
                            onClick={onCancel} 
                            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                        >
                            Apply Crop
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
