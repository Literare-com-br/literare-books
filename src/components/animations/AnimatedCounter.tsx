import { useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap';
const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
export default function AnimatedCounter({ value, suffix, divisor = 1 }: { value: number; suffix: string; divisor?: number }) {
  const visual = useRef<HTMLSpanElement>(null);
  const played = useRef(false);
  const format = (number: number) => `+${formatter.format(Math.round(number / divisor))}${suffix}`;
  const finalText = format(value);
  useLayoutEffect(() => {
    const element = visual.current!;
    const display = (number: number) => { element.textContent = `+${formatter.format(Math.round(number / divisor))}${suffix}`; };
    let tween: gsap.core.Tween | undefined;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion:no-preference)', () => {
      const trigger = ScrollTrigger.create({ trigger: element, start: 'top 92%', once: true, onEnter: () => {
        if (played.current) return;
        played.current = true;
        const count = { number: 0 };
        display(0);
        tween = gsap.to(count, { number: value, duration: 1.6, ease: 'power2.out', onUpdate: () => display(count.number), onComplete: () => display(value) });
      } });
      return () => { trigger.kill(); tween?.kill(); display(value); };
    });
    return () => { media.revert(); tween?.kill(); };
  }, [value, divisor, suffix]);
  return <span data-text-animation="counter"><span className="sr-only">{finalText}</span><span ref={visual} aria-hidden="true" className="metric-value">{finalText}</span></span>;
}
