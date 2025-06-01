import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiPlay, FiMusic } from "react-icons/fi";
import useSpotifyPlayer from '../../hooks/useSpotifyPlayer';

export default function PlaylistCard({ playlist, onPlay }) {
  const navigate = useNavigate();
  const { playPlaylist } = useSpotifyPlayer();

  const handleClick = () => {
    navigate(`/dashboard/playlist/${playlist.id}`);
  };

  const handlePlay = (e) => {
    e.stopPropagation(); // Prevent navigation when clicking play
    if (playlist.uri) {
      playPlaylist(playlist.uri);
    }
  };

  return (
    <motion.div 
      className="group relative bg-[#181818] hover:bg-[#282828] rounded-lg overflow-hidden transition-all duration-300 cursor-pointer"
      whileHover={{ y: -5 }}
      onClick={handleClick}
    >
      {/* Playlist Image Container */}
      <div className="relative aspect-square overflow-hidden">
        {playlist.coverImage ? (
          <img 
            src={playlist.coverImage} 
            alt={playlist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1db954] to-[#191414] flex items-center justify-center">
            <FiMusic className="text-4xl text-white/80" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <motion.button 
          onClick={handlePlay}
          className="absolute bottom-4 right-4 w-12 h-12 bg-[#1db954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg hover:scale-110"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiPlay className="text-xl text-black" />
        </motion.button>
      </div>

      {/* Playlist Info */}
      <div className="p-4">
        <h4 className="text-white font-bold truncate mb-1">{playlist.name}</h4>
        <p className="text-sm text-gray-400 line-clamp-2">
          {playlist.totalTracks} tracks • By {playlist.owner}
        </p>
      </div>

      {/* Hover Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
}