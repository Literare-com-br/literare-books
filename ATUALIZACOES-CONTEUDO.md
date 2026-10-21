# Atualizações de conteúdo e interface

- “Projetos” foi removido do Header e do menu mobile por uma lista compartilhada de navegação principal. O restante dos itens, o link do rodapé, a seção `#projetos`, o smartphone e o vídeo foram preservados. A numeração do menu móvel se ajusta à quantidade de itens.
- Os três cards de Sobre utilizam os títulos e parágrafos institucionais fornecidos, com o card central amarelo preservado. O layout separa texto e imagem, centraliza a mídia nos dois eixos e usa `object-fit: contain` e `object-position: center center`, sem margens negativas na imagem central.
- “04 / UNIVERSOS EDITORIAIS” apresenta a headline e o texto fornecidos, seguidos pelas seis categorias, na ordem solicitada. A composição usa numeração e separadores, GSAP/ScrollTrigger para entrada e hover discreto. Não inclui quantidades ou descrições inventadas de livros.
- O botão “Vamos construir juntos” e a seção de perspectivas demonstrativas foram removidos, junto com componente, dados, controles, ícones e estilos exclusivos. A imagem portrait não tinha outros consumidores: sua entrada no mapa de imagens e as três variantes WebP publicadas foram retiradas. O original arquivado em `assets-source` foi preservado.
- A integração Supabase não foi alterada.

## PNGs pendentes

Os arquivos institucionais ainda não foram fornecidos. Adicione:

1. `public/images/sobre/sobre-literare-01.png`
2. `public/images/sobre/sobre-literare-02.png`
3. `public/images/sobre/sobre-literare-03.png`

Os caminhos públicos correspondem exatamente aos solicitados. A pasta contém um README com instruções. Sem o arquivo, o card continua apresentando seu texto, sem fotos externas, placeholders definitivos ou pedidos de imagens inexistentes. Adicione os PNGs e reinicie o Vite; em produção, gere um novo build. Ajuste os textos alternativos após escolher as imagens finais, se necessário.

O carregamento e o enquadramento das imagens finais permanecem pendentes dos PNGs. O CSS de alinhamento está preparado, mas isso não equivale a validar imagens que ainda não existem. PNGs com margens transparentes desiguais podem precisar de recorte na origem para alinhamento visual.

## Arquivos envolvidos

Criados: `src/data/about.ts`, `src/styles/about.css`, `src/styles/editorial-categories.css`, `public/images/sobre/README.md`, este relatório e os testes de conteúdo/responsividade.

Alterados: `src/App.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/MobileMenu.tsx`, `src/data/siteContent.ts`, `src/data/image-assets.ts`, `src/sections/AboutSection.tsx`, `src/sections/IndustriesSection.tsx`, `src/sections/ProjectsSection.tsx`, `src/index.css`, `src/styles/editorial-motion.css`, `src/vite-env.d.ts`, `vite.config.ts`, `tests/site.spec.ts` e `README.md`.

Removidos: `src/sections/TestimonialsSection.tsx` e `public/images/optimized/portrait-{480,800,1100}.webp`.

## Validação executada

`npm run build` e `npm run lint` concluídos com sucesso. Cinco cenários de conteúdo/layout passaram: 375, 768, 1024 e 1440 px, além de movimento reduzido. O fluxo existente de portal, navegação e formulário também passou. O teste de imagens passou a solicitar carregamento eager antes de `decode()`, evitando aguardar indefinidamente imagens lazy fora da viewport; isso não altera o carregamento do site.

As capturas de Sobre e Universos Editoriais foram conferidas. Os três PNGs ainda não existem: seu carregamento e enquadramento final não foram declarados como validados. Não foram executadas auditorias adicionais nem alterados serviços, credenciais ou políticas Supabase.
