/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Helper function to load an image and return it as an HTMLImageElement
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
        img.src = src;
    });
}

/**
 * Creates a single "photo album" page image from a collection of decade images.
 * @param imageData A record mapping decade strings to their image data URLs.
 * @returns A promise that resolves to a data URL of the generated album page (JPEG format).
 */
export async function createAlbumPage(imageData: Record<string, string>): Promise<string> {
    const canvas = document.createElement('canvas');
    const canvasWidth = 2480;
    const canvasHeight = 3508;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get 2D canvas context');
    }

    // 1. Draw the album page background (clean, light color)
    ctx.fillStyle = '#F8FAFC'; // bg-slate-50
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Draw the title using the new fonts
    ctx.fillStyle = '#0f172a'; // bg-slate-900
    ctx.textAlign = 'center';
    
    // Ensure fonts are loaded before using them on canvas
    // Note: This relies on the fonts being loaded in the browser already.
    // For more robust behavior, one might use the FontFace API.
    await document.fonts.load("150px Poppins");
    await document.fonts.load("80px Inter");
    
    ctx.font = `600 150px 'Poppins', sans-serif`;
    ctx.fillText('Past Forward', canvasWidth / 2, 250);
    
    // 3. Load all the polaroid images concurrently
    const decades = Object.keys(imageData);
    const loadedImages = await Promise.all(
        Object.values(imageData).map(url => loadImage(url))
    );

    const imagesWithDecades = decades.map((decade, index) => ({
        decade,
        img: loadedImages[index],
    }));

    // 4. Define grid layout and draw each polaroid
    const grid = { cols: 2, rows: 3, padding: 100 };
    const contentTopMargin = 400;
    const contentHeight = canvasHeight - contentTopMargin;
    const cellWidth = (canvasWidth - grid.padding * (grid.cols + 1)) / grid.cols;
    const cellHeight = (contentHeight - grid.padding * (grid.rows + 1)) / grid.rows;
    
    const polaroidFrameColor = '#FFFFFF'; // Clean white

    imagesWithDecades.forEach(({ decade, img }, index) => {
        const row = Math.floor(index / grid.cols);
        const col = index % grid.cols;

        const cellX = grid.padding + col * (cellWidth + grid.padding);
        const cellY = contentTopMargin + grid.padding + row * (cellHeight + grid.padding);

        ctx.save();
        
        ctx.translate(cellX + cellWidth / 2, cellY + cellHeight / 2);
        
        const rotation = (Math.random() - 0.5) * 0.07; // Radians (approx. +/- 2 degrees)
        ctx.rotate(rotation);
        
        const polaroidWidth = cellWidth * 0.8;
        const polaroidHeight = polaroidWidth * 1.2;
        
        ctx.shadowColor = 'rgba(40, 50, 70, 0.15)';
        ctx.shadowBlur = 60;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 15;
        
        // Polaroid frame
        ctx.fillStyle = polaroidFrameColor;
        ctx.fillRect(-polaroidWidth / 2, -polaroidHeight / 2, polaroidWidth, polaroidHeight);
        ctx.shadowColor = 'transparent';

        // Image
        const imageMargin = polaroidWidth * 0.05;
        const imageWidth = polaroidWidth - imageMargin * 2;
        const imageHeight = imageWidth;
        const imageX = -imageWidth / 2;
        const imageY = -polaroidHeight / 2 + imageMargin;
        ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight);
        
        // Caption
        ctx.fillStyle = '#1e293b'; // slate-800
        ctx.font = `500 80px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        const captionY = imageY + imageHeight + (polaroidHeight / 2 - imageMargin - imageHeight) / 2 + 30;
        ctx.fillText(decade, 0, captionY);
        
        ctx.restore();
    });

    return canvas.toDataURL('image/jpeg', 0.92);
}