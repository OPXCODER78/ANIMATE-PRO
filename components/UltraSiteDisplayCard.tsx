import React, { useState, useEffect, useRef } from 'react';
import { GeneratedSite } from '../types'; 
import CodeBlock from './CodeBlock';
import { EyeIcon } from './icons/EyeIcon';
import { CodeIcon } from './icons/CodeIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { PencilIcon } from './icons/PencilIcon'; 
import { ArrowTopRightOnSquareIcon } from './icons/ArrowTopRightOnSquareIcon'; // New Icon

interface UltraSiteDisplayCardProps {
  site: GeneratedSite; 
  onStartEditAnimations: () => void; 
}

enum Tab {
  Preview = 'Preview',
  HTML = 'HTML',
  CSS = 'CSS',
  JS = 'JS',
}

const UltraSiteDisplayCard: React.FC<UltraSiteDisplayCardProps> = ({ site, onStartEditAnimations }) => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Preview);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const handleRefreshPreview = () => {
    setIframeKey(prevKey => prevKey + 1);
  };
  
  const getFullHtmlContent = () => `
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { 
            margin: 0; 
            overflow: auto; 
            background-color: #ffffff; 
            color: #111827; 
          }
          ${site.customCss || ''}
        </style>
      </head>
      <body>
        ${site.html}
        ${site.javascript ? `<script type="module">${site.javascript.replace(/<\/script>/g, '<\\/script>')}<\/script>` : ''}
      </body>
    </html>
  `;

  const handleOpenInNewTab = () => {
    const completeHtml = getFullHtmlContent();
    const blob = new Blob([completeHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (activeTab === Tab.Preview && iframeRef.current) {
      iframeRef.current.srcdoc = getFullHtmlContent();
    }
  }, [site.html, site.customCss, site.javascript, activeTab, iframeKey]);

  const renderContent = () => {
    const safeSiteNameBase = site.name.replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'ultra_site';
    switch (activeTab) {
      case Tab.Preview:
        return (
          <iframe
            key={`ultra-site-preview-${site.id}-${iframeKey}`}
            ref={iframeRef}
            title={`ultra-site-preview-${site.name}`}
            className="w-full h-[500px] md:h-[700px] border-none rounded-md bg-white" 
            sandbox="allow-scripts allow-same-origin allow-modals" 
            loading="lazy"
            allowFullScreen 
          />
        );
      case Tab.HTML:
        return <CodeBlock language="html" code={site.html} filename={`${safeSiteNameBase}.html`} />;
      case Tab.CSS:
        return site.customCss && site.customCss.trim() !== "" ? (
          <CodeBlock language="css" code={site.customCss} filename={`${safeSiteNameBase}.css`} />
        ) : (
          <p className="text-slate-400 p-4 text-center">No custom CSS provided or it's embedded in HTML.</p>
        );
      case Tab.JS:
        return site.javascript && site.javascript.trim() !== "" ? (
          <CodeBlock language="javascript" code={site.javascript} filename={`${safeSiteNameBase}.js`} />
        ) : (
          <p className="text-slate-400 p-4 text-center">No JavaScript provided yet for animations.</p>
        );
      default:
        return null;
    }
  };
  
  const tabButtonClasses = (tabName: Tab) => 
    `px-3 py-2 text-xs sm:text-sm font-medium rounded-t-md transition-colors duration-150 focus:outline-none flex items-center space-x-1.5 ` +
    (activeTab === tabName 
      ? 'bg-slate-700 text-red-400 border-b-2 border-red-500' 
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50');

  return (
    <div className="bg-slate-800 shadow-xl rounded-lg overflow-hidden border border-slate-700">
      <div className="bg-slate-800 border-b border-slate-700 px-2 sm:px-4 pt-2 flex justify-between items-center">
        <div className="flex space-x-1">
          <button onClick={() => setActiveTab(Tab.Preview)} className={tabButtonClasses(Tab.Preview)} aria-label="Show Preview">
            <EyeIcon className="w-4 h-4" /> <span>Preview</span>
          </button>
          <button onClick={() => setActiveTab(Tab.HTML)} className={tabButtonClasses(Tab.HTML)} aria-label="Show HTML code">
            <CodeIcon className="w-4 h-4" /> <span>HTML</span>
          </button>
          {(site.customCss && site.customCss.trim() !== "") && (
             <button onClick={() => setActiveTab(Tab.CSS)} className={tabButtonClasses(Tab.CSS)} aria-label="Show CSS code">
               <CodeIcon className="w-4 h-4" /> <span>CSS</span>
             </button>
          )}
          {(site.javascript && site.javascript.trim() !== "") && (
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
              aria-label="Open Ultra site preview in new tab"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onStartEditAnimations}
              className="p-1.5 text-slate-400 hover:text-yellow-400 transition-colors duration-150 rounded-md hover:bg-slate-700"
              title="Edit Animations Visually"
              aria-label="Edit site animations in dedicated editor"
            >
              <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleRefreshPreview}
              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors duration-150 rounded-md hover:bg-slate-700"
              title="Refresh Ultra Site Preview"
              aria-label="Refresh Ultra Site preview"
            >
              <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-1 bg-slate-700/50 min-h-[520px] md:min-h-[720px]">
        {renderContent()}
      </div>
    </div>
  );
};

export default UltraSiteDisplayCard;