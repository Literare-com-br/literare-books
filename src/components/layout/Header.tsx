import ResponsiveImage from "../ui/responsive-image";
import { BlurReveal } from "../ui/blur-reveal";
import { useEffect, useState } from 'react';
import { Menu, ArrowUpRight } from 'lucide-react';
import { mainNavigation } from '../../data/siteContent';
import MobileMenu from './MobileMenu';
import { Link, useLocation } from 'react-router-dom';
import { institutionalHref } from '../../lib/navigation';
export default function Header() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 60);
    update();
    window.addEventListener('scroll', update, {
      passive: true
    });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <>
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        {/* Logotipo oficial */}
        <a className="logo" href={institutionalHref('#inicio', pathname)} aria-label="Literare, início">
          <ResponsiveImage src="/images/logoliterare.png" alt="Literare Books" className="header-logo" />
        </a>

        {/* Navegação */}
        <nav aria-label="Navegação principal">
          {mainNavigation.filter(n => n.href !== '#contato').map(n => <a href={institutionalHref(n.href, pathname)} key={n.href}>
              <BlurReveal as="span">{n.label}</BlurReveal>
            </a>)}
          <Link to="/coautorias" aria-current={pathname === '/coautorias' ? 'page' : undefined}><BlurReveal as="span">Coautorias</BlurReveal></Link>
        </nav>

        <Link className="header-login" to="/login"><BlurReveal as="span">Login</BlurReveal></Link>
        {/* Botão de contato */}
        <a className="header-cta" href={institutionalHref('#contato', pathname)}><BlurReveal as="span">{"Vamos conversar"}</BlurReveal><ArrowUpRight size={16} />
        </a>

        {/* Menu mobile */}
        <button className="menu-toggle" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu />
        </button>
      </header>

      {open && <MobileMenu close={() => setOpen(false)} />}
    </>;
}
