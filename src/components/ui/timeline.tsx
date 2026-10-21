// Built using Hyperiux Vault: https://vault.hyperiux.com
// Adapted to the editorial process supplied by Literare Books.
import { useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import { SplitText } from 'gsap/SplitText';
import { timelineContent } from '../../data/timeline';
import '../../styles/timeline.css';
gsap.registerPlugin(SplitText);

export default function Timeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const section = sectionRef.current!, track = trackRef.current!, viewport = viewportRef.current!;
    const media = gsap.matchMedia();
    media.add({ desktop: '(min-width:768px)', mobile: '(max-width:767px)', reduce: '(prefers-reduced-motion:reduce)' }, context => {
      const desktop = !!context.conditions?.desktop, reduce = !!context.conditions?.reduce;
      section.classList.toggle('is-still', reduce);
      section.dataset.layout = desktop ? 'horizontal' : 'vertical';
      const splits: SplitText[] = [];
      let observer: ResizeObserver | undefined, raf = 0;
      const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
      const measure = () => section.style.setProperty('--timeline-travel', `${desktop && !reduce ? distance() : 0}px`);
      measure();
      let horizontal: gsap.core.Tween | undefined;
      if (desktop && !reduce) {
        ScrollTrigger.addEventListener('refreshInit', measure);
        let width = viewport.clientWidth;
        observer = new ResizeObserver(() => {
          if (viewport.clientWidth === width) return;
          width = viewport.clientWidth;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => ScrollTrigger.refresh());
        });
        observer.observe(viewport);
        horizontal = gsap.fromTo(track, { x: 0 }, { x: () => -distance(), ease: 'none', scrollTrigger: {
          id: 'literare-timeline', trigger: section, start: 'top 78px', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
        } });
      }
      if (!reduce) {
        const start = () => horizontal!.scrollTrigger!.start;
        gsap.fromTo('.journey-line', desktop ? { scaleX: 0 } : { scaleY: 0 }, {
          ...(desktop ? { scaleX: 1 } : { scaleY: 1 }), ease: 'none', transformOrigin: desktop ? 'left center' : 'center top',
          scrollTrigger: desktop ? { trigger: section, start: () => start(), end: () => horizontal!.scrollTrigger!.end, scrub: true, invalidateOnRefresh: true }
            : { trigger: track, start: 'top 75%', end: 'bottom bottom', scrub: true },
        });
        section.querySelectorAll<HTMLElement>('.journey-item').forEach(node => {
          const split = new SplitText(node.querySelector('.journey-title')!, { type: 'lines', mask: 'lines' });
          splits.push(split);
          const reveal = gsap.timeline({ scrollTrigger: desktop
            ? { trigger: section, start: () => start() + Math.max(0, node.offsetLeft - viewport.clientWidth + 160), once: true, invalidateOnRefresh: true }
            : { trigger: node, start: 'top 85%', once: true } });
          reveal.fromTo(node.querySelector('.journey-number'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .4 })
            .fromTo(node.querySelector('.journey-dot'), { scale: 0 }, { scale: 1, duration: .35 }, '<')
            .fromTo(split.lines, { yPercent: 105 }, { yPercent: 0, duration: .55, stagger: .04, ease: 'power2.out' }, .08);
        });
      }
      ScrollTrigger.refresh();
      return () => {
        observer?.disconnect(); cancelAnimationFrame(raf); ScrollTrigger.removeEventListener('refreshInit', measure);
        splits.forEach(split => split.revert()); section.classList.remove('is-still');
      };
    }, section);
    return () => media.revert();
  }, []);
  return <section ref={sectionRef} id="diferenciais" className="journey-section" data-text-animation="splittext" aria-labelledby="editorial-process-title">
    <div className="journey-stage"><div className="journey-heading"><span className="eyebrow journey-label"><i />03 / PROCESSO EDITORIAL</span><h2 id="editorial-process-title">{timelineContent.title}</h2></div>
      <div ref={viewportRef} className="journey-viewport" tabIndex={0} aria-label="Etapas do processo editorial">
        <div ref={trackRef} className="journey-track"><div className="journey-rail" aria-hidden="true"><span className="journey-line" /></div>
          <ol className="journey-list">{timelineContent.items.map((item, index) => <li key={item.id} data-journey={item.id} className="journey-item"><span className="journey-dot" aria-hidden="true" /><div className="journey-copy"><span className="journey-number">{String(index + 1).padStart(2, '0')}</span><h3 className="journey-title">{item.title}</h3></div></li>)}</ol>
        </div>
      </div>
    </div>
  </section>;
}
