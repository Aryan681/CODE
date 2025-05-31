import React from 'react';

const TrackInfo = ({ currentTrack }) => {
  if (!currentTrack) return null;

  return (
    <div className="flex items-center gap-4 w-1/4 min-w-[180px] group">
      <div className="relative">
        <img 
          src={currentTrack.album.images[0].url} 
          alt="Album" 
          className="h-16 w-16 object-cover rounded-md shadow-lg transition-transform duration-300 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-black/20 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="truncate">
        <p className="text-sm font-semibold truncate text-white group-hover:text-[#1DB954] transition-colors duration-300">
          {currentTrack.name}
        </p>
        <p className="text-xs text-gray-400 truncate group-hover:text-gray-300 transition-colors duration-300">
          {currentTrack.artists.map(a => a.name).join(", ")}
        </p>
      </div>
    </div>
  );
};

export default TrackInfo; 