import React from 'react';

const ProgressBar = ({ 
  currentPosition, 
  duration, 
  handleSeek, 
  setIsDragging, 
  formatTime 
}) => {
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-xs text-gray-400 w-12 text-right">
        {formatTime(currentPosition)}
      </span>
      <div className="relative w-full h-1 bg-gray-600 rounded-lg">
        <div 
          className="absolute h-full bg-[#1DB954] rounded-lg"
          style={{ width: `${(currentPosition / duration) * 100}%` }}
        />
        <input
          type="range"
          min="0"
          max={duration}
          value={currentPosition}
          onChange={handleSeek}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
        />
      </div>
      <span className="text-xs text-gray-400 w-12">
        {formatTime(duration)}
      </span>
    </div>
  );
};

export default ProgressBar; 