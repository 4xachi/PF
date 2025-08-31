/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { generateDecadeImage } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import { createAlbumPage } from './lib/albumUtils';
import Footer from './components/Footer';

const DECADES = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s'];

type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}

const primaryButtonClasses = "bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5";
const secondaryButtonClasses = "bg-white/80 backdrop-blur-sm text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-white transition-all border border-slate-300/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md";


async function dataUrlToFile(dataUrl: string, filename: string): Promise<File | null> {
    try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], filename, { type: blob.type });
    } catch (error) {
        console.error("Error converting data URL to file:", error);
        return null;
    }
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);


function App() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [isSharing, setIsSharing] = useState<boolean>(false);
    const [appState, setAppState] = useState<'idle' | 'image-uploaded' | 'generating' | 'results-shown'>('idle');
    const [focusedCard, setFocusedCard] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const focusedImage = focusedCard ? generatedImages[focusedCard] : null;

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setFocusedCard(null);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    const handleFileChange = (file: File) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAppState('image-uploaded');
                setGeneratedImages({});
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleGenerateClick = async () => {
        if (!uploadedImage) return;

        setAppState('generating');
        
        const initialImages: Record<string, GeneratedImage> = {};
        DECADES.forEach(decade => {
            initialImages[decade] = { status: 'pending' };
        });
        setGeneratedImages(initialImages);

        const concurrencyLimit = 2;
        const decadesQueue = [...DECADES];

        const processDecade = async (decade: string) => {
            try {
                const prompt = `Reimagine the person in this photo in the style of the ${decade}. This includes clothing, hairstyle, photo quality, and the overall aesthetic of that decade. The output must be a photorealistic image showing the person clearly.`;
                const resultUrl = await generateDecadeImage(uploadedImage, prompt);
                setGeneratedImages(prev => ({
                    ...prev,
                    [decade]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setGeneratedImages(prev => ({
                    ...prev,
                    [decade]: { status: 'error', error: errorMessage },
                }));
                console.error(`Failed to generate image for ${decade}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (decadesQueue.length > 0) {
                const decade = decadesQueue.shift();
                if (decade) {
                    await processDecade(decade);
                }
            }
        });

        await Promise.all(workers);
        setAppState('results-shown');
    };

    const handleRegenerateDecade = async (decade: string) => {
        if (!uploadedImage || generatedImages[decade]?.status === 'pending') return;
        
        setGeneratedImages(prev => ({ ...prev, [decade]: { status: 'pending' } }));

        try {
            const prompt = `Reimagine the person in this photo in the style of the ${decade}. This includes clothing, hairstyle, photo quality, and the overall aesthetic of that decade. The output must be a photorealistic image showing the person clearly.`;
            const resultUrl = await generateDecadeImage(uploadedImage, prompt);
            setGeneratedImages(prev => ({ ...prev, [decade]: { status: 'done', url: resultUrl } }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({ ...prev, [decade]: { status: 'error', error: errorMessage } }));
            console.error(`Failed to regenerate image for ${decade}:`, err);
        }
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setAppState('idle');
        setFocusedCard(null);
    };

    const handleDownloadIndividualImage = (decade: string) => {
        const image = generatedImages[decade];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `past-forward-${decade}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleShareIndividualImage = async (decade: string) => {
        const image = generatedImages[decade];
        if (image?.status !== 'done' || !image.url) return;
    
        const file = await dataUrlToFile(image.url, `past-forward-${decade}.jpg`);
        if (!file) {
            alert("Could not prepare image for sharing.");
            return;
        }
    
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: `My ${decade} look! | Past Forward`,
                    text: `Check out my photo from the ${decade}, generated with Past Forward on Google AI Studio!`,
                });
            } catch (error) { console.error('Error sharing file:', error); }
        } else {
             alert("Sharing this image is not supported on your browser.");
        }
    };

    const handleDownloadAlbum = async () => {
        setIsDownloading(true);
        try {
            const imageData = Object.entries(generatedImages)
                .filter(([, image]) => image.status === 'done' && image.url)
                .reduce((acc, [decade, image]) => {
                    acc[decade] = image!.url!;
                    return acc;
                }, {} as Record<string, string>);
    
            const generatedCount = Object.keys(imageData).length;
    
            if (generatedCount === 0) {
                alert("There are no images to download yet.");
                return;
            }
    
            if (generatedCount < DECADES.length) {
                const proceed = window.confirm(`Only ${generatedCount} out of ${DECADES.length} images are ready. Download a partial set?`);
                if (!proceed) { return; }
            }

            const albumDataUrl = await createAlbumPage(imageData);
            const zip = new JSZip();
            
            const albumBase64Data = albumDataUrl.split(',')[1];
            zip.file('past-forward-album.jpg', albumBase64Data, { base64: true });

            for (const decade in imageData) {
                const imageUrl = imageData[decade];
                const base64Data = imageUrl.split(',')[1];
                zip.file(`past-forward-${decade}.jpg`, base64Data, { base64: true });
            }
    
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipUrl = URL.createObjectURL(zipBlob);
    
            const zipLink = document.createElement('a');
            zipLink.href = zipUrl;
            zipLink.download = 'past-forward-album.zip';
            document.body.appendChild(zipLink);
            zipLink.click();
            
            document.body.removeChild(zipLink);
            URL.revokeObjectURL(zipUrl);

        } catch (error) {
            console.error("Failed to create or download album ZIP:", error);
            alert("Sorry, there was an error creating your album ZIP file. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShareAlbum = async () => {
        setIsSharing(true);
        try {
            const imageData = Object.entries(generatedImages)
                .filter(([, image]) => image.status === 'done' && image.url)
                .reduce((acc, [decade, image]) => {
                    acc[decade] = image!.url!;
                    return acc;
                }, {} as Record<string, string>);
            
            if (Object.keys(imageData).length === 0) {
                alert("No finished images to share in an album yet.");
                return;
            }
    
            const albumDataUrl = await createAlbumPage(imageData);
            const file = await dataUrlToFile(albumDataUrl, 'past-forward-album.jpg');

            if (!file) {
                alert("Could not prepare album for sharing.");
                return;
            }
    
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'My Past Forward Album!',
                    text: 'I traveled through time with Past Forward on Google AI Studio! Check out my album.',
                });
            } else {
                alert("Sharing albums is not supported on your browser. Please download it to share.");
            }
    
        } catch (error) {
            console.error("Failed to create or share album:", error);
            alert("Sorry, there was an error creating your album for sharing. Please try again.");
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <main className="text-slate-800 min-h-screen w-full flex flex-col items-center p-4 sm:p-6 lg:p-8 font-inter">
            <div className="w-full max-w-7xl mx-auto flex flex-col flex-1">
                <header className="text-center py-8">
                    <h1 className="font-poppins text-5xl md:text-6xl font-bold text-slate-900">Past Forward</h1>
                    <p className="text-slate-600 mt-4 text-lg max-w-2xl mx-auto">Upload a photo and see yourself reimagined in the iconic styles of decades past.</p>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <div className="w-full bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 p-6 md:p-10 transition-all duration-500 min-h-[500px] flex flex-col justify-center">
                        <AnimatePresence mode="wait">
                            {appState === 'idle' && (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full max-w-lg mx-auto text-center"
                                >
                                    <div
                                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:border-blue-500 hover:bg-slate-100/70 transition-colors duration-300 group"
                                        onClick={() => fileInputRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                    >
                                        <UploadIcon />
                                        <p className="mt-4 text-lg font-semibold text-slate-700">Drag & drop your photo</p>
                                        <p className="text-slate-500 text-sm mt-1">or click to browse</p>
                                    </div>
                                    <input ref={fileInputRef} id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                                    <p className="mt-6 text-slate-500 text-xs">
                                        Your photo is processed on-device and is never stored on a server.
                                    </p>
                                </motion.div>
                            )}

                            {appState === 'image-uploaded' && uploadedImage && (
                                <motion.div
                                    key="uploaded"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex flex-col items-center gap-6"
                                >
                                    <div className="rounded-lg shadow-md overflow-hidden border-4 border-white">
                                        <img src={uploadedImage} alt="Uploaded preview" className="w-64 h-64 object-cover" />
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <button onClick={handleReset} className={secondaryButtonClasses}>
                                            Change Photo
                                        </button>
                                        <button onClick={handleGenerateClick} className={primaryButtonClasses}>
                                            Start Time Travel
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                             {(appState === 'generating' || appState === 'results-shown') && (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="w-full"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                                            {DECADES.map((decade, index) => (
                                                <PolaroidCard
                                                    key={decade}
                                                    layoutId={decade}
                                                    caption={decade}
                                                    status={generatedImages[decade]?.status || 'pending'}
                                                    imageUrl={generatedImages[decade]?.url}
                                                    error={generatedImages[decade]?.error}
                                                    onRegenerate={() => handleRegenerateDecade(decade)}
                                                    onDownload={() => handleDownloadIndividualImage(decade)}
                                                    onShare={() => handleShareIndividualImage(decade)}
                                                    onClick={() => setFocusedCard(decade)}
                                                />
                                            ))}
                                    </div>
                                </motion.div>
                             )}
                        </AnimatePresence>
                    </div>
                </div>
                
                <AnimatePresence>
                {appState === 'results-shown' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <button 
                            onClick={handleDownloadAlbum} 
                            disabled={isDownloading} 
                            className={primaryButtonClasses}
                        >
                            {isDownloading ? 'Packaging...' : 'Download All'}
                        </button>
                        {typeof navigator !== 'undefined' && navigator.share && (
                            <button 
                                onClick={handleShareAlbum} 
                                disabled={isSharing} 
                                className={secondaryButtonClasses}
                            >
                                {isSharing ? 'Preparing...' : 'Share Album'}
                            </button>
                        )}
                        <button onClick={handleReset} className={secondaryButtonClasses}>
                            Start Over
                        </button>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
            <Footer />

            <AnimatePresence>
                {focusedCard && focusedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setFocusedCard(null)}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <motion.div
                            layout
                            onClick={(e) => e.stopPropagation()}
                            className="relative cursor-default w-full max-w-[90vw] sm:max-w-lg md:max-w-xl max-h-[85vh]"
                        >
                            <PolaroidCard
                                isFocused
                                layoutId={focusedCard}
                                caption={focusedCard}
                                status={focusedImage.status}
                                imageUrl={focusedImage.url}
                                error={focusedImage.error}
                                onRegenerate={() => handleRegenerateDecade(focusedCard)}
                                onDownload={() => handleDownloadIndividualImage(focusedCard)}
                                onShare={() => handleShareIndividualImage(focusedCard)}
                            />
                             <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1, transition: { delay: 0.3 } }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => setFocusedCard(null)}
                                className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                aria-label="Close focus view"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

export default App;
