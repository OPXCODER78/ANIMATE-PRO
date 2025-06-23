import React, { useState, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon'; // New Download Icon
import { downloadFile } from '../utils/downloadFile'; // Import the utility

interface CodeBlockProps {
  language: string;
  code: string;
  filename?: string; // Optional filename for download
}

// Basic syntax highlighting logic (can be expanded)
const applySyntaxHighlighting = (code: string, language: string): string => {
  let highlightedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (language === 'html') {
    // Tags
    highlightedCode = highlightedCode.replace(/(&lt;\/?[\w\s="/.':#-]+&gt;)/g, '<span class="text-pink-400">$1</span>');
    // Attributes
    highlightedCode = highlightedCode.replace(/([\w-]+)=(".*?"|'.*?')/g, '<span class="text-green-400">$1</span>=<span class="text-yellow-400">$2</span>');
  } else if (language === 'css') {
    // Selectors
    highlightedCode = highlightedCode.replace(/(^|[\s{;}])([\w#-.:*\[\]="'\s]+)\s*{/g, '$1<span class="text-purple-400">$2</span>{');
    // Properties
    highlightedCode = highlightedCode.replace(/([\w-]+)\s*:/g, '<span class="text-sky-400">$1</span>:');
    // Values & Units
    highlightedCode = highlightedCode.replace(/:\s*(.*?);/g, (_match, p1) => `: <span class="text-yellow-400">${p1}</span>;`);
    // Comments
    highlightedCode = highlightedCode.replace(/(\/\*.*?\*\/)/g, '<span class="text-slate-500">$1</span>');
     // Keywords like @keyframes, important
    highlightedCode = highlightedCode.replace(/(@[\w-]+|!important)/g, '<span class="text-pink-400">$1</span>');
  } else if (language === 'javascript') {
    // Keywords
    highlightedCode = highlightedCode.replace(/\b(const|let|var|function|return|if|else|for|while|document|window|new|this|class|extends|super|import|export|default|async|await|try|catch|finally)\b/g, '<span class="text-purple-400">$1</span>');
    // Strings
    highlightedCode = highlightedCode.replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="text-yellow-400">$1</span>');
    // Comments
    highlightedCode = highlightedCode.replace(/(\/\/.*?(\n|$)|\/\*.*?\*\/)/g, '<span class="text-slate-500">$1</span>');
    // Numbers
    highlightedCode = highlightedCode.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="text-green-400">$1</span>');
     // Function names
    highlightedCode = highlightedCode.replace(/(\w+)\s*\(/g, '<span class="text-sky-400">$1</span>(');
  }
  return highlightedCode;
};


const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, filename }) => {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>('');

  useEffect(() => {
    setHighlightedCode(applySyntaxHighlighting(code, language));
  }, [code, language]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!filename) return;
    let mimeType = 'text/plain';
    if (language === 'html') mimeType = 'text/html';
    else if (language === 'css') mimeType = 'text/css';
    else if (language === 'javascript') mimeType = 'application/javascript';
    downloadFile(code, filename, mimeType);
  };

  if (!code.trim()) {
    return <p className="text-slate-400 p-4 text-center">No {language.toUpperCase()} code provided.</p>;
  }

  return (
    <div className="bg-slate-900 rounded-md relative group">
      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        {filename && (
          <button
            onClick={handleDownload}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
            aria-label="Download code"
            title="Download file"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={copyToClipboard}
          className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          aria-label="Copy code"
          title="Copy to clipboard"
        >
          {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto max-h-96">
        <code className={`language-${language} font-mono`} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
};

export default CodeBlock;
