import ResponsiveImage from '../ui/responsive-image';
import { ArrowUpRight } from 'lucide-react';
import { BlurReveal } from '../ui/blur-reveal';
import { coverUrl } from '../../lib/coauthors';
import type { CoauthorBook } from '../../types/coauthor';
export default function BookCard({ book, open }: { book: CoauthorBook; open: () => void }) {
  return <article className="coauthor-book"><button className="coauthor-book-button" onClick={open} aria-label={`Ver detalhes de ${book.title}`}>
    <div className="coauthor-cover"><ResponsiveImage src={coverUrl(book.cover_path)} publicFallback={book.registration_status==='open'} alt={`Capa de ${book.title}`} loading="lazy" width="360" height="520" /><span className="coauthor-cover-arrow" aria-hidden="true"><ArrowUpRight size={20} /></span></div>
    <span className="eyebrow"><BlurReveal as="span">{book.category}</BlurReveal></span>
    <h3><BlurReveal as="span">{book.title}</BlurReveal></h3>
    <span className="coauthor-status"><i /><BlurReveal as="span">Inscrições abertas</BlurReveal></span>
  </button></article>;
}
