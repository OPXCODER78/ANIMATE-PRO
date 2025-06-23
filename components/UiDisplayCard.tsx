import React, { useState, useEffect, useRef } from 'react';
import CodeBlock from './CodeBlock';
import { EyeIcon } from './icons/EyeIcon';
import { CodeIcon } from './icons/CodeIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ArrowTopRightOnSquareIcon } from './icons/ArrowTopRightOnSquareIcon'; // New Icon
import { GeneratedUi } from '../types'; 

interface UiDisplayCardProps {
  uiData: GeneratedUi;
  onStartEdit: () => void; 
}

enum Tab {
  Preview = 'Preview',
  HTML = 'HTML',
  CSS = 'CSS',
  JS = 'JS',
}

const UiDisplayCard: React.FC<UiDisplayCardProps> = ({ uiData, onStartEdit }) => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Preview);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const { html, customCss, javascript } = uiData;

  const handleRefreshPreview = () => {
    setIframeKey(prevKey => prevKey + 1);
  };
  
  const getFullHtmlContent = (currentHtml: string, currentCss?: string, currentJs?: string) => {
    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { 
              margin: 0; 
              background-color: #ffffff; 
              color: #111827; 
              overflow: auto; 
            }
            ${currentCss || ''}
          </style>
        </head>
        <body>
          ${currentHtml}
          ${currentJs ? `<script type="module">${currentJs.replace(/<\/script>/g, '<\\/script>')}<\/script>` : ''}
        </body>
      </html>
    `;
  };

  const handleOpenInNewTab = () => {
    const completeHtml = getFullHtmlContent(html, customCss, javascript);
    const blob = new Blob([completeHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };
  
  useEffect(() => {
    if (activeTab === Tab.Preview && iframeRef.current) {
      iframeRef.current.srcdoc = getFullHtmlContent(html, customCss, javascript);
    }
  }, [html, customCss, javascript, activeTab, iframeKey]);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Preview:
        return (
          <iframe
            key={`ui-preview-${iframeKey}`}
            ref={iframeRef}
            title="ui-preview"
            className="w-full h-96 md:h-[500px] border-none rounded-md bg-white"
            sandbox="allow-scripts allow-same-origin" 
            loading="lazy"
          />
        );
      case Tab.HTML:
        return <CodeBlock language="html" code={html} filename="ui_component.html" />;
      case Tab.CSS:
        return customCss ? (
          <CodeBlock language="css" code={customCss} filename="ui_component.css" />
        ) : (
          <p className="text-slate-400 p-4 text-center">No custom CSS provided for this UI.</p>
        );
      case Tab.JS:
        return javascript ? (
          <CodeBlock language="javascript" code={javascript} filename="ui_component.js" />
        ) : (
          <p className="text-slate-400 p-4 text-center">No JavaScript provided for this UI.</p>
        );
      default:
        return null;
    }
  };
  
  const tabButtonClasses = (tabName: Tab) => 
    `px-3 py-2 text-xs sm:text-sm font-medium rounded-t-md transition-colors duration-150 focus:outline-none flex items-center space-x-1.5 ` +
    (activeTab === tabName 
      ? 'bg-slate-700 text-teal-400 border-b-2 border-teal-500' 
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50');

  return (
    <div className="bg-slate-800 shadow-xl rounded-lg overflow-hidden border border-slate-700">
      <div className="p-4 sm:p-6 bg-slate-800 border-b border-slate-700">
        <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
          Generated UI Component
        </h3>
      </div>
      
      <div className="bg-slate-800 border-b border-slate-700 px-2 sm:px-4 pt-2 flex justify-between items-center">
        <div className="flex space-x-1">
          <button onClick={() => setActiveTab(Tab.Preview)} className={tabButtonClasses(Tab.Preview)} aria-label="Show Preview">
            <EyeIcon className="w-4 h-4" /> <span>Preview</span>
          </button>
          <button onClick={() => setActiveTab(Tab.HTML)} className={tabButtonClasses(Tab.HTML)} aria-label="Show HTML code">
            <CodeIcon className="w-4 h-4" /> <span>HTML</span>
          </button>
          {(customCss) && (
             <button onClick={() => setActiveTab(Tab.CSS)} className={tabButtonClasses(Tab.CSS)} aria-label="Show CSS code">
               <CodeIcon className="w-4 h-4" /> <span>CSS</span>
             </button>
          )}
          {(javascript) && (
            <button onClick={() => setActiveTab(Tab.JS)} className={tabButtonClasses(Tab.JS)} aria-label="Show JavaScript code">
              <CodeIcon className="w-4 h-4" /> <span>JS</span>
            </button>
          )}
        </div>
         {activeTab === Tab.Preview && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenInNewTab}
              className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors duration-150 rounded-md hover:bg-slate-700"
              title="Open Preview in New Tab"
              aria-label="Open UI preview in new tab"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onStartEdit} 
              className="p-1.5 text-slate-400 hover:text-yellow-400 transition-colors duration-150 rounded-md hover:bg-slate-700"
              title="Edit Content in Editor"
              aria-label="Edit UI content in dedicated editor"
            >
              <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleRefreshPreview}
              className="p-1.5 text-slate-400 hover:text-teal-400 transition-colors duration-150 rounded-md hover:bg-slate-700"
              title="Refresh UI Preview"
              aria-label="Refresh UI preview"
            >
              <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-1 bg-slate-700 min-h-[300px]">
        {renderContent()}
      </div>
    </div>
  );
};

export default UiDisplayCard;