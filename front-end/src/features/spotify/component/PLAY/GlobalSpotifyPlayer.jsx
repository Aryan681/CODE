import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSpotifyPlayerContext } from '../../context/SpotifyPlayerContext';
import { usePlayerState } from './hooks/usePlayerState';
import { usePlayerHandlers } from './hooks/usePlayerHandlers';
import TrackInfo from './components/TrackInfo';
import PlaybackControls from './components/PlaybackControls';
import ProgressBar from './components/ProgressBar';
import VolumeControl from './components/VolumeControl';

const GlobalSpotifyPlayer = () => {
  const location = useLocation();
  const { player, deviceId, currentTrack, isPlaying } = useSpotifyPlayerContext();
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

  // Get saved track from localStorage if currentTrack is null
  const savedTrack = localStorage.getItem('spotifyCurrentTrack');
  const trackToDisplay = currentTrack || (savedTrack ? JSON.parse(savedTrack) : null);

  // Don't return null if we have a saved track
  if (!trackToDisplay) return null;

  // After reload, always show as paused initially
  const displayIsPlaying = currentTrack ? isPlaying : false;

  // Check if we're in the dashboard layout
  const isDashboardLayout = location.pathname.startsWith('/dashboard');

  return (
    <div 
      className={`fixed bottom-0 bg-gradient-to-r from-[#181818] to-[#282828] border-t border-[#282828] p-2 z-10 backdrop-blur-md bg-opacity-95 transition-all duration-300 ${
        isDashboardLayout 
          ? 'left-0 right-0 max-w-screen-xl mx-auto rounded-xl bottom-4' // Same style as other pages
          : 'left-0 right-0 max-w-screen-xl mx-auto rounded-xl bottom-4' // Full width for other pages
      }`}
    >
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <TrackInfo currentTrack={trackToDisplay} />
        <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl px-8">
          <PlaybackControls 
            isPlaying={displayIsPlaying}
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