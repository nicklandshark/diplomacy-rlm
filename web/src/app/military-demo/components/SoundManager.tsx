"use client";

import { useEffect, useRef } from "react";

type SoundType = "orderSubmitted" | "messageReceived" | "phaseComplete" | "memoryUpdate" | "orderRevealed";

const SOUNDS: Record<SoundType, string> = {
  orderSubmitted: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  messageReceived: "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
  phaseComplete: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  memoryUpdate: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  orderRevealed: "https://assets.mixkit.co/active_storage/sfx/2044/2044-preview.mp3",
};

export function SoundManager() {
  const audioRefs = useRef<Record<SoundType, HTMLAudioElement | null>>({
    orderSubmitted: null,
    messageReceived: null,
    phaseComplete: null,
    memoryUpdate: null,
    orderRevealed: null,
  });

  useEffect(() => {
    // Preload sounds
    (Object.keys(SOUNDS) as SoundType[]).forEach((key) => {
      const audio = new Audio(SOUNDS[key]);
      audio.preload = "auto";
      audio.volume = 0.3;
      audioRefs.current[key] = audio;
    });

    return () => {
      (Object.keys(SOUNDS) as SoundType[]).forEach((key) => {
        audioRefs.current[key]?.pause();
      });
    };
  }, []);

  return null;
}

export const playSound = (type: SoundType) => {
  const audio = new Audio(SOUNDS[type]);
  audio.volume = 0.3;
  audio.play().catch(() => {
    // Ignore errors (e.g., user hasn't interacted yet)
  });
};

export const SoundManagerAPI = {
  play: playSound,
};
