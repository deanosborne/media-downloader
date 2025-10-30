import React from 'react';

interface FolderBrowserProps {
  onSelect?: (path: string) => void;
  initialPath?: string;
}

const FolderBrowser: React.FC<FolderBrowserProps> = ({ onSelect, initialPath }) => {
  return (
    <div data-testid="folder-browser">
      <input 
        type="text" 
        placeholder="Select folder path"
        defaultValue={initialPath}
        onChange={(e) => onSelect?.(e.target.value)}
      />
    </div>
  );
};

export default FolderBrowser;