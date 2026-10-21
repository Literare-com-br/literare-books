import ResponsiveImage from '../components/ui/responsive-image';
import { BlurReveal } from "../components/ui/blur-reveal";
import { useState } from 'react';
import { aboutCards } from '../data/about';
import { CircleArrow } from "../components/ui";
import '../styles/about.css';
import { usePublishedContent } from '../components/PublishedContent';

function AboutImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const available = (__ABOUT_IMAGES__.includes(src) || src.startsWith('https://')) && !failed;
  return <div className="about-media" data-image-path={src} data-image-state={available ? 'available' : 'missing'} aria-hidden={!available}>
    {available && <ResponsiveImage src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />}
  </div>;
}
export default function AboutSection() {
  const intro = usePublishedContent('about_intro');
  const first = usePublishedContent('about_1'), second = usePublishedContent('about_2'), third = usePublishedContent('about_3');
  const cards = aboutCards.map((card,index) => { const content = [first,second,third][index]; return {...card,title:content.title,text:content.body,image:content.image_url}; });
  return <section id="sobre" className="section about"><div className="section-intro"><span className="eyebrow"><i /><BlurReveal as="span">01 / SOBRE A LITERARE</BlurReveal></span><p><BlurReveal as="span">{intro.title}</BlurReveal><br /><BlurReveal as="span">{intro.body}</BlurReveal></p></div>
    <div className="bento">{cards.map((card, index) => <a href={card.href} key={card.image} className={`about-card reveal${index === 1 ? ' yellow' : ''}`}>
      <div className="about-copy"><span className="eyebrow"><BlurReveal as="span">{card.label}</BlurReveal></span><h2><BlurReveal as="span">{card.title}</BlurReveal></h2><p><BlurReveal as="span">{card.text}</BlurReveal></p></div>
      <AboutImage src={card.image} alt={`Literare Books — ${card.title}`} /><CircleArrow />
    </a>)}</div>
  </section>;
}
