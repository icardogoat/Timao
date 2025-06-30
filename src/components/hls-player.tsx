
'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

const HlsPlayer: React.FC<HlsPlayerProps> = ({ src, ...props }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let hls: Hls | undefined;

    if (videoRef.current) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.error("Autoplay was prevented.", e));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (e.g., Safari)
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.error("Autoplay was prevented.", e));
        });
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return <video ref={videoRef} {...props} />;
};

export default HlsPlayer;
