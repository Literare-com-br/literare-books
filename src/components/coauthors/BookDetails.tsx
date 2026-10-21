import ResponsiveImage from '../ui/responsive-image';
import { BlurReveal } from '../ui/blur-reveal';
import EditorialDialog from '../ui/editorial-dialog';
import { coverUrl } from '../../lib/coauthors';
import type { CoauthorBook } from '../../types/coauthor';
export default function BookDetails({ book, close }: { book: CoauthorBook; close: () => void }) {
  return <EditorialDialog titleId="book-detail-title" onClose={close} className="book-details"><div className="book-details-layout">
    <div className="book-details-cover"><ResponsiveImage src={coverUrl(book.cover_path)} publicFallback={book.registration_status==='open'} alt={`Capa de ${book.title}`} width="400" height="580" /></div>
    <div className="book-details-copy"><span className="eyebrow"><BlurReveal as="span">{book.category}</BlurReveal></span>
      <h2 id="book-detail-title"><BlurReveal as="span">{book.title}</BlurReveal></h2>
      <p className="book-coordinator">Coordenador(a) Editorial<br /><strong>{book.editorial_coordinator}</strong></p>
      <h3>Sobre o livro</h3><div className="book-description">{book.description.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
      <span className="coauthor-status"><i />{book.registration_status === 'open' ? 'Inscrições abertas' : 'Inscrições encerradas'}</span>
    </div>
  </div></EditorialDialog>;
}
