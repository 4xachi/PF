/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

type ImageStatus = 'pending' | 'done' | 'error';

interface PolaroidCardProps {
    imageUrl?: string;
    caption: string;
    status: ImageStatus;
    error?: string;
    onRegenerate: (caption: string) => void;
    onDownload: (caption: string) => void;
    onShare: (caption: string) => void;
    layoutId?: string;
    onClick?: () => void;
    isFocused?: boolean;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <svg className="animate-spin h-8 w-8 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ErrorDisplay = ({ onRegenerate, caption }: { onRegenerate: (caption: string) => void, caption: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-red-500 font-medium">Generation failed.</p>
        <button onClick={() => onRegenerate(caption)} className="mt-2 text-xs text-blue-600 hover:underline font-semibold">Try again</button>
    </div>
);

const ActionButton = ({ onClick, 'aria-label': ariaLabel, children }: { onClick: (e: React.MouseEvent) => void; 'aria-label': string; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className="p-2.5 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white transition-transform hover:scale-110"
        aria-label={ariaLabel}
    >
        {children}
    </button>
);

const PolaroidCard: React.FC<PolaroidCardProps> = ({ imageUrl, caption, status, onRegenerate, onDownload, onShare, layoutId, onClick, isFocused = false }) => {
    const [isDeveloped, setIsDeveloped] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const canShare = typeof navigator !== 'undefined' && !!navigator.share;

    useEffect(() => {
        if (status === 'pending') {
            setIsDeveloped(false);
            setIsImageLoaded(false);
        }
        if (status === 'done' && imageUrl) {
            setIsDeveloped(false); // Reset to re-trigger "developing" effect
            setIsImageLoaded(false);
        }
    }, [imageUrl, status]);

    useEffect(() => {
        if (isImageLoaded) {
            const timer = setTimeout(() => setIsDeveloped(true), 200);
            return () => clearTimeout(timer);
        }
    }, [isImageLoaded]);

    return (
        <motion.div
            layoutId={layoutId}
            onClick={!isFocused ? onClick : undefined}
            className={cn(
                "w-full aspect-[4/5] p-4 bg-white flex flex-col relative shadow-lg rounded-lg border border-slate-200/80 transition-shadow duration-300",
                !isFocused && "cursor-pointer group hover:shadow-2xl hover:-translate-y-1"
            )}
        >
            <div className="w-full h-full bg-slate-200 shadow-inner flex-grow relative overflow-hidden rounded-sm">
                {status === 'pending' && <LoadingSpinner />}
                {status === 'error' && <ErrorDisplay onRegenerate={onRegenerate} caption={caption} />}
                {status === 'done' && imageUrl && (
                    <>
                        {!isFocused && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center gap-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <ActionButton
                                    onClick={(e) => { e.stopPropagation(); onDownload(caption); }}
                                    aria-label={`Download image for ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </ActionButton>
                                {canShare && (
                                    <ActionButton
                                        onClick={(e) => { e.stopPropagation(); onShare(caption); }}
                                        aria-label={`Share image for ${caption}`}
                                    >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                        </svg>
                                    </ActionButton>
                                )}
                                <ActionButton
                                    onClick={(e) => { e.stopPropagation(); onRegenerate(caption); }}
                                    aria-label={`Regenerate image for ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 15M20 20l-1.5-1.5A9 9 0 013.5 9" />
                                    </svg>
                                </ActionButton>
                            </div>
                        )}
                        
                        <div
                            className={`absolute inset-0 z-10 bg-slate-600 transition-opacity duration-[3500ms] ease-out ${
                                isDeveloped ? 'opacity-0' : 'opacity-100'
                            }`}
                            aria-hidden="true"
                        />
                        <img
                            key={imageUrl}
                            src={imageUrl}
                            alt={caption}
                            onLoad={() => setIsImageLoaded(true)}
                            className={`w-full h-full object-cover transition-all duration-[4000ms] ease-in-out ${
                                isDeveloped 
                                ? 'opacity-100 filter-none' 
                                : 'opacity-80 filter sepia(0.8) contrast(0.9) brightness(0.9)'
                            }`}
                            style={{ opacity: isImageLoaded ? undefined : 0, userSelect: 'none', pointerEvents: 'none' }}
                        />
                    </>
                )}
            </div>
            <div className="text-center pt-4">
                <p className="font-semibold text-xl text-slate-800 font-inter">{caption}</p>
            </div>
        </motion.div>
    );
};

export default PolaroidCard;