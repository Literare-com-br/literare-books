import { BlurReveal } from "./blur-reveal";
import { useEffect, useRef, useState } from "react";
import { useNearViewport } from "../../hooks/use-near-viewport";
export default function PhoneVideo({
  src,
  objectPosition = "50% 50%",
  description
}: {
  src: string;
  objectPosition?: string;
  description: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const available = __LOCAL_VIDEOS__.includes(src);
  const {
    ref,
    near
  } = useNearViewport();
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !available || !near) return;
    let active = true;
    let visible = false;
    video.muted = true;
    const update = () => {
      if (visible && !document.hidden) {
        video.play().catch(() => {
          if (active) setBlocked(true);
        });
      } else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }, {
      // Loading is already anticipated by useNearViewport; playback follows
      // actual visibility below the fixed header when the reader changes section.
      rootMargin: "-78px 0px 0px 0px"
    });
    observer.observe(video);
    document.addEventListener("visibilitychange", update);
    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      video.pause();
    };
  }, [src, available, near]);
  return <div ref={ref} className="phone-media" data-video-state={!available || unavailable ? "missing" : !near ? "deferred" : blocked ? "blocked" : "ready"}>
    {available && !unavailable && <video ref={videoRef} src={near ? src : undefined} autoPlay muted loop playsInline preload={near ? "metadata" : "none"} controls={false} disablePictureInPicture disableRemotePlayback aria-label={description} style={{
      objectPosition
    }} onError={() => setUnavailable(true)} onPlaying={() => setBlocked(false)} />}
    {(!available || unavailable || blocked) && <div className="phone-fallback">
      <span className="phone-brand"><BlurReveal as="span">{"literare"}</BlurReveal><span><BlurReveal as="span">{"books"}</BlurReveal></span></span><span className="phone-star" aria-hidden="true">✳</span>
      <p><BlurReveal as="span">{"Histórias"}</BlurReveal><br /><BlurReveal as="span">{"em movimento."}</BlurReveal></p><span className="phone-caption"><BlurReveal as="span">{blocked ? "Reprodução automática indisponível neste navegador." : "Muito além das páginas."}</BlurReveal></span>
      <span className="phone-media-note"><BlurReveal as="span">{available && !unavailable ? "Literare Books" : "Vídeo em breve"}</BlurReveal></span>
    </div>}
  </div>;
}
