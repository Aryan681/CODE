import React from 'react';
import { useSpotifyPlayerContext } from '../../context/SpotifyPlayerContext';
import { usePlayerState } from './hooks/usePlayerState';
import { usePlayerHandlers } from './hooks/usePlayerHandlers';
import TrackInfo from './components/TrackInfo';
import PlaybackControls from './components/PlaybackControls';
import ProgressBar from './components/ProgressBar';
import VolumeControl from './components/VolumeControl';

const GlobalSpotifyPlayer = () => {
  const { player, deviceId, currentTrack, isPlaying, playlistId } = useSpotifyPlayerContext();
  const state = usePlayerState(player, isPlaying);
  const handlers = usePlayerHandlers(player, deviceId, currentTrack, isPlaying, state);

  const {
    volume,
    isMuted,
    currentPosition,
    duration,
    isDragging,
    setIsDragging
  } = state;

  const {
    handlePlayPause,
    handleSkip,
    handleVolumeChange,
    handleMuteToggle,
    handleSeek,
    formatTime
  } = handlers;

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-21.5 right-4 bg-gradient-to-r from-[#181818] to-[#282828] border-t border-[#282828] p-2 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <TrackInfo currentTrack={currentTrack} />
        <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl px-8">
          <PlaybackControls 
            isPlaying={isPlaying}
            handlePlayPause={handlePlayPause}
            handleSkip={handleSkip}
          />
          <ProgressBar
            currentPosition={currentPosition}
            duration={duration}
            handleSeek={handleSeek}
            setIsDragging={setIsDragging}
            formatTime={formatTime}
          />
        </div>
        <VolumeControl
          volume={volume}
          isMuted={isMuted}
          handleVolumeChange={handleVolumeChange}
          handleMuteToggle={handleMuteToggle}
        />
        {/* Green bar at the bottom */}
        <div className="absolute left-0 bottom-0 w-full h-1 bg-[#1DB954]" style={{zIndex: 1}} />
      </div>
    </div>
  );
};

export default GlobalSpotifyPlayer; 