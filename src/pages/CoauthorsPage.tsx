import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownRight } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { BlurReveal } from '../components/ui/blur-reveal';
import BookCard from '../components/coauthors/BookCard';
import BookDetails from '../components/coauthors/BookDetails';
import { useCoauthorBooks } from '../hooks/use-coauthor-books';
import { gsap } from '../lib/gsap';
import type { CoauthorBook } from '../types/coauthor';
import '../styles/coauthors.css';
export default function CoauthorsPage() {
  const { books, loading, error, reload } = useCoauthorBooks();
  const [selected, setSelected] = useState<CoauthorBook | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!grid.current || !books.length) return;
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.coauthor-book', { y: 26, opacity: 0, duration: .55, stagger: .08, ease: 'power2.out', scrollTrigger: { trigger: grid.current, start: 'top 92%', once: true } });
      });
    }, grid);
    return () => context.revert();
  }, [books]);
  return <div className="coauthors-page"><a className="skip-link" href="#projetos-abertos">Pular para os projetos</a><Header />
    <main><section className="coauthor-hero"><div className="section">
      <span className="eyebrow"><i /><BlurReveal as="span">01 / COAUTORIAS</BlurReveal></span>
      <h1><BlurReveal as="span">Histórias que começam com você.</BlurReveal></h1>
      <div className="coauthor-hero-bottom"><p><BlurReveal as="span">Conheça os projetos editoriais da Literare Books com inscrições abertas para coautoria. Encontre uma obra que dialogue com sua experiência e descubra novas possibilidades de publicação.</BlurReveal></p><a href="#projetos-abertos" aria-label="Explorar projetos abertos"><ArrowDownRight size={34} /></a></div>
    </div></section>
    <section id="projetos-abertos" className="section coauthor-projects" aria-labelledby="projects-title" aria-busy={loading}>
      <div className="coauthor-section-top"><h2 id="projects-title"><BlurReveal as="span">Projetos com inscrições abertas</BlurReveal></h2><span className="eyebrow">LITERARE BOOKS</span></div>
      {loading ? <div className="coauthor-skeletons" role="status" aria-label="Carregando projetos">{[0,1,2,3].map(i => <div key={i} />)}</div>
        : error ? <div className="coauthor-state" role="alert"><h3>Vamos tentar mais uma vez?</h3><p>{error}</p><button className="button" onClick={reload}>Tentar novamente</button></div>
        : books.length ? <div className="coauthor-grid" ref={grid}>{books.map(book => <BookCard key={book.id} book={book} open={() => setSelected(book)} />)}</div>
        : <div className="coauthor-state"><span className="coauthor-asterisk" aria-hidden="true">✳</span><h3><BlurReveal as="span">Novas histórias estão a caminho.</BlurReveal></h3><p><BlurReveal as="span">No momento, não há projetos com inscrições abertas. Acompanhe nossas próximas oportunidades de coautoria.</BlurReveal></p></div>}
    </section></main><Footer />{selected && <BookDetails book={selected} close={() => setSelected(null)} />}
  </div>;
}
