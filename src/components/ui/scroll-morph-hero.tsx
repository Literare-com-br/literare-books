import ResponsiveImage from "./responsive-image";
import { BlurReveal } from "./blur-reveal";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, animate, type MotionValue } from "framer-motion";
import type { BookCover } from "../../data/book-covers";
import "../../styles/scroll-morph-hero.css";
export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";
type Position = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
};
type Size = {
  width: number;
  height: number;
};
export interface ScrollMorphHeroProps {
  images: (string | BookCover)[];
  title?: string;
  description?: string;
  className?: string;
}
const IMG_WIDTH = 60;
const IMG_HEIGHT = 85;
const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000;
const HEADER_OFFSET = 78;
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
function targetFor(i: number, phase: AnimationPhase, containerSize: Size, scatterPositions: Position[], morphValue: number, rotateValue: number, parallaxValue: number, still: boolean): Position {
  const isMobile = containerSize.width < 768;
  const circleRadius = Math.min(Math.min(containerSize.width, containerSize.height) * .35, 350);
  const circleScale = isMobile ? Math.min(.85, Math.max(.35, 2 * Math.PI * circleRadius / (TOTAL_IMAGES * 70))) : 1;
  if (phase === "scatter") return scatterPositions[i];
  if (phase === "line") {
    const lineSpacing = isMobile ? Math.min(70, (containerSize.width - IMG_WIDTH) / TOTAL_IMAGES) : 70;
    const lineTotalWidth = TOTAL_IMAGES * lineSpacing;
    const lineX = i * lineSpacing - lineTotalWidth / 2;
    return {
      x: lineX,
      y: 0,
      rotation: 0,
      scale: circleScale,
      opacity: 1
    };
  }
  const circleAngle = i / TOTAL_IMAGES * 360;
  const circleRad = circleAngle * Math.PI / 180;
  const circlePos = {
    x: Math.cos(circleRad) * circleRadius,
    y: Math.sin(circleRad) * circleRadius,
    rotation: circleAngle + 90
  };
  const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
  const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);
  const arcApexY = containerSize.height * (isMobile ? 0.10 : 0.05);
  const arcCenterY = arcApexY + arcRadius;
  const spreadAngle = isMobile ? 100 : 130;
  const startAngle = -90 - spreadAngle / 2;
  const step = spreadAngle / (TOTAL_IMAGES - 1);
  const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);
  const maxRotation = spreadAngle * 0.8;
  const boundedRotation = -scrollProgress * maxRotation;
  const currentArcAngle = startAngle + i * step + boundedRotation;
  const arcRad = currentArcAngle * Math.PI / 180;
  const arcPos = {
    x: Math.cos(arcRad) * arcRadius + parallaxValue,
    y: Math.sin(arcRad) * arcRadius + arcCenterY,
    rotation: currentArcAngle + 90,
    scale: isMobile ? 1.4 : 1.8
  };
  const amount = still ? 0 : morphValue;
  return {
    x: lerp(circlePos.x, arcPos.x, amount),
    y: lerp(circlePos.y, arcPos.y, amount),
    rotation: lerp(circlePos.rotation, arcPos.rotation, amount),
    scale: lerp(circleScale, arcPos.scale, amount),
    opacity: 1
  };
}
function FlipCard({
  book,
  index,
  phase,
  containerSize,
  scatterPositions,
  smoothMorph,
  smoothScrollRotate,
  smoothMouseX,
  still
}: {
  book: BookCover | null;
  index: number;
  phase: AnimationPhase;
  containerSize: Size;
  scatterPositions: Position[];
  smoothMorph: MotionValue<number>;
  smoothScrollRotate: MotionValue<number>;
  smoothMouseX: MotionValue<number>;
  still: boolean;
}) {
  const position = useTransform(() => targetFor(index, phase, containerSize, scatterPositions, smoothMorph.get(), smoothScrollRotate.get(), smoothMouseX.get(), still));
  const x = useSpring(useTransform(position, p => p.x), {
    stiffness: 40,
    damping: 15
  });
  const y = useSpring(useTransform(position, p => p.y), {
    stiffness: 40,
    damping: 15
  });
  const rotate = useSpring(useTransform(position, p => p.rotation), {
    stiffness: 40,
    damping: 15
  });
  const scale = useSpring(useTransform(position, p => p.scale), {
    stiffness: 40,
    damping: 15
  });
  const opacity = useSpring(useTransform(position, p => p.opacity), {
    stiffness: 40,
    damping: 15
  });
  const staticTarget = targetFor(index, phase, containerSize, scatterPositions, 0, 0, 0, true);
  return <motion.div className="morph-card" data-card-index={index} data-intro-phase={phase} initial="rest" animate="rest" whileHover={still?undefined:'flipped'} whileFocus={still?undefined:'flipped'} style={{
    position: "absolute",
    width: IMG_WIDTH,
    height: IMG_HEIGHT,
    transformStyle: "preserve-3d",
    perspective: "1000px",
    x: still ? staticTarget.x : x,
    y: still ? staticTarget.y : y,
    rotate: still ? staticTarget.rotation : rotate,
    scale: still ? staticTarget.scale : scale,
    opacity: still ? 1 : opacity
  }}>
    <motion.a className="book-flip" href={book?.href ?? "https://loja.literarebooks.com.br/catalogo"} target="_blank" rel="noreferrer" aria-label={book ? `Conhecer o livro ${book.title} (abre em nova aba)` : `Espaço ${index + 1}: capa a definir`} style={{
      transformStyle: "preserve-3d"
    }} variants={{rest:{rotateY:0},flipped:{rotateY:180}}} transition={still ? {
      duration: 0
    } : {
      duration: 0.6,
      type: "spring",
      stiffness: 260,
      damping: 20
    }}>
      <span className="book-front">
        {book ? <ResponsiveImage src={book.src} alt={`Capa de ${book.title}`} loading="lazy" decoding="async" draggable={false} /> : <span className="book-pending"><BlurReveal as="span">{"Capa a definir"}</BlurReveal></span>}
        <span className="book-shade" aria-hidden="true" />
      </span>
      <span className="book-back" aria-hidden="true"><span><BlurReveal as="span">{"CONHECER"}</BlurReveal></span><span><BlurReveal as="span">{"A obra ↗"}</BlurReveal></span></span>
    </motion.a>
  </motion.div>;
}
export default function ScrollMorphHero({
  images,
  title = "Cada livro, uma nova perspectiva.",
  description = "Transformamos conhecimento e experiências em histórias que conectam pessoas.",
  className = ""
}: ScrollMorphHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const entered = useInView(containerRef, {
    amount: 0.55,
    once: true
  });
  const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0
  });
  const still = !!reducedMotion;
  const phase = still ? "circle" : introPhase;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setContainerSize({
      width: entry.contentRect.width,
      height: entry.contentRect.height
    }));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Original 500/2500 ms entrance, started when this section becomes visible.
  // StrictMode's first effect is cleaned up before scheduling the live timers.
  useEffect(() => {
    if (!entered || still) return;
    const timer1 = setTimeout(() => setIntroPhase("line"), 500);
    const timer2 = setTimeout(() => setIntroPhase("circle"), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [entered, still]);

  // Only the original virtual input is replaced: 3000 real page pixels, no wheel
  // or touch cancellation. The geometry and both scroll spring mappings stay intact.
  const {
    scrollYProgress
  } = useScroll({
    target: sectionRef,
    offset: [`start ${HEADER_OFFSET}px`, "end end"]
  });
  const pageScroll = useTransform(scrollYProgress, [0, 1], [0, MAX_SCROLL]);
  const virtualScroll = useMotionValue(0);
  useMotionValueEvent(pageScroll, "change", value => {
    if (phase === "circle" && !still) virtualScroll.set(value);
  });
  useEffect(() => {
    virtualScroll.set(phase === "circle" && !still ? pageScroll.get() : 0);
  }, [phase, still, virtualScroll, pageScroll]);
  const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
  const smoothMorph = useSpring(morphProgress, {
    stiffness: 40,
    damping: 20
  });
  const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
  const smoothScrollRotate = useSpring(scrollRotate, {
    stiffness: 40,
    damping: 20
  });
  const mouseX = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, {
    stiffness: 30,
    damping: 20
  });
  const closingRef = useRef<HTMLDivElement>(null);
  useMotionValueEvent(smoothMorph, "change", value => {
    if (sectionRef.current) sectionRef.current.dataset.morph = value.toFixed(4);
    closingRef.current?.setAttribute("aria-hidden", String(value < .8));
  });
  useMotionValueEvent(smoothScrollRotate, "change", value => {
    if (sectionRef.current) sectionRef.current.dataset.rotation = value.toFixed(3);
  });
  useMotionValueEvent(smoothMouseX, "change", value => {
    if (sectionRef.current) sectionRef.current.dataset.parallax = value.toFixed(3);
  });
  const entrance = useMotionValue(still ? 1 : 0);
  useEffect(() => {
    const control = animate(entrance, phase === "circle" ? 1 : 0, {
      duration: still ? 0 : 1
    });
    return () => control.stop();
  }, [phase, still, entrance]);
  const openingOpacity = useTransform(() => entrance.get() * Math.max(0, 1 - smoothMorph.get() * 2));
  const openingY = useTransform(entrance, [0, 1], [20, 0]);
  const openingFilter = useTransform(entrance, [0, 1], ["blur(10px)", "blur(0px)"]);
  const hintOpacity = useTransform(() => Math.max(0, .5 * entrance.get() - smoothMorph.get()));
  const scatterPositions = useMemo(() => Array.from({
    length: TOTAL_IMAGES
  }, () => ({
    x: (Math.random() - 0.5) * 1500,
    y: (Math.random() - 0.5) * 1000,
    rotation: (Math.random() - 0.5) * 180,
    scale: 0.6,
    opacity: 0
  })), []);
  // Keep all twenty slots even when an image has not been supplied; never repeat
  // a cover or present an invented title as a real publication.
  const books = Array.from({
    length: TOTAL_IMAGES
  }, (_, index): BookCover | null => {
    const image = images[index];
    return typeof image === "string" ? {
      src: image,
      title: `Livro ${index + 1}`,
      source: image,
      href: "https://loja.literarebooks.com.br/catalogo"
    } : image ?? null;
  });
  const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
  const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);
  const minDimension = Math.min(containerSize.width, containerSize.height);
  const circleRadius = Math.min(minDimension * 0.35, 350);
  // Base frame remains 60×85. Scale only on small screens so all 20 books still
  // form the same complete ring, with readable type in its center.

  return <div ref={sectionRef} className={`scroll-morph ${still ? "is-still" : ""} ${className}`} data-phase={phase} data-morph="0" data-rotation="0" data-parallax="0" aria-label="Coleção de livros Literare Books">
    <div ref={containerRef} className="morph-stage" onPointerMove={event => {
      if (still || containerSize.width < 1024 || event.pointerType !== "mouse") return;
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const normalizedX = relativeX / rect.width * 2 - 1;
      mouseX.set(normalizedX * 100);
    }}>
      <span className="eyebrow morph-label"><i /><BlurReveal as="span">{"02 / O QUE FAZEMOS"}</BlurReveal></span>
      <div className="morph-opening" style={{
        maxWidth: Math.max(150, circleRadius * 1.55)
      }}>
        <motion.h2 style={{
          opacity: still ? 1 : openingOpacity,
          y: still ? 0 : openingY,
          filter: still ? "none" : openingFilter
        }}><BlurReveal as="span">{"Histórias que merecem ganhar o mundo."}</BlurReveal></motion.h2>
        <motion.p style={{
          opacity: still ? .5 : hintOpacity
        }}><BlurReveal as="span">{"ROLE PARA EXPLORAR"}</BlurReveal></motion.p>
      </div>
      {!still && <motion.div ref={closingRef} className="morph-closing" style={{
        opacity: contentOpacity,
        y: contentY
      }} aria-hidden="true">
        <h2><BlurReveal as="span">{title}</BlurReveal></h2><p><BlurReveal as="span">{description}</BlurReveal></p>
      </motion.div>}
      <div className="morph-collection">
        {books.map((book, i) => <FlipCard key={i} book={book} index={i} phase={phase} containerSize={containerSize} scatterPositions={scatterPositions} smoothMorph={smoothMorph} smoothScrollRotate={smoothScrollRotate} smoothMouseX={smoothMouseX} still={still} />)}
      </div>
    </div>
  </div>;
}
