
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeneratedSite } from '../types';
import { GoogleGenAI, Part } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import Loader from './Loader';

interface UltraAnimationEditorProps {
  initialSite: GeneratedSite;
  onSave: (updatedSite: GeneratedSite) => void;
  onCancel: () => void;
  apiKey: string;
}

const UltraAnimationEditor: React.FC<UltraAnimationEditorProps> = ({ initialSite, onSave, onCancel, apiKey }) => {
  const [currentSite, setCurrentSite] = useState<GeneratedSite>(initialSite);
  const [elementIds, setElementIds] = useState<string[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elementAnimationPrompt, setElementAnimationPrompt] = useState<string>('');
  const [isAnimatingElement, setIsAnimatingElement] = useState<boolean>(false);
  const [animationError, setAnimationError] = useState<string | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);

  useEffect(() => {
    setCurrentSite(initialSite);
  }, [initialSite]);

  useEffect(() => {
    // Parse HTML for elements with IDs
    const parser = new DOMParser();
    const doc = parser.parseFromString(currentSite.html, 'text/html');
    const ids = Array.from(doc.querySelectorAll('[id]')).map(el => el.id).filter(id => id.trim() !== '');
    setElementIds(ids);
  }, [currentSite.html]);

  const refreshPreview = useCallback(() => {
    setIframeKey(prev => prev + 1);
  }, []);
  
  useEffect(() => {
    if (iframeRef.current) {
      const completeHtml = `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { margin: 0; overflow: auto; background-color: #ffffff; color: #111827; }
              [data-selected-for-animation='true'] { outline: 2px dashed #fbbf24; /* amber-400 */ box-shadow: 0 0 10px #fbbf24; }
              ${currentSite.customCss || ''}
            </style>
          </head>
          <body>
            ${currentSite.html}
            ${currentSite.javascript ? `<script type="module">${currentSite.javascript.replace(/<\/script>/g, '<\\/script>')}<\/script>` : ''}
          </body>
        </html>
      `;
      iframeRef.current.srcdoc = completeHtml;

      // Highlight selected element in iframe
      const highlightElement = () => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          doc.querySelectorAll("[data-selected-for-animation='true']").forEach(el => el.removeAttribute('data-selected-for-animation'));
          if (selectedElementId) {
            const elToHighlight = doc.getElementById(selectedElementId);
            if (elToHighlight) {
              elToHighlight.setAttribute('data-selected-for-animation', 'true');
              elToHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      };

      iframeRef.current.onload = highlightElement; // Re-apply highlight on load
      highlightElement(); // Apply highlight immediately if already loaded

    }
  }, [currentSite, selectedElementId, iframeKey]);


  const handleElementAnimation = async () => {
    if (!apiKey) { setAnimationError("API key is missing."); return; }
    if (!selectedElementId) { setAnimationError("Please select an element to animate."); return; }
    if (!elementAnimationPrompt.trim()) { setAnimationError("Please describe the animation for the selected element."); return; }

    setIsAnimatingElement(true); setAnimationError(null);
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
You are an expert web animation developer. Given the following HTML structure, existing JavaScript, and custom CSS of a website, write a NEW, self-contained JavaScript snippet using the Web Animations API (element.animate()) to animate ONLY the element with ID "${selectedElementId}".

The animation for element "#${selectedElementId}" should be: "${elementAnimationPrompt}".

Current Full HTML:
\`\`\`html
${currentSite.html}
\`\`\`

Current Custom CSS (if any):
\`\`\`css
${currentSite.customCss || "/* No custom CSS */"}
\`\`\`

Full existing JavaScript for the page (this new snippet will be added to it):
\`\`\`javascript
${currentSite.javascript || "/* No JavaScript yet */"}
\`\`\`

Instructions for the new JavaScript snippet:
1.  The snippet MUST target ONLY the element with ID "${selectedElementId}".
2.  Use the Web Animations API: \`document.getElementById('${selectedElementId}').animate(keyframes, options);\`.
3.  Define appropriate \`keyframes\` (array of objects, e.g., \`{ transform: 'translateX(0px)', opacity: 1 }\`) and \`options\` (e.g., \`{ duration: 1000, easing: 'ease-in-out', fill: 'forwards' }\`).
4.  Implement animation triggers mentioned in the description (e.g., 'on page load', 'on scroll into view', 'on click', 'on hover').
    *   'On page load': Execute \`.animate()\` directly or within \`DOMContentLoaded\`.
    *   'On click'/'On hover': Add an event listener to \`document.getElementById('${selectedElementId}')\` that calls \`.animate()\`.
    *   'On scroll into view': Use \`new IntersectionObserver(...)\` and observe the element.
5.  The snippet should be **additive** and **self-contained**. It will be appended to the existing JavaScript. Avoid re-declaring global variables or functions that might conflict from the existing JS. Wrap in an IIFE ((() => { ... })();) if necessary to scope variables, but ensure event listeners are attached correctly to the element or document.
6.  Do NOT re-declare the entire existing JavaScript. Only provide the NEW snippet for the specified element.
7.  If the animation can also be achieved with CSS (e.g. simple fade-in on load), you can optionally include that as a comment, but the primary output must be the JavaScript WAAPI snippet.

Output ONLY the JavaScript snippet as a raw string (no JSON, no markdown fences like \`\`\`javascript).
Ensure the snippet is runnable and correctly targets the element.

Example of a snippet for 'on click' for an element with ID 'myButton':
const myButtonElement = document.getElementById('myButton');
if (myButtonElement) {
  myButtonElement.addEventListener('click', () => {
    myButtonElement.animate([
      { transform: 'scale(1)', offset: 0 },
      { transform: 'scale(1.1)', offset: 0.5 },
      { transform: 'scale(1)', offset: 1 }
    ], { duration: 300, easing: 'ease-in-out' });
  });
}`;
    
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: { parts: [{ text: promptText }] },
      });

      const newJsSnippet = response.text.trim();
      
      setCurrentSite(prevSite => ({
        ...prevSite,
        javascript: (prevSite.javascript || '') + '\n\n// Animation for #' + selectedElementId + '\n' + newJsSnippet,
      }));
      setElementAnimationPrompt(''); // Clear prompt
      refreshPreview();

    } catch (err) {
      console.error("Error generating element animation:", err);
      setAnimationError(`Failed to generate animation for #${selectedElementId}. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAnimatingElement(false);
    }
  };

  const handleSaveAllAnimations = () => {
    onSave(currentSite);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
      {/* Left Panel: Element Selector & Animation Controls */}
      <div className="lg:w-1/3 bg-slate-850 p-4 rounded-lg shadow-lg space-y-4 overflow-y-auto border border-slate-700">
        <h3 className="text-xl font-semibold text-red-400">Animate Elements</h3>
        <div>
          <label htmlFor="elementSelector" className="block text-sm font-medium text-slate-300 mb-1">Select Element by ID:</label>
          <select
            id="elementSelector"
            value={selectedElementId || ""}
            onChange={(e) => setSelectedElementId(e.target.value || null)}
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">-- Select an Element --</option>
            {elementIds.map(id => <option key={id} value={id}>#{id}</option>)}
          </select>
        </div>

        {selectedElementId && (
          <div className="space-y-3 p-3 bg-slate-700/50 rounded-md border border-slate-600">
            <p className="text-sm text-slate-300">Animating: <strong className="text-amber-400">#{selectedElementId}</strong></p>
            <div>
              <label htmlFor="elementAnimationPrompt" className="block text-sm font-medium text-slate-300 mb-1">Animation Description:</label>
              <textarea
                id="elementAnimationPrompt"
                rows={3}
                className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-slate-100 placeholder-slate-400 focus:ring-amber-500 focus:border-amber-500"
                placeholder={`e.g., "Fly in from left on scroll", "Pulse on hover"`}
                value={elementAnimationPrompt}
                onChange={(e) => setElementAnimationPrompt(e.target.value)}
              />
            </div>
            <button
              onClick={handleElementAnimation}
              disabled={isAnimatingElement || !elementAnimationPrompt.trim()}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 group"
            >
              {isAnimatingElement ? <Loader /> : (<><SparklesIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />Generate Animation for Element</>)}
            </button>
            {animationError && selectedElementId && <p className="text-xs text-red-400 mt-1">{animationError}</p>}
          </div>
        )}
         {!selectedElementId && elementIds.length > 0 && (
            <p className="text-sm text-slate-400">Select an element ID from the dropdown to apply specific animations.</p>
        )}
        {elementIds.length === 0 && (
            <p className="text-sm text-slate-400">No elements with IDs found in the HTML. Add IDs to elements you wish to animate individually here.</p>
        )}
      </div>

      {/* Right Panel: Preview & Global Actions */}
      <div className="lg:w-2/3 flex flex-col space-y-4">
        <div className="flex-grow bg-slate-700/50 p-1 rounded-lg shadow-inner_custom overflow-hidden">
          <iframe
            ref={iframeRef}
            key={`ultra-editor-preview-${iframeKey}`}
            title="Ultra Animation Editor Preview"
            className="w-full h-full border-none rounded-md bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        <div className="flex justify-end space-x-3 p-2 bg-slate-850 rounded-b-lg border-t border-slate-700">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-medium rounded-md text-slate-300 bg-slate-600 hover:bg-slate-500 transition-colors flex items-center space-x-2"
          >
            <XCircleIcon className="w-5 h-5" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSaveAllAnimations}
            className="px-5 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <CheckIcon className="w-5 h-5" />
            <span>Save All Animations</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UltraAnimationEditor;
