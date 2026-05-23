"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MediaPlayerClass } from "dashjs";

interface VideoPlayerProps {
  manifestUrl: string;
  title?: string;
  autoplay?: boolean;
}

export const VideoPlayer = ({
  manifestUrl,
  title,
  autoplay = false,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<MediaPlayerClass | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<any[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Track whether the user explicitly paused (vs transient DASH internal pauses)
  const userPausedRef = useRef(!autoplay);
  const [showPlayOverlay, setShowPlayOverlay] = useState(!autoplay);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  // Track whether player is attached to prevent accessing video after unmount
  const isAttachedRef = useRef(false);
  // Debounce timers for buffering state to avoid rapid spinner flicker
  const bufferingOnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferingOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Play: only hide the overlay if the user triggered play (not DASH internal resume)
    const handlePlay = () => {
      setIsPlaying(true);
      if (!userPausedRef.current) {
        setShowPlayOverlay(false);
      }
    };

    // Pause: only show overlay if the user explicitly paused
    const handlePause = () => {
      setIsPlaying(false);
      if (userPausedRef.current) {
        setShowPlayOverlay(true);
      }
    };

    // Throttle timeupdate with requestAnimationFrame to avoid excessive re-renders
    const handleTimeUpdate = () => {
      if (!isAttachedRef.current) return;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        if (isAttachedRef.current) {
          setCurrentTime(video.currentTime);
        }
        rafRef.current = null;
      });
    };

    const handleLoadedMetadata = () => {
      if (!isAttachedRef.current) return;
      setDuration(video.duration);
    };
    const handleVolumeChange = () => {
      if (!isAttachedRef.current) return;
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleWaiting = () => {
      // Only show spinner if buffering persists for >1000ms (ignores quick ABR segment fetches)
      if (bufferingOffTimer.current) {
        clearTimeout(bufferingOffTimer.current);
        bufferingOffTimer.current = null;
      }
      if (!bufferingOnTimer.current) {
        bufferingOnTimer.current = setTimeout(() => {
          setBuffering(true);
          bufferingOnTimer.current = null;
        }, 1000);
      }
    };

    const handleCanPlay = () => {
      // Delay hiding spinner to avoid flicker if canplay fires briefly then waiting again
      if (bufferingOnTimer.current) {
        clearTimeout(bufferingOnTimer.current);
        bufferingOnTimer.current = null;
      }
      if (!bufferingOffTimer.current) {
        bufferingOffTimer.current = setTimeout(() => {
          setBuffering(false);
          bufferingOffTimer.current = null;
        }, 500);
      }
    };

    const handleStalled = () => {
      // Handle stalled playback - similar to waiting but for extended stalls
      if (!bufferingOnTimer.current) {
        bufferingOnTimer.current = setTimeout(() => {
          setBuffering(true);
          bufferingOnTimer.current = null;
        }, 1000);
      }
    };

    const handleSuspend = () => {
      // Browser suspended loading - show spinner
      if (!bufferingOnTimer.current) {
        bufferingOnTimer.current = setTimeout(() => {
          setBuffering(true);
          bufferingOnTimer.current = null;
        }, 500);
      }
    };

    const handleProgress = () => {
      if (!isAttachedRef.current) return;
      // Monitor buffer health - hide spinner if buffer is healthy
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedEnd(bufferedEnd);
        const bufferAhead = bufferedEnd - video.currentTime;

        // If we have at least 3 seconds buffered, hide spinner
        if (bufferAhead > 3 && buffering) {
          if (bufferingOnTimer.current) {
            clearTimeout(bufferingOnTimer.current);
            bufferingOnTimer.current = null;
          }
          setBuffering(false);
        }
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("stalled", handleStalled);
    video.addEventListener("suspend", handleSuspend);
    video.addEventListener("progress", handleProgress);

    let player: MediaPlayerClass | null = null;

    const initPlayer = async () => {
      const dashjsModule = await import("dashjs");
      const dashjs = dashjsModule.default || dashjsModule;
      const p = dashjs.MediaPlayer().create();
      player = p;
      playerRef.current = p;

      // Suppress the harmless "No EME detected" warning — content is not DRM-encrypted
      p.updateSettings({
        debug: {
          logLevel: (dashjs as any).Debug?.LOG_LEVEL_WARNING ?? 2,
        },
      });

      // Configure player
      p.initialize(video, manifestUrl, autoplay);

      // Mark player as attached
      isAttachedRef.current = true;

      // Enable adaptive bitrate with optimized buffers to reduce stalls & spinner flicker
      p.updateSettings({
        streaming: {
          abr: {
            autoSwitchBitrate: { video: true },
            // Seed bandwidth estimate so DASH.js starts at highest quality
            // instead of ramping up from lowest on the first segment
            initialBitrate: { video: 5000 },
          },
          buffer: {
            initialBufferLevel: 1.5,
            bufferTimeAtTopQuality: 8,
            bufferTimeAtTopQualityLongForm: 20,
            // Enable fast switch for smoother quality transitions
            fastSwitchEnabled: true,
          },
        },
      });

      // Get quality levels after stream is loaded
      p.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        const reps = p.getRepresentationsByType("video");
        const bitrateList = reps.map((rep: any) => ({
          bitrate: rep.bandwidth,
          height: rep.height,
          width: rep.width,
          index: rep.index,
        }));
        setQualityLevels(bitrateList);

        const currentRep = p.getCurrentRepresentationForType("video");
        setCurrentQuality(currentRep ? currentRep.index : -1);

        // Force normal playback speed after stream is loaded
        video.playbackRate = 1.0;
      });

      p.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (e: any) => {
        if (e.mediaType === "video") {
          const currentRep = p.getCurrentRepresentationForType("video");
          setCurrentQuality(currentRep ? currentRep.index : -1);
        }
      });
    };

    initPlayer();

    return () => {
      // Mark player as detached to prevent event handlers from accessing video
      isAttachedRef.current = false;

      // Detach player from video element before cleanup
      if (player) {
        player.attachSource(null);
        player.reset();
      }

      // Remove event listeners
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("stalled", handleStalled);
      video.removeEventListener("suspend", handleSuspend);
      video.removeEventListener("progress", handleProgress);

      // Clean up timers and animation frame
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (bufferingOnTimer.current) clearTimeout(bufferingOnTimer.current);
      if (bufferingOffTimer.current) clearTimeout(bufferingOffTimer.current);
    };
  }, [manifestUrl, autoplay]);

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      // User explicitly paused
      userPausedRef.current = true;
      videoRef.current.pause();
    } else {
      // User explicitly played
      userPausedRef.current = false;
      setShowPlayOverlay(false);
      videoRef.current.play();
    }
  }, [isPlaying]);

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    handleSeek(time);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (
        !isDragging ||
        !progressBarRef.current ||
        !videoRef.current ||
        !duration
      )
        return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const time = percentage * duration;
      handleSeek(time);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, duration]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const vol = parseFloat(e.target.value);
    videoRef.current.volume = vol;
    setVolume(vol);
    if (vol > 0 && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changeQuality = (qualityIndex: number) => {
    if (!playerRef.current) return;

    if (qualityIndex === -1) {
      // Auto quality
      playerRef.current.updateSettings({
        streaming: {
          abr: {
            autoSwitchBitrate: { video: true },
          },
        },
      });
    } else {
      playerRef.current.updateSettings({
        streaming: {
          abr: {
            autoSwitchBitrate: { video: false },
          },
        },
      });
      playerRef.current.setRepresentationForTypeByIndex("video", qualityIndex);
    }
    setCurrentQuality(qualityIndex);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Map bitrate ranges to resolution labels matching encode targets:
  // 360p → ~500k, 720p → ~1500k, 1080p → ~3000k
  const getQualityLabel = (bitrate: number) => {
    const kbps = bitrate / 1000;
    if (kbps <= 800) return "360p";
    if (kbps <= 2000) return "720p";
    return "1080p";
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden shadow-2xl"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(!isPlaying)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full aspect-video"
        onClick={togglePlayPause}
      />

      {/* Buffering Spinner */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Play/Pause Overlay — only shown on user-initiated pause, not DASH internal events */}
      <div
        className={`absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 transition-opacity duration-200 ${
          showPlayOverlay && !buffering
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={togglePlayPause}
      >
        <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all">
          <svg
            className="w-10 h-10 text-black"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div className="px-4 pt-8 pb-2">
          <div
            ref={progressBarRef}
            className="relative w-full h-1 bg-gray-600 rounded-lg cursor-pointer group"
            onMouseEnter={() => setIsHoveringProgress(true)}
            onMouseLeave={() => setIsHoveringProgress(false)}
            onMouseDown={handleProgressMouseDown}
            onClick={handleProgressClick}
          >
            {/* Buffer portion */}
            <div
              className="absolute top-0 left-0 h-full bg-gray-500 rounded-lg"
              style={{ width: `${(bufferedEnd / duration) * 100}%` }}
            />
            {/* Played portion */}
            <div
              className="absolute top-0 left-0 h-full bg-red-600 rounded-lg"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            {/* Thumb */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full transition-opacity duration-200 ${
                isHoveringProgress || !isPlaying || isDragging
                  ? "opacity-100"
                  : "opacity-0"
              }`}
              style={{
                left: `${(currentTime / duration) * 100}%`,
                transform: "translate(-50%, 0)",
              }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="px-4 pb-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="hover:scale-110 transition-transform"
            >
              {isPlaying ? (
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Volume Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="hover:scale-110 transition-transform"
              >
                {isMuted || volume === 0 ? (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Time */}
            <div className="text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quality Selector */}
            {qualityLevels.length > 0 && (
              <div className="relative group">
                <button className="px-3 py-1 text-sm font-medium bg-white/20 rounded hover:bg-white/30 transition-colors">
                  {currentQuality === -1
                    ? "Auto"
                    : getQualityLabel(qualityLevels[currentQuality]?.bitrate)}
                </button>
                <div className="absolute bottom-full mb-2 right-0 bg-black/95 rounded-lg overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <button
                    onClick={() => changeQuality(-1)}
                    className={`block w-full px-4 py-2 text-sm text-left hover:bg-white/20 whitespace-nowrap ${
                      currentQuality === -1 ? "text-red-500" : ""
                    }`}
                  >
                    Auto
                  </button>
                  {qualityLevels.map((level, index) => (
                    <button
                      key={index}
                      onClick={() => changeQuality(level.index)}
                      className={`block w-full px-4 py-2 text-sm text-left hover:bg-white/20 whitespace-nowrap ${
                        currentQuality === level.index ? "text-red-500" : ""
                      }`}
                    >
                      {getQualityLabel(level.bitrate)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="hover:scale-110 transition-transform"
            >
              {isFullscreen ? (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
