
import React, { useEffect, useRef } from 'react';

interface AnimationPreviewProps {
  id: string;
  htmlContent: string;
  customCss?: string;
  javascriptContent?: string;
  assetBase64?: string;
  assetMimeType?: string;
  assetType?: 'image' | 'video';
  iframeKey?: string; // Key to force iframe remount/reload
}

const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  id,
  htmlContent,
  customCss,
  javascriptContent,
  // assetBase64, // Potentially used if AI fails to embed, but prompt should handle it.
  // assetMimeType,
  // assetType,
  iframeKey,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      // The AI is prompted to include data URLs for images/videos directly in the HTML.
      // And for 3D models, to include <canvas> and JS for loading.
      // Thus, direct injection here is less critical and primarily a fallback.
      const completeHtml = `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { 
                margin: 0; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh; 
                background-color: #1e293b; /* bg-slate-800 for iframe content */
                color: #f1f5f9; /* slate-100 for iframe content text */
                overflow: auto; 
              }
              #animation-wrapper { /* Ensure this ID is used by AI or a generic approach */
                 width: 100%;
                 height: 100%;
                 display: flex; 
                 align-items: center; 
                 justify-content: center; 
              }
              ${customCss || ''}
            </style>
            <!-- CDNs for libraries like Three.js are expected to be in htmlContent by AI -->
          </head>
          <body>
            <div id="animation-wrapper-outer"> <!-- Outer wrapper in case AI uses #animation-wrapper with specific sizing -->
              ${htmlContent}
            </div>
            ${javascriptContent ? `<script type="module">${javascriptContent.replace(/<\/script>/g, '<\\/script>')}<\/script>` : ''}
          </body>
        </html>
      `;
      iframeRef.current.srcdoc = completeHtml;
    }
  }, [htmlContent, customCss, javascriptContent, iframeKey]); // iframeKey change will re-trigger this if needed, though srcdoc update is main.

  return (
    <iframe
      key={iframeKey} // This key forces React to remount the iframe when changed
      ref={iframeRef}
      title={`animation-preview-${id}`}
      className="w-full h-72 md:h-96 border-none rounded-md bg-slate-800" // bg-slate-800 for the iframe itself before content loads
      sandbox="allow-scripts allow-same-origin allow-modals"
      loading="lazy"
    />
  );
};

export default AnimationPreview;
