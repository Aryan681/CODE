import { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './router/AppRoutes';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SpotifyPlayerProvider } from './features/spotify/context/SpotifyPlayerContext';
import GlobalSpotifyPlayer from './features/spotify/component/PLAY/GlobalSpotifyPlayer';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

function App() {

  useEffect(() => {
    console.log('Current localStorage:', {
      token: localStorage.getItem('token'),
      user: localStorage.getItem('user'),
      githubToken: localStorage.getItem('githubAccessToken')
    });
  }, []);

  return (
    <Router>
      <SpotifyPlayerProvider>
        <AppRoutes />
        <GlobalSpotifyPlayer />
      </SpotifyPlayerProvider>
    </Router>
  );
}

export default App;