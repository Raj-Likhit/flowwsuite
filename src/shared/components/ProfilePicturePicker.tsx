import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from './ui/Button';
import GlassSurface from './ui/reactbits/GlassSurface';
import { X, Upload, Check } from 'lucide-react';

interface ProfilePicturePickerProps {
    onCropComplete: (croppedImage: Blob) => void;
    onClose: () => void;
}

export const ProfilePicturePicker = ({ onCropComplete, onClose }: ProfilePicturePickerProps) => {
    const [image, setImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => setImage(reader.result as string));
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: any
    ): Promise<Blob> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('No 2d context');

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) reject(new Error('Canvas is empty'));
                else resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleConfirm = async () => {
        if (image && croppedAreaPixels) {
            try {
                const croppedImage = await getCroppedImg(image, croppedAreaPixels);
                onCropComplete(croppedImage);
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassSurface 
                className="w-full max-w-lg overflow-hidden flex flex-col" 
                borderRadius={24}
                width="100%"
                height="auto"
            >
                <div className="w-full flex-1 flex flex-col min-h-0 min-w-[500px]">
                    <div className="p-6 flex items-center justify-between border-b border-white/10 shrink-0">
                        <h3 className="text-xl font-bold text-white">Adjust Photo</h3>
                        <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="relative h-96 bg-black/20">
                        {image ? (
                            <Cropper
                                image={image}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={onCropChange}
                                onCropComplete={onCropCompleteInternal}
                                onZoomChange={setZoom}
                            />
                        ) : (
                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                <Upload size={48} className="text-primary-500 mb-4" />
                                <span className="text-white font-medium">Select an image</span>
                                <input type="file" className="hidden" accept="image/*" onChange={onSelectFile} />
                            </label>
                        )}
                    </div>

                    <div className="p-6 flex items-center justify-between bg-white/5 shrink-0">
                        {image && (
                            <div className="flex-1 mr-6">
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                            </div>
                        )}
                        <div className="flex gap-3 ml-auto">
                            {image && (
                                <Button variant="ghost" onClick={() => setImage(null)}>
                                    Change
                                </Button>
                            )}
                            <Button variant="primary" onClick={handleConfirm} disabled={!image}>
                                <Check size={18} className="mr-2" />
                                Save Picture
                            </Button>
                        </div>
                    </div>
                </div>
            </GlassSurface>
        </div>
    );
};
