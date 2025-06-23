import React, { useState } from 'react';
import { AnimationVariation } from '../types';
import AnimationPreview from './AnimationPreview';
import CodeBlock from './CodeBlock';
import { EyeIcon } from './icons/EyeIcon';
import { CodeIcon } from './icons/CodeIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon'; 
import { ArrowTopRightOnSquareIcon } from './icons/ArrowTopRightOnSquareIcon'; // New Icon

interface AnimationCardProps {
  animation: AnimationVariation;
}

enum Tab {
  Preview = 'Preview',
  HTML = 'HTML',
  CSS = 'CSS',
  JS = 'JS',
}

const AnimationCard: React.FC<AnimationCardProps> = ({ animation }) => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Preview);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleRefreshPreview = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  const handleOpenInNewTab = () => {
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
            #animation-wrapper {
               width: 100%;
               height: 100%;
               display: flex; 
               align-items: center; 
               justify-content: center; 
            }
            ${animation.customCss || ''}
          </style>
        </head>
        <body>
          <div id="animation-wrapper-outer">
            ${animation.html}
          </div>
          ${animation.javascript ? `<script type="module">${animation.javascript.replace(/<\/script>/g, '<\\/script>')}<\/script>` : ''}
        </body>
      </html>
    `;
    const blob = new Blob([completeHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // URL.revokeObjectURL(url); // Optional: Revoke after a delay or let browser handle
  };

  const safeFilenameBase = animation.name.replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'animation';

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Preview:
        return (
          <AnimationPreview
            id={animation.id}
            htmlContent={animation.html}
            customCss={animation.customCss}
            javascriptContent={animation.javascript}
            iframeKey={`preview-${animation.id}-${refreshKey}`}
          />
        );
      case Tab.HTML:
        return <CodeBlock language="html" code={animation.html} filename={`${safeFilenameBase}.html`} />;
      case Tab.CSS:
        return animation.customCss ? (
          <CodeBlock language="css" code={animation.customCss} filename={`${safeFilenameBase}.css`} />
        ) : (
          <p className="text-slate-400 p-4 text-center">No custom CSS provided for this animation.</p>
        );
      case Tab.JS:
        return animation.javascript ? (
          <CodeBlock language="javascript" code={animation.javascript} filename={`${safeFilenameBase}.js`} />
        ) : (
          <p className="text-slate-400 p-4 text-center">No JavaScript provided for this animation.</p>
        );
      default:
        return null;
    }
  };
  
  const tabButtonClasses = (tabName: Tab) => 
    `px-3 py-2 text-xs sm:text-sm font-medium rounded-t-md transition-colors duration-150 focus:outline-none flex items-center space-x-1.5 ` +
    (activeTab === tabName 
      ? 'bg-slate-700 text-purple-400 border-b-2 border-purple-500' 
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50');

  return (
    <div className="bg-slate-800 shadow-xl rounded-lg overflow-hidden border border-slate-700">
      <div className="p-4 sm:p-6 bg-slate-800 border-b border-slate-700">
        <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          {animation.name || 'Unnamed Animation'}
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
          {(animation.customCss) && (
             <button onClick={() => setActiveTab(Tab.CSS)} className={tabButtonClasses(Tab.CSS)} aria-label="Show CSS code">
               <CodeIcon className="w-4 h-4" /> <span>CSS</span>
             </button>
          )}
          {(animation.javascript) && (
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
              aria-label="Open animation preview in new tab"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleRefreshPreview}
              className="p-1.5 text-slate-400 hover:text-purple-400 transition-colors duration-150 rounded-md hover:bg-slate-700"
              title="Refresh Preview"
              aria-label="Refresh animation preview"
            >
              <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-1 bg-slate-700 min-h-[200px]">
        {renderContent()}
      </div>
    </div>
  );
};

export default AnimationCard;