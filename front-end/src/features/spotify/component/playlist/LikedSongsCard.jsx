import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHeart, FiPlay } from "react-icons/fi";
import useSpotifyPlayer from '../../hooks/useSpotifyPlayer';

export default function LikedSongsCard({ likedPlaylist }) {
  const navigate = useNavigate();
  const { playPlaylist } = useSpotifyPlayer();

  const handleClick = () => {
    navigate(`/dashboard/liked`);
  };

  const handlePlay = (e) => {
    e.stopPropagation();
    if (likedPlaylist.uri) {
      playPlaylist(likedPlaylist.uri);
    }
  };

  return (
    <motion.div 
      className="group relative bg-gradient-to-br from-[#ff1e56] to-[#ff1e56]/20 rounded-lg overflow-hidden transition-all duration-300 cursor-pointer"
      whileHover={{ y: -5 }}
      onClick={handleClick}
    >
      {/* Liked Songs Image Container */}
      <div className="relative aspect-square overflow-hidden">
        {likedPlaylist.images?.[0]?.url ? (
          <img 
            src={likedPlaylist.images[0].url} 
            alt={likedPlaylist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#ff1e56] to-[#ff1e56]/20 flex items-center justify-center">
            <FiHeart className="text-5xl text-white/90 animate-pulse" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <motion.button 
          onClick={handlePlay}
          className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg hover:scale-110"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiPlay className="text-xl text-[#ff1e56]" />
        </motion.button>
      </div>

      {/* Liked Songs Info */}
      <div className="p-4">
        <h4 className="text-white font-bold truncate mb-1">{likedPlaylist.name}</h4>
        <p className="text-sm text-white/80 line-clamp-2">
          {likedPlaylist.tracks.total} liked songs
        </p>
      </div>

      {/* Hover Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#ff1e56]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
}
