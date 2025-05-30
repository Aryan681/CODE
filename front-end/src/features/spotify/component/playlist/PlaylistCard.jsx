import { useNavigate } from "react-router-dom";
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
    <div className="playlist-card" onClick={handleClick}>
      <div className="playlist-image">
        {playlist.coverImage ? (
          <img src={playlist.coverImage} alt={playlist.name} />
        ) : (
          <div className="playlist-image-placeholder">
            <span>🎵</span>
          </div>
        )}
      </div>
      <div className="playlist-info">
        <h4>{playlist.name}</h4>
        <p>{playlist.totalTracks} tracks • By {playlist.owner}</p>
        <button 
          onClick={handlePlay}
          className="play-button"
          title="Play playlist"
        >
          Play
        </button>
      </div>
    </div>
  );
}