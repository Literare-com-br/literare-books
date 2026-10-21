import { aboutCards } from './about';
import { siteContent } from './siteContent';
import type { Content, ContentKey } from '../types/dashboard';
export const contentLabels: Record<ContentKey,string> = { hero:'Título institucional',about_intro:'Introdução sobre a Literare',about_1:'Sobre: quem somos',about_2:'Sobre: publicação',about_3:'Sobre: propósito',banner:'Banner institucional',categories:'Categorias editoriais',contact:'Textos de contato' };
function about(index: number, key: ContentKey): Content { const card = aboutCards[index]; return {key,state:'published',title:card.title,body:card.text,image_url:card.image,items:[]}; }
export const contentDefaults: Record<ContentKey,Content> = {
  hero:{key:'hero',state:'published',title:siteContent.tagline,body:'',image_url:'',items:[]},
  about_intro:{key:'about_intro',state:'published',title:'Um olhar curioso. Uma direção clara.',body:'Infinitas possibilidades de criar.',image_url:'',items:[]},
  about_1:about(0,'about_1'),about_2:about(1,'about_2'),about_3:about(2,'about_3'),
  banner:{key:'banner',state:'published',title:'O próximo capítulo',body:'a gente escreve junto.',image_url:'/images/contact.jpg',items:[]},
  categories:{key:'categories',state:'published',title:'Diferentes gêneros. Infinitas histórias.',body:'Da literatura às grandes ideias, nosso catálogo reúne diferentes gêneros e perspectivas, conectando autores e leitores por meio de histórias, experiências e conhecimento.',image_url:'',items:siteContent.bookCategories},
  contact:{key:'contact',state:'published',title:'Toda grande ideia começa com um olá.',body:'Conte o que você tem em mente. Vamos explorar o próximo passo juntos.',image_url:'',items:[]},
};
