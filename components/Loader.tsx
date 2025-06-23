
import React from 'react';

interface LoaderProps {
  elapsedTime?: number;
}

const Loader: React.FC<LoaderProps> = ({ elapsedTime }) => {
  return (
    <div className="flex items-center justify-center space-x-1">
       <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
	    <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
	    <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce"></div>
      <span className="ml-2 text-sm text-slate-200">
        Generating... {elapsedTime !== undefined && `(${elapsedTime}s)`}
      </span>
    </div>
  );
};

export default Loader;
