'use client'

import { useState, useRef, useEffect } from 'react'
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon as VolumeUpIcon,
  SpeakerXMarkIcon as VolumeOffIcon,
  ForwardIcon,
  BackwardIcon
} from '@heroicons/react/24/outline'

interface AudioPlayerProps {
  src: string
  title?: string
  artist?: string
  cover?: string
  autoPlay?: boolean
  loop?: boolean
  className?: string
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

export default function AudioPlayer({
  src,
  title = 'Unknown Title',
  artist = 'Unknown Artist',
  cover,
  autoPlay = false,
  loop = false,
  className = '',
  onPlay,
  onPause,
  onEnded
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }
    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
    }
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [onPlay, onPause, onEnded])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = parseFloat(e.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = parseFloat(e.target.value)
    audio.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  const skipForward = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.min(audio.currentTime + 10, duration)
  }

  const skipBackward = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.max(audio.currentTime - 10, 0)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 p-4 ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        autoPlay={autoPlay}
        loop={loop}
        className="hidden"
      />

      <div className="flex items-center space-x-4">
        {/* Cover Art */}
        <div className="flex-shrink-0">
          {cover ? (
            <img
              src={cover}
              alt={title}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-secondary-200 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎵</span>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-secondary-900 truncate">
            {title}
          </h3>
          <p className="text-sm text-secondary-500 truncate">
            {artist}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={skipBackward}
            className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
          >
            <BackwardIcon className="h-5 w-5 text-secondary-600" />
          </button>

          <button
            onClick={togglePlay}
            className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors"
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={skipForward}
            className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
          >
            <ForwardIcon className="h-5 w-5 text-secondary-600" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
          >
            {isMuted ? (
              <VolumeOffIcon className="h-5 w-5 text-secondary-600" />
            ) : (
              <VolumeUpIcon className="h-5 w-5 text-secondary-600" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-secondary-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-secondary-500 mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-secondary-200 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
    </div>
  )
}
