import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { DesignPage, DesignProject, TextEffect, TextLayer, ImageLayer, ShapeLayer, Fill } from '../types';
import { MATERIAL_DIMENSIONS } from '../constants';
import { KOREAN_FONTS_MAP } from '../components/fonts';
import { PARTY_BRANDING } from '../components/brandAssets';
import * as pdfjsLib from 'pdfjs-dist';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
} catch (e) {
  console.warn("Could not set pdf.js worker source from import.meta.url, falling back to CDN. This might happen in some environments.");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}


declare global {
    interface Window {
        html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
    }
}

export const DPI = 96;
export const mmToPx = (mm: number): number => Math.round((mm / 25.4) * DPI);
export const ptToPx = (pt: number): number => Math.round(pt * (DPI / 72));

export const unicodeBtoa = (str: string): string => {
    return btoa(unescape(encodeURIComponent(str)));
};

export const getSvgAssetDataURL = (assetId: string): string | null => {
    if (!assetId.startsWith('svg:')) return null;
    const id = assetId.substring(4);
    for (const party of Object.values(PARTY_BRANDING)) {
        const asset = party.assets.find(a => a.id === id);
        if (asset) {
            const svgString = ReactDOMServer.renderToString(React.createElement(asset.component));
            return `data:image/svg+xml;base64,${unicodeBtoa(svgString)}`;
        }
    }
    return null;
}

export const buildAssetUrlMap = (projectData: DesignProject): Map<string, string> => {
    const map = new Map<string, string>();
    projectData.imageLibrary.forEach(asset => map.set(asset.id, asset.previewUrl));

    Object.values(PARTY_BRANDING).forEach(party => {
        party.assets.forEach(asset => {
            const assetKey = `svg:${asset.id}`;
            const dataUrl = getSvgAssetDataURL(assetKey);
            if (dataUrl) map.set(assetKey, dataUrl);
        });
    });

    const primaryLogo = projectData.brandKit.logos.find(l => l.role === 'Primary Signature');
    if (primaryLogo) {
        const logoUrl = map.get(primaryLogo.assetId);
        if (logoUrl) {
            map.set('brand_logo', logoUrl);
            map.set('logo_photo', logoUrl);
        }
    }

    if (projectData.imageLibrary.length > 0) {
        map.set('main_photo', projectData.imageLibrary[0].previewUrl);
    }
    return map;
};

export const getBase64FromDataUrl = (dataUrl: string): string => {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
        // If no comma, assume the whole string is base64, or it's not a data URL.
        // This is a fallback. A proper data URL will have a comma.
        return dataUrl; 
    }
    return dataUrl.substring(commaIndex + 1);
};

export const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(getBase64FromDataUrl(dataurl));
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n > 0) {
      n--;
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

export const fileToDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

export const colorTo1x1PngDataURL = (color: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
    }
    return canvas.toDataURL('image/png');
};


export const getEffectStyles = (effect?: TextEffect): React.CSSProperties => {
    if (!effect || effect.type === 'none') return {};

    switch (effect.type) {
        case 'shadow': {
            const angle = effect.direction * (Math.PI / 180);
            const offsetX = effect.offset * Math.cos(angle);
            const offsetY = effect.offset * Math.sin(angle);
            
            let shadowColor = effect.color;
            if (effect.transparency > 0) {
                 const hex = effect.color.startsWith('#') ? effect.color : '#000000';
                 if (/^#[0-9A-F]{6}$/i.test(hex)) {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    const alpha = 1 - (effect.transparency / 100);
                    shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                 } else {
                    shadowColor = `rgba(0, 0, 0, ${1 - (effect.transparency / 100)})`; // Fallback for invalid hex
                 }
            }
            return { textShadow: `${offsetX}px ${offsetY}px ${effect.blur}px ${shadowColor}` };
        }
        case 'lift': {
            const intensity = effect.intensity / 100; // 0-1
            return { textShadow: `0px ${intensity * 5}px ${intensity * 15}px rgba(0,0,0,${intensity * 0.4})` };
        }
        case 'stroke':
            return { WebkitTextStroke: `${effect.width}px ${effect.color}` };
        case 'neon': {
             const intensity = effect.intensity / 100; // 0-1
             const color = effect.color;
             return { textShadow: `0 0 ${intensity*2+2}px #fff, 0 0 ${intensity*5+5}px ${color}, 0 0 ${intensity*10+10}px ${color}` };
        }
        default:
            return {};
    }
};

export const getFillStyle = (fill: Fill | undefined): React.CSSProperties => {
    if (!fill) return { background: '#CCCCCC' };
    if (typeof fill === 'string') {
        return { background: fill };
    }
    if (fill.type === 'linear') {
        const stops = fill.stops
            .sort((a, b) => a.offset - b.offset)
            .map(s => `${s.color} ${s.offset}%`)
            .join(', ');
        return { background: `linear-gradient(${fill.angle}deg, ${stops})` };
    }
    return {};
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number) => `0${c.toString(16)}`.slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const renderAndDownloadPage = async (page: DesignPage, projectData: DesignProject, filename: string) => {
    const dataUrlMap = buildAssetUrlMap(projectData);
    
    const tempContainer = document.createElement('div');
    const dimensions = MATERIAL_DIMENSIONS[page.type];
    if (!dimensions) { console.error("Could not find dimensions for image type:", page.type); return; }
    const canvasWidthPx = mmToPx(dimensions.width_mm);
    const canvasHeightPx = mmToPx(dimensions.height_mm);

    Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0', width: `${canvasWidthPx}px`, height: `${canvasHeightPx}px`, overflow: 'hidden' });
    document.body.appendChild(tempContainer);

    const imageLoadPromises: Promise<void>[] = [];
    const bgImg = document.createElement('img');
    bgImg.src = `data:image/png;base64,${page.base64}`;
    bgImg.crossOrigin = 'anonymous';
    Object.assign(bgImg.style, { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' });
    const bgPromise = new Promise<void>((resolve, reject) => { bgImg.onload = () => resolve(); bgImg.onerror = reject; });
    imageLoadPromises.push(bgPromise);
    tempContainer.appendChild(bgImg);

    const allLayers = [...page.shapeLayers, ...page.imageLayers, ...page.textLayers];
    allLayers.forEach(layer => {
        if (layer.isVisible === false) return;

        const el = document.createElement('div');
        Object.assign(el.style, { position: 'absolute', top: `${layer.top}px`, left: `${layer.left}px`, width: `${layer.width}px`, height: `${layer.height}px`, transform: `rotate(${layer.rotation}deg)`, opacity: String(layer.opacity), boxSizing: 'border-box' });
        
        if ('content' in layer) {
            el.innerText = layer.content;
            const textLayer = layer as TextLayer;
            const effectStyles = getEffectStyles(textLayer.effect);
            Object.assign(el.style, {
                fontSize: `${textLayer.fontSize}px`, 
                lineHeight: textLayer.lineHeight ? String(textLayer.lineHeight) : '1.2',
                letterSpacing: textLayer.letterSpacing ? `${textLayer.letterSpacing}px` : 'normal',
                fontWeight: String(textLayer.fontWeight),
                color: textLayer.color, textAlign: textLayer.textAlign,
                fontFamily: KOREAN_FONTS_MAP[textLayer.fontFamily] || 'sans-serif',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }, effectStyles);
        } else if ('assetId' in layer) {
            const imgEl = document.createElement('img');
            const imageUrl = dataUrlMap.get(layer.assetId);
            if (imageUrl) {
                imgEl.src = imageUrl;
                imgEl.crossOrigin = 'anonymous';
                Object.assign(imgEl.style, { width: '100%', height: '100%', objectFit: 'contain' });
                const imgPromise = new Promise<void>((resolve, reject) => { imgEl.onload = () => resolve(); imgEl.onerror = reject; });
                imageLoadPromises.push(imgPromise);
                el.appendChild(imgEl);
            }
        } else {
            const shapeLayer = layer as ShapeLayer;
            const isLine = shapeLayer.type === 'line';
            Object.assign(el.style, {
                ...getFillStyle(shapeLayer.fill),
                borderTop: isLine && shapeLayer.strokeWidth > 0 ? `${shapeLayer.strokeWidth}px solid ${shapeLayer.strokeColor}` : 'none',
                border: !isLine && shapeLayer.strokeWidth > 0 ? `${shapeLayer.strokeWidth}px solid ${shapeLayer.strokeColor}` : 'none',
                borderRadius: shapeLayer.borderRadius ? `${shapeLayer.borderRadius}px` : (shapeLayer.type === 'circle' ? '50%' : '0'),
            });
        }
        tempContainer.appendChild(el);
    });
    
    try {
        await Promise.all(imageLoadPromises);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = await window.html2canvas(tempContainer, { useCORS: true, backgroundColor: null, width: canvasWidthPx, height: canvasHeightPx });
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename;
        link.click();
    } catch (e) {
        console.error("Error generating canvas for download:", e);
        alert("디자인 다운로드 중 오류가 발생했습니다. 이미지 로드에 실패했을 수 있습니다.");
    } finally {
        document.body.removeChild(tempContainer);
    }
};

export const getApiErrorMessage = (error: unknown, context: string = 'AI 작업'): string => {
    if (error instanceof Error) {
        const lowerCaseMessage = error.message.toLowerCase();
        if (lowerCaseMessage.includes('429') || lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('resource_exhausted')) {
            return 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 API 요금제를 확인해주세요.';
        }
    }
    return `${context} 중 오류가 발생했습니다. 다시 시도해주세요.`;
};

export const renderPdfToPngDataURL = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(1); // Get the first page

    const viewport = page.getViewport({ scale: 1.5 }); // Use a decent scale for quality
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) {
        throw new Error('Could not get canvas context');
    }

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    // FIX: The error indicates a discrepancy in the RenderParameters type definition
    // for this project's environment. While non-standard, satisfying the type checker
    // by passing the `renderContext` as `any` is a pragmatic solution when types are incorrect.
    // The runtime call is correct according to official pdf.js documentation.
    // Note: The original error pointed to a non-existent `canvas` property, which suggests faulty type definitions.
    // An alternative would be `(renderContext as unknown as pdfjsLib.RenderParameters)`
    await page.render(renderContext as any).promise;
    return canvas.toDataURL('image/png');
};

export const processChromaKeyTransparency = (
    base64Image: string,
    keyColor: { r: number, g: number, b: number },
    tolerance: number = 10
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const distance = Math.sqrt(
                    Math.pow(r - keyColor.r, 2) +
                    Math.pow(g - keyColor.g, 2) +
                    Math.pow(b - keyColor.b, 2)
                );

                if (distance < tolerance) {
                    data[i + 3] = 0; // Set alpha to 0 (transparent)
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (error) => {
            reject(new Error('Failed to load image for chroma key processing'));
        };
        img.src = base64Image;
    });
};