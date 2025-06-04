import React, { useState } from 'react';

const VolumeControl = ({ 
  volume, 
  isMuted, 
  handleVolumeChange, 
  handleMuteToggle 
}) => {
  const [showPresets, setShowPresets] = useState(false);

  // Volume presets for common listening levels
  const volumePresets = [
    { label: 'Quiet', value: 25 },
    { label: 'Normal', value: 50 },
    { label: 'Loud', value: 75 },
    { label: 'Max', value: 100 }
  ];

  const handlePresetClick = (presetValue) => {
    handleVolumeChange({ target: { value: presetValue } });
    setShowPresets(false);
  };

  return (
    <div className="w-1/4 flex items-center justify-end gap-2 relative">
      <button 
        onClick={handleMuteToggle}
        className="text-gray-400 hover:text-white transition-colors"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {volume === 0 ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        ) : volume < 50 ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>
      
      <div className="relative w-32 group">
        <div className="relative h-1 bg-gray-600 rounded-lg">
          <div 
            className="absolute h-full bg-[#1DB954] rounded-lg transition-all duration-200"
            style={{ width: `${volume}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="absolute w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        
        {/* Volume level indicator */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {volume}%
        </div>
      </div>

      {/* Volume presets button */}
      <button
        onClick={() => setShowPresets(!showPresets)}
        className="text-gray-400 hover:text-white transition-colors"
        title="Volume presets"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>

      {/* Volume presets dropdown */}
      {showPresets && (
        <div className="absolute bottom-full right-0 mb-2 bg-[#282828] rounded-lg shadow-lg p-2 z-50">
          {volumePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset.value)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#383838] rounded transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolumeControl; 