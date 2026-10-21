import ResponsiveImage from "../ui/responsive-image";
import { BlurReveal } from "../ui/blur-reveal";
import { ArrowUpRight } from "lucide-react";
import { siteContent } from "../../data/siteContent";
import { Link, useLocation } from 'react-router-dom';
import { institutionalHref } from '../../lib/navigation';
export default function Footer() {
  const { pathname } = useLocation();
  return <footer>
      <div className="footer-top">

        {/* Logotipo e apresentação */}
        <div>
          <a className="logo footer-logo" href={institutionalHref('#inicio', pathname)} aria-label="Literare Books, início">
            <ResponsiveImage src="/images/logofooter.png" alt="Literare Books" className="footer-logo-img" />
          </a>

          <p><BlurReveal as="span">{"Ideias com intenção."}</BlurReveal><br /><BlurReveal as="span">{"Conexões com significado."}</BlurReveal></p>
        </div>

        {/* Navegação */}
        <div>
          <span className="eyebrow"><BlurReveal as="span">{"EXPLORE"}</BlurReveal></span>

          {siteContent.nav.slice(1).map(n => <a href={institutionalHref(n.href, pathname)} key={n.href}>
              <BlurReveal as="span">{n.label}</BlurReveal>
            </a>)}
          <Link to="/coautorias"><BlurReveal as="span">Coautorias</BlurReveal></Link>
          <Link to="/dashboard/coautorias"><BlurReveal as="span">Gerenciar coautorias</BlurReveal></Link>
        </div>

        {/* Contato */}
        <div>
          <span className="eyebrow"><BlurReveal as="span">{"PRÓXIMO PASSO"}</BlurReveal></span>

          <a href={institutionalHref('#contato', pathname)} className="footer-contact"><BlurReveal as="span">{"Conte sua ideia"}</BlurReveal><ArrowUpRight size={22} />
          </a>

          <p><BlurReveal as="span">{"Contatos e redes sociais oficiais"}</BlurReveal><br /><BlurReveal as="span">{"serão adicionados após confirmação."}</BlurReveal></p>
        </div>
      </div>

      {/* Informações legais */}
      <div className="footer-bottom">
        <span><BlurReveal as="span">{`© ${new Date().getFullYear()} Literare. Todos os direitos reservados.`}</BlurReveal></span>

        <span><BlurReveal as="span">{"Estratégia. Criatividade. Movimento."}</BlurReveal></span>

        <a href="#privacidade"><BlurReveal as="span">{"Privacidade"}</BlurReveal></a>
      </div>

      {/* Política de privacidade */}
      <details id="privacidade">
        <summary><BlurReveal as="span">{"Informações de privacidade"}</BlurReveal></summary>

        <p><BlurReveal as="span">{"Os dados enviados pelo formulário são utilizados para responder ao seu contato. O acesso à conta utiliza uma sessão persistida no navegador. As fotografias são ilustrativas."}</BlurReveal></p>
      </details>
    </footer>;
}
