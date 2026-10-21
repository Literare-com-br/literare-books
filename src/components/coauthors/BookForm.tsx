import ResponsiveImage from '../ui/responsive-image';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '../../lib/validation';
import { coverUrl, saveBook, validateCover } from '../../lib/coauthors';
import type { BookInput, CoauthorBook } from '../../types/coauthor';
const schema = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(180, 'Use até 180 caracteres.'),
  description: z.string().trim().min(1, 'Descreva a obra.').max(12000, 'Use até 12.000 caracteres.'),
  category: z.string().trim().min(1, 'Informe a categoria.').max(100, 'Use até 100 caracteres.'),
  editorial_coordinator: z.string().trim().min(1, 'Informe o coordenador editorial.').max(180, 'Use até 180 caracteres.'),
  registration_status: z.enum(['open', 'closed']),
});
export default function BookForm({ book, saved, cancel }: { book: CoauthorBook | null; saved: (warning: string) => void; cancel: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BookInput>({ resolver: zodResolver(schema), defaultValues: book ?? { title: '', description: '', category: '', editorial_coordinator: '', registration_status: 'closed' } });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [preview, setPreview] = useState('');
  const [validating, setValidating] = useState(false);
  const pending = useRef(false);
  const choice = useRef(0);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <section className="book-editor" aria-labelledby="book-editor-title"><div className="admin-section-heading"><h2 id="book-editor-title">{book ? 'Editar projeto' : 'Novo projeto'}</h2><button className="admin-text-button" onClick={cancel} disabled={isSubmitting}>Cancelar</button></div>
    <form noValidate aria-busy={isSubmitting} onSubmit={handleSubmit(async input => {
      if (pending.current || validating) return;
      if (fileError) return;
      if (input.registration_status === 'open' && !file && !book?.cover_path) { setError('Adicione uma capa para publicar o projeto.'); return; }
      pending.current = true; setError('');
      try { const result = await saveBook(input, file, book); saved(result.warning); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar o projeto.'); }
      finally { pending.current = false; }
    })}>
      <fieldset disabled={isSubmitting || validating}><div className="book-editor-grid"><div className="book-editor-fields">
        {(['title', 'category', 'editorial_coordinator'] as const).map((field, i) => <div className="admin-field" key={field}><label htmlFor={`book-${field}`}>{['Título do livro', 'Categoria', 'Coordenador(a) Editorial'][i]}</label><input id={`book-${field}`} {...register(field)} maxLength={field === 'category' ? 100 : 180} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${field}-error` : undefined} />{errors[field] && <p className="admin-error" id={`${field}-error`}>{errors[field]?.message}</p>}</div>)}
        <div className="admin-field"><label htmlFor="book-description">Sobre o livro</label><textarea id="book-description" rows={8} {...register('description')} maxLength={12000} aria-invalid={!!errors.description} aria-describedby={errors.description ? 'description-error' : undefined} /><p className="admin-hint">Separe os parágrafos com uma linha em branco.</p>{errors.description && <p className="admin-error" id="description-error">{errors.description.message}</p>}</div>
        <div className="admin-field"><label htmlFor="book-status">Status das inscrições</label><select id="book-status" {...register('registration_status')}><option value="closed">Inscrições encerradas</option><option value="open">Inscrições abertas</option></select></div>
      </div><div className="book-editor-upload"><div className="admin-field"><label htmlFor="book-cover">Capa do livro</label><input id="book-cover" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="cover-help cover-error" aria-invalid={!!fileError} onChange={async event => {
        const input = event.currentTarget;
        const selected = input.files?.[0];
        const current = ++choice.current;
        setFileError(''); setFile(null); setPreview('');
        if (!selected) return;
        setValidating(true);
        try {
          validateCover(selected);
          const bitmap = await createImageBitmap(selected); bitmap.close();
          if (current === choice.current) setFile(selected);
        } catch (failure) {
          if (current === choice.current) { input.value = ''; setFileError(failure instanceof Error && failure.message.startsWith('Escolha') || failure instanceof Error && failure.message.startsWith('A capa') ? failure.message : 'Não foi possível ler esta imagem. Escolha outro arquivo.'); }
        } finally { if (current === choice.current) setValidating(false); }
      }} /><p id="cover-help" className="admin-hint">JPG, PNG ou WebP, até 5 MB. Obrigatória para inscrições abertas.</p><p id="cover-error" className="admin-error" role={fileError ? 'alert' : undefined}>{fileError}</p></div>
      {(preview || book?.cover_path) && <ResponsiveImage className="admin-cover-preview" src={preview || coverUrl(book?.cover_path ?? null)} alt="Pré-visualização da capa" />}
      </div></div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-form-actions"><button className="button dark" type="submit">{isSubmitting ? 'Salvando…' : 'Salvar projeto'}</button><button className="admin-text-button" type="button" onClick={cancel}>Cancelar</button></div>
      </fieldset>
    </form>
  </section>;
}

