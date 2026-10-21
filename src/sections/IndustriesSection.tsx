import { BlurReveal } from "../components/ui/blur-reveal";
import { useLayoutEffect, useRef } from "react";
import { usePublishedContent } from '../components/PublishedContent';
import { SectionHeading } from "../components/ui";
import { gsap } from '../lib/gsap';
import '../styles/editorial-categories.css';
export default function IndustriesSection() {
  const content = usePublishedContent('categories');
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion:no-preference)', () => {
      root.current?.querySelectorAll('.editorial-category').forEach(row => {
        gsap.from(row, { opacity: 0, y: 16, duration: .5, ease: 'power2.out', scrollTrigger: { trigger: row, start: 'top 93%', once: true } });
      });
    }, root);
    return () => media.revert();
  }, []);
  return <section id="universos" ref={root} className="section industries" aria-label="Universos editoriais">
    <div><SectionHeading label="04 / UNIVERSOS EDITORIAIS" title={content.title} description={content.body} /></div>
    <ol className="editorial-categories" aria-label="Categorias de livros">{content.items.map((category, index) => <li className="editorial-category" key={`${category}:${index}`}><span className="category-number"><BlurReveal as="span">{String(index + 1).padStart(2, '0')}</BlurReveal></span><h3><BlurReveal as="span">{category}</BlurReveal></h3></li>)}</ol>
  </section>;
}
