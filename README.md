# Literare

Implementação e ativação de segurança, desempenho, Área de atuação e exportação: [MELHORIAS-SEGURANCA-PERFORMANCE.md](MELHORIAS-SEGURANCA-PERFORMANCE.md), com testes reais, métricas e configuração manual pendente.

Configuração de autenticação e publicação: [VERCEL.md](VERCEL.md).

Conteúdo institucional, categorias editoriais e PNGs de Sobre: [ATUALIZACOES-CONTEUDO.md](ATUALIZACOES-CONTEUDO.md).

A funcionalidade de coautorias públicas e gerenciamento editorial está documentada em [COAUTORIAS.md](COAUTORIAS.md), incluindo migração, autorização administrativa e Storage.

Site institucional em React, TypeScript, Vite, Tailwind CSS e GSAP.

```sh
npm install
npm run dev
npm run build
npm run lint
```

O conteúdo institucional e a palavra do portal estão em `src/data/siteContent.ts`. NewJune é carregada do arquivo fornecido em `public/fonts/NewJuneBold.ttf`; Poppins é distribuída localmente pelo pacote Fontsource. Fotografias ilustrativas do Unsplash ficam em `public/images/` e não representam a equipe ou clientes da Literare.

O Glyph Portal mantém a máscara SVG e o cálculo rasterizado de interior das letras do componente de Christian Katzmann (MIT), fornecido pelo usuário. GSAP ScrollTrigger controla o progresso. A renderização aguarda as fontes locais e o efeito respeita movimento reduzido.

Contatos e redes sociais oficiais não foram fornecidos.

O formulário usa Supabase para armazenar contatos, sem exigir login. A autenticação por e-mail e senha leva a um dashboard protegido e vazio. Consulte [SUPABASE.md](SUPABASE.md) para configurar ambiente, migração, RLS e hospedagem.

## Verificação no navegador

`npx playwright test` executa o cenário de responsividade, navegação, portal e formulário usando o Microsoft Edge instalado. O servidor de testes inicia automaticamente na porta 4180, isolado das credenciais locais.

## Animações editoriais

`BlurReveal` em `src/components/ui/blur-reveal.tsx` preserva as tags semânticas, mantém uma única leitura acessível e respeita movimento reduzido. Está integrado aos títulos e descrições do `SectionHeading`, sem alterar o portal ou a seção Sobre.

A seção `#servicos` usa `ScrollMorphHero` com a sequência original de entrada: Scatter → Line (500 ms) → Circle (2500 ms), iniciada quando a seção fica visível. A geometria circular, o arco inferior, os springs e a rotação limitada seguem o componente de referência. A entrada de scroll virtual foi substituída por 3000 pixels de scroll real: os primeiros 600 transformam o círculo em arco e os demais controlam sua rotação, sem interceptar wheel ou touchmove. O parallax é limitado ao mouse no desktop. Com movimento reduzido, o círculo permanece estático, sem virar uma grade.

As vinte capas reais foram obtidas no [catálogo oficial Literare Books](https://loja.literarebooks.com.br/catalogo), estão em `public/images/books` e podem ser substituídas em `src/data/book-covers.ts`. Cada entrada registra título, página da obra e URL original da imagem. A composição mantém exatamente 20 posições; se faltar uma capa na configuração, seu espaço é identificado sem inventar uma publicação. Os frames têm 60×85 px; no mobile, a escala se adapta preservando o círculo completo. Os estilos desta seção ficam em `src/styles/scroll-morph-hero.css`.

A seção `#projetos` usa `PhoneScrollHero`, com moldura, câmera, botões laterais e animação de inclinação, escala e subida. `src/data/phone-media.ts` configura o caminho do vídeo, enquadramento e descrição. O vídeo local otimizado em `public/videos/literare-phone.optimized.mp4` toca automaticamente, sem áudio, inline, em loop e sem controles; pausa fora da tela.

`tests/editorial-motion.spec.ts` cobre sete larguras (320 a 1920 px), fases do scroll, enquadramento do smartphone, reprodução de vídeo, movimento reduzido e continuidade da navegação. Capturas desktop, tablet e mobile são geradas em `qa-results/`.

## Dashboard administrativo

A implementação, os arquivos por fase, o modelo de permissões, os testes e as instruções de ativação estão em [DASHBOARD.md](DASHBOARD.md). A nova migration `202610210001_administrative_dashboard.sql` precisa ser aplicada após as duas migrations existentes, com autorização do responsável. O código foi validado localmente; a migration e o teste de RLS ainda precisam de validação em homologação.
