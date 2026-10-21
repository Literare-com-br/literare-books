import { lazy } from "react";
import { phoneMedia } from "../data/phone-media";
import { SectionHeading } from "../components/ui";
import DeferredContent from "../components/ui/deferred-content";
const PhoneScrollHero = lazy(() => import("../components/ui/phone-scroll-hero"));
import PhoneVideo from "../components/ui/phone-video";
export default function ProjectsSection() {
  return <section id="projetos" className="projects-editorial">
    <DeferredContent fallback={<div className="phone-placeholder" />}><PhoneScrollHero titleComponent={<SectionHeading label="05 / IDEIAS EM MOVIMENTO" title="Histórias que ganham novas formas." description="Muito além das páginas, conectamos histórias, conhecimento e pessoas por meio de experiências que inspiram." center />}>
      <PhoneVideo {...phoneMedia} />
    </PhoneScrollHero></DeferredContent>
  </section>;
}
