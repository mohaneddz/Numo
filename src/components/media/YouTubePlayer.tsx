import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  LOCAL_RUNTIME_SETTINGS_EVENT,
  isOnlineMode,
  type LocalRuntimeSettings,
} from '../../services/localRuntimeSettings';

interface YouTubePlayerApi {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

interface YouTubePlayerEvent {
  target: YouTubePlayerApi;
  data: number;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      host?: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: YouTubePlayerEvent) => void;
        onStateChange: (event: YouTubePlayerEvent) => void;
        onError: (event: YouTubePlayerEvent) => void;
      };
    },
  ) => YouTubePlayerApi;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const existingCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      existingCallback?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube player API loaded without a player constructor.'));
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Could not load the YouTube player API.'));
    document.head.appendChild(script);
  });
  return apiPromise;
}

export interface YouTubePlayerHandle {
  play: () => void;
  pause: () => void;
  seekBy: (seconds: number) => void;
  seekTo: (seconds: number) => void;
  seekToFraction: (fraction: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
}

interface YouTubePlayerProps {
  videoId: string;
  className?: string;
  controls?: boolean;
  volume?: number;
  playbackRate?: number;
  onPlayingChange?: (playing: boolean) => void;
  onProgress?: (currentSeconds: number, durationSeconds: number) => void;
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    {
      videoId,
      className = '',
      controls = false,
      volume = 100,
      playbackRate = 1,
      onPlayingChange,
      onProgress,
    },
    forwardedRef,
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YouTubePlayerApi | null>(null);
    const volumeRef = useRef(volume);
    const playbackRateRef = useRef(playbackRate);
    const onPlayingChangeRef = useRef(onPlayingChange);
    const onProgressRef = useRef(onProgress);
    const [error, setError] = useState('');
    const [online, setOnline] = useState(isOnlineMode);
    volumeRef.current = volume;
    playbackRateRef.current = playbackRate;
    onPlayingChangeRef.current = onPlayingChange;
    onProgressRef.current = onProgress;

    useImperativeHandle(forwardedRef, () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seekBy: (seconds) => {
        const player = playerRef.current;
        if (!player) return;
        player.seekTo(Math.max(0, player.getCurrentTime() + seconds), true);
      },
      seekTo: (seconds) => playerRef.current?.seekTo(Math.max(0, seconds), true),
      seekToFraction: (fraction) => {
        const player = playerRef.current;
        if (!player) return;
        player.seekTo(Math.max(0, Math.min(1, fraction)) * player.getDuration(), true);
      },
      setVolume: (volume) => playerRef.current?.setVolume(volume),
      setPlaybackRate: (rate) => playerRef.current?.setPlaybackRate(rate),
    }), []);

    useEffect(() => {
      const handleSettings = (event: Event) => {
        setOnline((event as CustomEvent<LocalRuntimeSettings>).detail.connectivityMode === 'online');
      };
      window.addEventListener(LOCAL_RUNTIME_SETTINGS_EVENT, handleSettings);
      return () => window.removeEventListener(LOCAL_RUNTIME_SETTINGS_EVENT, handleSettings);
    }, []);

    useEffect(() => {
      let cancelled = false;
      let progressTimer: number | undefined;
      const mount = mountRef.current;
      if (!mount) return;
      if (!online) {
        setError('YouTube streaming is unavailable in Offline mode.');
        return;
      }
      setError('');

      void loadYouTubeIframeApi()
        .then((YT) => {
          if (cancelled) return;
          playerRef.current = new YT.Player(mount, {
            videoId,
            width: '100%',
            height: '100%',
            host: 'https://www.youtube-nocookie.com',
            playerVars: {
              autoplay: 0,
              controls: controls ? 1 : 0,
              enablejsapi: 1,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: (event) => {
                playerRef.current = event.target;
                event.target.setVolume(volumeRef.current);
                event.target.setPlaybackRate(playbackRateRef.current);
                progressTimer = window.setInterval(() => {
                  const player = playerRef.current;
                  if (!player) return;
                  onProgressRef.current?.(player.getCurrentTime(), player.getDuration());
                }, 500);
              },
              onStateChange: (event) => {
                onPlayingChangeRef.current?.(event.data === 1);
              },
              onError: () => {
                setError('This YouTube source cannot be played in the embedded player.');
                onPlayingChangeRef.current?.(false);
              },
            },
          });
        })
        .catch((loadError) => {
          if (!cancelled) {
            setError(loadError instanceof Error ? loadError.message : 'Could not load YouTube.');
          }
        });

      return () => {
        cancelled = true;
        if (progressTimer) window.clearInterval(progressTimer);
        playerRef.current?.destroy();
        playerRef.current = null;
      };
    }, [controls, online, videoId]);

    useEffect(() => {
      playerRef.current?.setVolume(volume);
    }, [volume]);

    useEffect(() => {
      playerRef.current?.setPlaybackRate(playbackRate);
    }, [playbackRate]);

    return (
      <div className={`relative overflow-hidden bg-black ${className}`.trim()}>
        <div ref={mountRef} className="h-full w-full" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-5 text-center text-[12px] font-semibold text-rose-200">
            {error}
          </div>
        )}
      </div>
    );
  },
);

export default YouTubePlayer;
