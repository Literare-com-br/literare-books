import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { gsap } from '../../lib/gsap';
export default function EditorialDialog({ titleId, children, onClose, className = '', dismissible = true }: { titleId: string; children: ReactNode; onClose: () => void; className?: string; dismissible?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const dismiss = useCallback(() => {
    if (closing.current || !dismissible) return;
    closing.current = true;
    setLeaving(true);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { onClose(); return; }
    gsap.to(ref.current, { opacity: 0, y: 12, duration: .18, onComplete: onClose });
  }, [onClose, dismissible]);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    const animation = matchMedia('(prefers-reduced-motion: reduce)').matches ? null : gsap.fromTo(dialog, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .28, ease: 'power2.out' });
    return () => { animation?.kill(); gsap.killTweensOf(dialog); dialog.close(); document.body.style.overflow = oldOverflow; previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`editorial-dialog ${className} ${leaving ? 'is-leaving' : ''}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); dismiss(); }} onClick={event => { if (event.target === event.currentTarget) {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
    } }}>
    <button type="button" className="dialog-close" aria-label="Fechar detalhes" onClick={dismiss}><X size={22} /></button>
    {children}
  </dialog>;
}
