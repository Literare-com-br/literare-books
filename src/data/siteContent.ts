export const siteContent = {
  name: 'Literare', word: 'LITERARE',
  tagline: 'Onde grandes histórias ganham vida.',
  nav: [{label:'Início',href:'#inicio'},{label:'Sobre',href:'#sobre'},{label:'Serviços',href:'#servicos'},{label:'Diferenciais',href:'#diferenciais'},{label:'Projetos',href:'#projetos'},{label:'Contato',href:'#contato'}],
  features:[{title:'Experiência',text:'Um olhar atento ao contexto, às pessoas e aos detalhes de cada desafio.'},{title:'Colaboração',text:'Construção próxima, com escuta ativa e decisões compartilhadas.'},{title:'Estratégia',text:'Cada escolha de criação conectada a um objetivo claro.'},{title:'Inovação',text:'Novas perspectivas para encontrar caminhos que fazem sentido.'}],
  metrics:[{value:1000,suffix:'',divisor:1,label:'Livros publicados'},{value:200000,suffix:' mil',divisor:1000,label:'Páginas diagramadas'},{value:200000000,suffix:' milhões',divisor:1000000,label:'Caracteres revisados'}],
  bookCategories:['Não ficção','Ficção','Biografia','Infantojuvenil','Negócios','Desenvolvimento pessoal'],
};
export const imagePath = (name: string) => `/images/${name}.jpg`;

export const mainNavigation = siteContent.nav.filter(item => item.href !== '#projetos');
