import React from 'react';
import { useSpotifyPlayerContext } from '../../../context/SpotifyPlayerContext';

const PlaybackControls = ({ 
  isPlaying, 
  handlePlayPause
}) => {
  const { playNext, playPrevious } = useSpotifyPlayerContext();

  return (
    <div className="flex items-center justify-center gap-6">
      <button 
        onClick={playPrevious} 
        className="text-gray-400 hover:text-white transition-colors transform hover:scale-110 duration-200"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>
      <button
        onClick={handlePlayPause}
        className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-200 hover:bg-white/90 shadow-lg hover:shadow-xl"
      >
        {isPlaying ? (
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
          </svg>
        ) : (
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      <button 
        onClick={playNext} 
        className="text-gray-400 hover:text-white transition-colors transform hover:scale-110 duration-200"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>
    </div>
  );
};

export default PlaybackControls; 