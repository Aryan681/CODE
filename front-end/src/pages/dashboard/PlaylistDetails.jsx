import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPlaylistTracks, getUserPlaylists } from "../../features/spotify/Services/spotifyService";
import { FiMusic, FiPlay, FiPause, FiClock, FiUser, FiCalendar, FiShuffle } from "react-icons/fi";
import { useSpotifyPlayerContext } from "../../features/spotify/context/SpotifyPlayerContext";
import SpotifyLoader from "../../features/spotify/component/common/SpotifyLoader";

const PlaylistDetails = () => {
  const { playlistId } = useParams();
  const [tracks, setTracks] = useState([]);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { 
    deviceId, 
    isPlayerReady, 
    isPlaying, 
    currentTrack, 
    togglePlayPause, 
    playPlaylist, 
    isShuffled, 
    toggleShuffle,
    addToQueue,
    clearQueue,
    queue,
    currentQueueIndex
  } = useSpotifyPlayerContext();

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  useEffect(() => {
    const fetchPlaylistData = async () => {
      try {
        setLoading(true);
        const playlistData = await getUserPlaylists();
        const currentPlaylist = playlistData.find(pl => pl.id === playlistId);
        setPlaylist(currentPlaylist);

        const data = await getPlaylistTracks(playlistId);
        setTracks(data);
      } catch (error) {
        console.error("Failed to fetch playlist data:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistData();
  }, [playlistId]);

  // Add tracks to queue when they're loaded
  useEffect(() => {
    if (tracks.length > 0) {
      addToQueue(tracks);
    }
  }, [tracks]);

  const handleTrackClick = async (trackUri) => {
    if (!isPlayerReady || !deviceId) {
      console.error("Player not ready or no device ID available");
      return;
    }

    try {
      await playTrack(trackUri, deviceId);
    } catch (error) {
      console.error("Failed to play track:", error);
    }
  };

  const handlePlayPlaylist = async () => {
    if (!isPlayerReady || !deviceId) {
      console.error("Player not ready or no device ID available");
      return;
    }

    try {
      // Check if current track is from this playlist
      const isCurrentTrackFromPlaylist = tracks.some(track => track.id === currentTrack?.id);
      
      if (isCurrentTrackFromPlaylist) {
        // If current track is from this playlist, toggle play/pause
        await togglePlayPause();
      } else {
        // Clear existing queue and add new tracks
        clearQueue();
        addToQueue(tracks);
        // Start playing the playlist with shuffle enabled
        await playPlaylist(playlistId, true);
      }
    } catch (error) {
      console.error("Failed to play playlist:", error);
    }
  };

  if (loading) {
    return <SpotifyLoader message="Loading Playlist" />;
  }

  if (!playlist) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-b from-gray-900 to-black text-white min-h-screen"
    >
      {/* Playlist Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1DB954]/20 to-transparent" />
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative px-8 pt-8 pb-4"
        >
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-48 h-48 shadow-2xl"
            >
              <img
                src={playlist.coverImage}
                alt={playlist.name}
                className="w-full h-full object-cover rounded-lg"
              />
            </motion.div>
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex-1 text-center md:text-left"
            >
              <p className="text-sm font-medium mb-2 text-[#1DB954]">PLAYLIST</p>
              <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-[#1db954]">
                {playlist.name}
              </h1>
              <p className="text-gray-300 mb-4">{playlist.description}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <FiUser className="text-[#1DB954]" />
                  <span>{playlist.owner}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiMusic className="text-[#1DB954]" />
                  <span>{tracks.length} songs</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiClock className="text-[#1DB954]" />
                  <span>{formatDuration(tracks.reduce((acc, track) => acc + track.duration, 0))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-[#1DB954]" />
                  <span>Created {formatDate(playlist.createdAt)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Play Button and Shuffle Toggle */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-8 py-4 flex items-center gap-4"
      >
        <button 
          onClick={handlePlayPlaylist}
          className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 px-8 rounded-full flex items-center gap-2 transition-all duration-300 hover:scale-105"
        >
          {tracks.some(track => track.id === currentTrack?.id) && isPlaying ? (
            <FiPause className="w-6 h-6" />
          ) : (
            <FiPlay className="w-6 h-6" />
          )}
          {tracks.some(track => track.id === currentTrack?.id) && isPlaying ? "PAUSE" : "PLAY"}
        </button>

        <button
          onClick={toggleShuffle}
          className={`p-3 rounded-full transition-all duration-300 hover:scale-105 ${
            isShuffled ? 'text-[#1DB954]' : 'text-gray-400 hover:text-white'
          }`}
          title={isShuffled ? "Disable shuffle" : "Enable shuffle"}
        >
          <FiShuffle className="w-6 h-6" />
        </button>
      </motion.div>

      {/* Tracks List */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="px-8"
      >
        <div className="grid grid-cols-12 gap-4 text-gray-400 text-sm uppercase tracking-wider border-b border-gray-800 pb-2">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-3">Album</div>
          <div className="col-span-1 text-right">Time</div>
        </div>

        <AnimatePresence>
          {tracks.map((track, index) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`grid grid-cols-12 gap-4 items-center py-3 px-2 rounded hover:bg-gray-800/50 group text-sm cursor-pointer transition-colors duration-200 ${
                currentQueueIndex === index ? 'bg-gray-800/50' : ''
              }`}
            >
              <div className="col-span-1 text-center text-gray-400 group-hover:text-white">
                {currentTrack?.id === track.id ? (
                  isPlaying ? <FiPause className="mx-auto" /> : <FiPlay className="mx-auto" />
                ) : (
                  index + 1
                )}
              </div>

              <div className="col-span-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 flex-shrink-0 rounded overflow-hidden">
                  {track.album.image ? (
                    <img
                      src={track.album.image}
                      alt={track.album.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <FiMusic />
                    </div>
                  )}
                </div>
                <div>
                  <p className={`text-white font-medium truncate ${currentTrack?.id === track.id ? 'text-[#1DB954]' : ''}`}>
                    {track.name}
                  </p>
                  <p className="text-gray-400 text-xs truncate">{track.artists.join(", ")}</p>
                </div>
              </div>

              <div className="col-span-3 text-gray-400 group-hover:text-white truncate">
                {track.album.name}
              </div>

              <div className="col-span-1 text-right text-gray-400">
                {formatDuration(track.duration)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default PlaylistDetails;
