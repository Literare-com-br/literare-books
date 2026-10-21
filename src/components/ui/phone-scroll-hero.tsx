import { BlurReveal } from "./blur-reveal";
import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
export interface PhoneScrollHeroProps {
  titleComponent: ReactNode;
  children?: ReactNode;
  overlap?: number;
  tilt?: number;
  className?: string;
}
function PhoneFrame({
  children
}: {
  children?: ReactNode;
}) {
  return <div className="phone-frame" data-phone-frame>
    <span className="phone-side phone-mute" aria-hidden="true" />
    <span className="phone-side phone-volume" aria-hidden="true" />
    <span className="phone-side phone-power" aria-hidden="true" />
    <div className="phone-shell"><div className="phone-screen">
      <span className="phone-island" aria-hidden="true"><i /></span>
      {children ?? <div className="phone-fallback"><BlurReveal as="span">{"Literare Books"}</BlurReveal></div>}
    </div></div>
  </div>;
}
export function PhoneScrollHero({
  titleComponent,
  children,
  overlap = 20,
  tilt = 22,
  className = ''
}: PhoneScrollHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const {
    scrollYProgress
  } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end']
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 85,
    damping: 28
  });
  const rotateX = useTransform(progress, [0, 1], [tilt, 0]);
  const scale = useTransform(progress, [0, 1], [0.94, 1]);
  const titleY = useTransform(progress, [0, 1], [0, -24]);
  const phoneY = useTransform(progress, [0, 1], ['0%', `-${overlap}%`]);
  return <div ref={sectionRef} className={`phone-scroll ${reducedMotion ? 'is-still' : ''} ${className}`} aria-label="Histórias em movimento">
    <div className="phone-stage"><div className="phone-composition">
      <motion.div className="phone-title" style={{
          y: reducedMotion ? 0 : titleY
        }}>{titleComponent}</motion.div>
      <motion.div className="phone-device" data-phone-device style={{
          y: reducedMotion ? 0 : phoneY,
          rotateX: reducedMotion ? 0 : rotateX,
          scale: reducedMotion ? 1 : scale
        }}>
        <PhoneFrame>{children}</PhoneFrame>
      </motion.div>
    </div></div>
  </div>;
}
export default PhoneScrollHero;
