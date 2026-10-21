import { BlurReveal } from "../ui/blur-reveal";
import { useEffect, useRef } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { mainNavigation } from "../../data/siteContent";
import { Link, useLocation } from 'react-router-dom';
import { institutionalHref } from '../../lib/navigation';
export default function MobileMenu({
  close
}: {
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);
  return <dialog className="mobile-menu" ref={ref} onCancel={close} aria-label="Menu principal"><div className="menu-top"><strong><BlurReveal as="span">{"literare"}</BlurReveal><span><BlurReveal as="span">{"®"}</BlurReveal></span></strong><button aria-label="Fechar menu" onClick={close}><X /></button></div><nav>{mainNavigation.map((item, i) => <a key={item.href} href={institutionalHref(item.href, pathname)} onClick={close}><small><BlurReveal as="span">{`0${i + 1}`}</BlurReveal></small><BlurReveal as="span">{item.label}</BlurReveal><ArrowUpRight /></a>)}<Link to="/coautorias" onClick={close}><small>{String(mainNavigation.length + 1).padStart(2, '0')}</small><BlurReveal as="span">Coautorias</BlurReveal><ArrowUpRight /></Link><Link to="/login" onClick={close}><small>{String(mainNavigation.length + 2).padStart(2, '0')}</small><BlurReveal as="span">Login</BlurReveal><ArrowUpRight /></Link></nav><p><BlurReveal as="span">{"Ideias que movem o próximo."}</BlurReveal></p></dialog>;
}
