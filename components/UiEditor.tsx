
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeneratedUi } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { PhotoIcon } from './icons/PhotoIcon'; 
import { SparklesIcon } from './icons/SparklesIcon'; 
import { TrashIcon } from './icons/TrashIcon';

interface UiEditorProps {
  initialUi: GeneratedUi;
  onSave: (updatedHtml: string) => void;
  onCancel: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target: HTMLElement | null;
}

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

const UiEditor: React.FC<UiEditorProps> = ({ initialUi, onSave, onCancel }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const replaceImageFileInputRef = useRef<HTMLInputElement>(null);
  const newImageFileInputRef = useRef<HTMLInputElement>(null);
  const newSvgFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageElementToReplace, setSelectedImageElementToReplace] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, target: null });

  const getIframeContent = useCallback((html: string, css?: string) => `
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js"></script>
        <style>
          body { 
            margin: 0; 
            background-color: #ffffff; 
            color: #111827; 
            overflow: auto; 
            min-height: 100vh; 
            position: relative; /* For absolute positioning of assets */
          }
          img:not(.editable-asset-child):hover { 
            outline: 2px dashed #06b6d4; /* cyan-500 */
            cursor: pointer;
          }
          img[data-editing='true'] {
             outline: 2px solid #22c55e; /* green-500 */
          }
          .editable-asset {
            position: absolute;
            border: 1px dashed #8b5cf6; /* violet-500 */
            cursor: move;
            user-select: none; 
            box-sizing: border-box; 
            z-index: 0; /* Default z-index */
          }
          .editable-asset img, .editable-asset svg {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: contain; 
            pointer-events: none; 
          }
          ${css || ''}
        </style>
      </head>
      <body>
        ${html}
        <script>
          function initInteract() {
            if (window.interact) {
              interact('.editable-asset')
                .draggable({
                  inertia: true,
                  modifiers: [
                    interact.modifiers.restrictRect({
                      restriction: 'parent',
                      endOnly: true
                    })
                  ],
                  autoScroll: true,
                  listeners: {
                    move (event) {
                      var target = event.target;
                      var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                      var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                      target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
                      target.setAttribute('data-x', x);
                      target.setAttribute('data-y', y);
                    }
                  }
                })
                .resizable({
                  edges: { left: true, right: true, bottom: true, top: true },
                  listeners: {
                    move: function (event) {
                      var target = event.target;
                      target.style.width  = event.rect.width + 'px';
                      target.style.height = event.rect.height + 'px';
                    }
                  },
                  modifiers: [
                    interact.modifiers.restrictEdges({
                      outer: 'parent'
                    }),
                    interact.modifiers.restrictSize({
                      min: { width: 40, height: 40 }
                    })
                  ],
                  inertia: true
                });
            } else {
              console.error('interact.js not loaded');
            }
          }
        </script>
      </body>
    </html>
  `, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleIframeLoad = () => {
      setIsLoading(false);
      const doc = iframe.contentDocument;
      if (doc && doc.defaultView) {
        doc.body.contentEditable = 'true';
        doc.body.spellcheck = false;

        if (typeof (doc.defaultView as any).initInteract === 'function') {
          (doc.defaultView as any).initInteract();
        }
        
        // Context Menu Listener
        doc.body.addEventListener('contextmenu', (event) => {
          const targetElement = event.target as HTMLElement;
          const editableAsset = targetElement.closest('.editable-asset') as HTMLElement | null;
          
          if (editableAsset) {
            event.preventDefault();
            const iframeRect = iframe.getBoundingClientRect();
            setContextMenu({
              visible: true,
              x: iframeRect.left + event.clientX,
              y: iframeRect.top + event.clientY,
              target: editableAsset,
            });
          } else {
            setContextMenu(prev => ({ ...prev, visible: false }));
          }
        });

        // Click listener for replacing images
        doc.body.addEventListener('click', (event) => {
          const targetElement = event.target as HTMLElement;
          setContextMenu(prev => ({ ...prev, visible: false })); // Hide context menu on any click in iframe
          if (targetElement instanceof HTMLImageElement && !targetElement.closest('.editable-asset')) {
            event.preventDefault();
            if(selectedImageElementToReplace) selectedImageElementToReplace.removeAttribute('data-editing');
            setSelectedImageElementToReplace(targetElement);
            targetElement.setAttribute('data-editing', 'true'); 
            if (replaceImageFileInputRef.current) {
              replaceImageFileInputRef.current.click(); 
            }
          }
        });
      }
    };
    
    iframe.srcdoc = getIframeContent(initialUi.html, initialUi.customCss);
    iframe.addEventListener('load', handleIframeLoad);

    // Global click listener to hide context menu
    const handleGlobalClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleGlobalClick);

    return () => {
      iframe.removeEventListener('load', handleIframeLoad);
      if (iframe.contentDocument && iframe.contentDocument.body) {
        iframe.contentDocument.body.contentEditable = 'false';
        // Clean up iframe listeners if needed, though they get removed with srcdoc change
      }
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [initialUi, getIframeContent]);

  const handleReplaceImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedImageElementToReplace) {
      try {
        const dataUrl = await readFileAsDataURL(file);
        selectedImageElementToReplace.src = dataUrl;
      } catch (err) {
        console.error("Error reading image file:", err);
        alert("Failed to load image. Please try another file.");
      } finally {
        if(selectedImageElementToReplace) selectedImageElementToReplace.removeAttribute('data-editing');
        setSelectedImageElementToReplace(null); 
        if (event.target) event.target.value = ''; 
      }
    }
  };

  const addAssetToIframe = (assetWrapper: HTMLElement) => {
    const iframeBody = iframeRef.current?.contentDocument?.body;
    if (iframeBody) {
        const scrollX = iframeRef.current?.contentWindow?.scrollX || 0;
        const scrollY = iframeRef.current?.contentWindow?.scrollY || 0;
        assetWrapper.style.left = `${scrollX + 20}px`;
        assetWrapper.style.top = `${scrollY + 20}px`;
        assetWrapper.setAttribute('data-x', (scrollX + 20).toString());
        assetWrapper.setAttribute('data-y', (scrollY + 20).toString());
        
        iframeBody.appendChild(assetWrapper);
        const doc = iframeRef.current?.contentDocument;
        if (doc && doc.defaultView && typeof (doc.defaultView as any).initInteract === 'function') {
          (doc.defaultView as any).initInteract();
        }
    }
  };

  const handleAddNewImageClick = () => { newImageFileInputRef.current?.click(); };
  const handleNewImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && iframeRef.current?.contentDocument) {
      try {
        const dataUrl = await readFileAsDataURL(file);
        const wrapperDiv = iframeRef.current.contentDocument.createElement('div');
        wrapperDiv.className = 'editable-asset';
        wrapperDiv.style.width = "200px"; wrapperDiv.style.height = "150px"; 
        const img = iframeRef.current.contentDocument.createElement('img');
        img.src = dataUrl; img.alt = file.name || "Uploaded image";
        img.className = "editable-asset-child"; img.contentEditable = "false";
        wrapperDiv.appendChild(img); addAssetToIframe(wrapperDiv);
      } catch (err) { console.error("Error adding new image:", err); alert("Failed to add new image.");
      } finally { if (event.target) event.target.value = ''; }
    }
  };
  
  const handleAddNewSvgClick = () => { newSvgFileInputRef.current?.click(); };
  const handleNewSvgFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && iframeRef.current?.contentDocument) {
      if (file.type !== "image/svg+xml") {
        alert("Invalid file type. Please upload an SVG file.");
        if (event.target) event.target.value = ''; return;
      }
      try {
        const svgString = await readFileAsText(file);
        const parser = new DOMParser(); const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
        const svgElement = svgDoc.documentElement;
        if (svgElement && svgElement.nodeName.toLowerCase() === 'svg') {
          svgElement.removeAttribute('width'); svgElement.removeAttribute('height');
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svgElement.setAttribute('class', "editable-asset-child"); svgElement.contentEditable = "false";
          const wrapperDiv = iframeRef.current.contentDocument.createElement('div');
          wrapperDiv.className = 'editable-asset'; wrapperDiv.style.width = "100px"; 
          wrapperDiv.style.height = "100px"; wrapperDiv.style.overflow = "visible";
          wrapperDiv.appendChild(svgElement); addAssetToIframe(wrapperDiv);
        } else { alert("Could not parse the SVG file properly."); }
      } catch (err) { console.error("Error adding new SVG:", err); alert("Failed to add new SVG.");
      } finally { if (event.target) event.target.value = ''; }
    }
  };

  const handleSave = () => {
    if (iframeRef.current && iframeRef.current.contentDocument) {
      iframeRef.current.contentDocument.body.contentEditable = 'false';
      iframeRef.current.contentDocument.querySelectorAll('[data-editing="true"]').forEach(el => el.removeAttribute('data-editing'));
      const updatedHtml = iframeRef.current.contentDocument.body.innerHTML;
      onSave(updatedHtml);
    }
  };

  const getEditableAssetsZIndices = (doc: Document): number[] => {
    const zIndices: number[] = [];
    doc.querySelectorAll<HTMLElement>('.editable-asset').forEach(el => {
      const z = parseInt(el.style.zIndex || '0', 10); // Default to 0 if not set
      if (!isNaN(z)) {
        zIndices.push(z);
      }
    });
    return zIndices;
  };

  const handleContextMenuAction = (action: 'delete' | 'bringToFront' | 'sendToBack') => {
    if (!contextMenu.target || !iframeRef.current?.contentDocument) return;
    const doc = iframeRef.current.contentDocument;

    switch (action) {
      case 'delete':
        contextMenu.target.remove();
        break;
      case 'bringToFront': {
        const zIndices = getEditableAssetsZIndices(doc);
        const maxZ = zIndices.length > 0 ? Math.max(...zIndices) : 0;
        contextMenu.target.style.zIndex = (maxZ + 1).toString();
        break;
      }
      case 'sendToBack': {
        const zIndices = getEditableAssetsZIndices(doc);
        const minZ = zIndices.length > 0 ? Math.min(...zIndices) : 0;
        contextMenu.target.style.zIndex = (minZ - 1).toString();
        break;
      }
    }
    setContextMenu({ visible: false, x: 0, y: 0, target: null });
  };


  return (
    <div className="space-y-6 relative"> {/* Added relative for context menu positioning */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-1">
            UI Visual Editor
          </h2>
          <p className="text-sm text-slate-300">
            Edit text. Click images to replace. Right-click added assets for more options.
          </p>
        </div>
        <div className="flex space-x-2 mt-3 sm:mt-0">
            <button onClick={handleAddNewImageClick} className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors flex items-center space-x-1.5" title="Add a new image"><PhotoIcon className="w-4 h-4" /><span>Add Image</span></button>
            <button onClick={handleAddNewSvgClick} className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-purple-500 hover:bg-purple-600 transition-colors flex items-center space-x-1.5" title="Add a new SVG icon"><SparklesIcon className="w-4 h-4" /><span>Add SVG</span></button>
        </div>
      </div>
      
      {isLoading && (<div className="flex justify-center items-center h-96 bg-slate-700 rounded-md"><p className="text-slate-300">Loading editor...</p></div>)}

      <div className={`p-1 bg-slate-700 rounded-md ${isLoading ? 'hidden': ''}`}>
        <iframe ref={iframeRef} key={initialUi.html + initialUi.customCss} title="UI Visual Editor" className="w-full h-[60vh] md:h-[70vh] border-none rounded-md bg-white" sandbox="allow-scripts allow-same-origin" />
      </div>
      <input type="file" ref={replaceImageFileInputRef} accept="image/*" onChange={handleReplaceImageFileChange} className="hidden" aria-hidden="true" />
      <input type="file" ref={newImageFileInputRef} accept="image/*" onChange={handleNewImageFileChange} className="hidden" aria-hidden="true" />
      <input type="file" ref={newSvgFileInputRef} accept="image/svg+xml,.svg" onChange={handleNewSvgFileChange} className="hidden" aria-hidden="true" />

      {contextMenu.visible && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="absolute z-50 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-lg py-1 text-sm"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking menu itself
        >
          <button onClick={() => handleContextMenuAction('bringToFront')} className="block w-full text-left px-3 py-1.5 hover:bg-slate-600 transition-colors">Bring to Front</button>
          <button onClick={() => handleContextMenuAction('sendToBack')} className="block w-full text-left px-3 py-1.5 hover:bg-slate-600 transition-colors">Send to Back</button>
          <div className="my-1 border-t border-slate-600"></div>
          <button onClick={() => handleContextMenuAction('delete')} className="block w-full text-left px-3 py-1.5 text-red-400 hover:bg-slate-600 hover:text-red-300 transition-colors flex items-center space-x-2"><TrashIcon className="w-4 h-4" /><span>Delete</span></button>
        </div>
      )}

      <div className="flex justify-end space-x-4 mt-6">
        <button onClick={onCancel} className="px-6 py-2 text-base font-medium rounded-md text-slate-300 bg-slate-600 hover:bg-slate-500 transition-colors flex items-center space-x-2" aria-label="Cancel editing"><XCircleIcon className="w-5 h-5" /><span>Cancel</span></button>
        <button onClick={handleSave} disabled={isLoading} className="px-6 py-2 text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2" aria-label="Save changes"><CheckIcon className="w-5 h-5" /><span>Save Changes</span></button>
      </div>
      {selectedImageElementToReplace && (<p className="text-xs text-yellow-400 text-center mt-2">Selected an image for replacement. Choose a new file.</p>)}
    </div>
  );
};

export default UiEditor;
