import React from 'react';
import { useSpotifyPlayerContext } from '../context/SpotifyPlayerContext';
import { playTrack, pauseTrack, resumeTrack, skipTrack } from '../Services/spotifyService';

const GlobalSpotifyPlayer = () => {
  const { player, deviceId, currentTrack, isPlaying, error, isPlayerReady } = useSpotifyPlayerContext();

  const handlePlayPause = async () => {
    if (!deviceId) return;
    
    try {
      if (isPlaying) {
        await pauseTrack();
      } else {
        await resumeTrack();
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };

  const handleSkip = async (direction) => {
    if (!deviceId) return;
    
    try {
      await skipTrack(direction);
    } catch (err) {
      console.error('Error skipping track:', err);
    }
  };

  if (!isPlayerReady || !currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-black text-white border-t border-gray-800 flex items-center justify-between px-4 mx-4 z-50">
      {/* Left - Track Info */}
      <div className="flex items-center gap-4 w-1/4 min-w-[180px]">
        {currentTrack && (
          <>
            <img 
              src={currentTrack.album.images[0].url} 
              alt="Album" 
              className="h-14 w-14 object-cover rounded-md" 
            />
            <div className="truncate">
              <p className="text-sm font-semibold truncate">{currentTrack.name}</p>
              <p className="text-xs text-gray-400 truncate">
                {currentTrack.artists.map(a => a.name).join(", ")}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Center - Controls */}
      <div className="flex flex-col items-center justify-center w-2/4 max-w-[500px]">
        <div className="flex items-center justify-center gap-5 mb-1">
          <button 
            onClick={() => handleSkip("previous")} 
            className="text-sm hover:text-cyan-400 transition-colors"
          >
            ⏮️
          </button>
          <button
            onClick={handlePlayPause}
            className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center text-lg hover:bg-cyan-400 transition-colors"
          >
            {isPlaying ? "⏸️" : "▶️"}
          </button>
          <button 
            onClick={() => handleSkip("next")} 
            className="text-sm hover:text-cyan-400 transition-colors"
          >
            ⏭️
          </button>
        </div>
      </div>

      {/* Right - Volume */}
      <div className="w-1/4 flex justify-end">
        {error && (
          <div className="text-red-400 text-sm mr-4">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSpotifyPlayer; 