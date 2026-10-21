import ResponsiveImage from "../components/ui/responsive-image";
import { BlurReveal } from "../components/ui/blur-reveal";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ArrowUpRight } from "lucide-react";
import { usePublishedContent } from '../components/PublishedContent';
import { SectionHeading } from "../components/ui";
import { submitContact, contactSchema, type ContactData } from "../lib/contact";
import { CONTACT_AREAS } from '../data/contact-areas';
import ContactChallenge from '../components/ui/contact-challenge';

export default function ContactSection() {
  const content = usePublishedContent('contact'), banner = usePublishedContent('banner');
  const pending = useRef(false);
  const [status, setStatus] = useState("");
  const [token,setToken]=useState(''),[challengeVersion,setChallengeVersion]=useState(0);
  const honeypot=useRef<HTMLInputElement>(null);
  const {
    register,
    reset,
    watch,
    handleSubmit,
    formState: {
      errors,
      isSubmitting
    }
  } = useForm<ContactData>({
    resolver: zodResolver(contactSchema), defaultValues:{area_of_activity_other:''}
  });
  return <section id="contato" className="section contact"><div><SectionHeading label="06 / VAMOS CONVERSAR" title={content.title} description={content.body} /><form noValidate onSubmit={handleSubmit(async data => {
        if (pending.current) return;
        pending.current = true;
        setStatus('');
        try {
          const result = await submitContact(data, token, honeypot.current?.value);
          setStatus(result.message);
          if (result.sent) reset();
        } finally { pending.current = false; setToken('');setChallengeVersion(v=>v+1); }
      })}><div className="form-grid">{(["name", "email", "phone"] as const).map((key, i) => <div className="field" key={key}><label htmlFor={key}><BlurReveal as="span">{["Nome completo", "E-mail", "Telefone"][i]}</BlurReveal></label><input id={key} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} autoComplete={["name", "email", "tel"][i]} placeholder={["Como podemos chamar você?", "voce@empresa.com.br", "(00) 00000-0000"][i]} {...register(key)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} />{errors[key] && <span id={`${key}-error`} className="field-error"><BlurReveal as="span">{errors[key]?.message ?? ""}</BlurReveal></span>}</div>)}<div className="field"><label htmlFor="area_of_activity"><BlurReveal as="span">Área de atuação</BlurReveal></label><select aria-label="Área de atuação" id="area_of_activity" {...register("area_of_activity")} aria-invalid={!!errors.area_of_activity} aria-describedby={errors.area_of_activity ? "area-error" : undefined}><option value="">Selecione sua área</option>{CONTACT_AREAS.map(area=><option key={area} value={area}>{area}</option>)}</select>{errors.area_of_activity && <span id="area-error" className="field-error"><BlurReveal as="span">{errors.area_of_activity.message ?? ""}</BlurReveal></span>}</div>{watch("area_of_activity")==="Outros" && <div className="field full"><label htmlFor="area_of_activity_other"><BlurReveal as="span">Qual é sua área de atuação?</BlurReveal></label><input aria-label="Qual é sua área de atuação?" id="area_of_activity_other" maxLength={100} {...register("area_of_activity_other")} aria-invalid={!!errors.area_of_activity_other} aria-describedby="area-other-error" />{errors.area_of_activity_other && <span id="area-other-error" className="field-error"><BlurReveal as="span">{errors.area_of_activity_other.message ?? ""}</BlurReveal></span>}</div>}<div className="field full"><label htmlFor="message"><BlurReveal as="span">{"Sua mensagem"}</BlurReveal></label><textarea id="message" rows={3} placeholder="Conte um pouco sobre sua ideia…" {...register("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} />{errors.message && <span id="message-error" className="field-error"><BlurReveal as="span">{errors.message.message ?? ""}</BlurReveal></span>}</div></div><div className="contact-honeypot" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" ref={honeypot} tabIndex={-1} autoComplete="off" /></div><ContactChallenge key={challengeVersion} onToken={setToken} /><p className="form-note"><BlurReveal as="span">{"Seus dados serão utilizados para responder ao seu contato."}</BlurReveal></p><button className="button" disabled={isSubmitting} type="submit"><BlurReveal as="span">{isSubmitting ? "Enviando…" : "Enviar Mensagem"}</BlurReveal><ArrowUpRight size={17} /></button>{status && <p className="form-status" role="status"><BlurReveal as="span">{status}</BlurReveal></p>}</form></div><div className="contact-photo"><ResponsiveImage src={banner.image_url} alt="Mesa de reunião em um ambiente profissional" loading="lazy" /><div><span className="eyebrow"><BlurReveal as="span">{"UM ESPAÇO PARA NOVAS POSSIBILIDADES"}</BlurReveal></span><p><BlurReveal as="span">{banner.title}</BlurReveal><br /><BlurReveal as="span">{banner.body}</BlurReveal></p><span className="circle-arrow"><ArrowUpRight /></span></div></div></section>;
}



