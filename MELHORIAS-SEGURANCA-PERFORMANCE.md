# Segurança, desempenho e contatos — 21/10/2026

Implementação local, sem publicação, execução de migrations no Supabase ou alteração de registros de produção. As novas funcionalidades dependem da ativação coordenada descrita abaixo. Este documento substitui as instruções antigas de INSERT público direto e URLs públicas de Storage presentes nos documentos históricos.

## Alterações implementadas

- Formulário com Área de atuação obrigatória, dez opções, campo personalizado para Outros, validação compartilhada, acessibilidade e preservação do preenchimento quando o envio falha. Contatos antigos continuam sem alteração e aparecem como Não informado.
- Contatos no dashboard com área na listagem/detalhes, filtro de área e exportação de todos os registros autorizados ou dos filtros aplicados. A exportação percorre lotes de 500 por cursor, independentemente da página visível, com progresso e cancelamento.
- CSV com BOM UTF-8, separador `;`, cabeçalhos em português, escape de fórmulas e datas de São Paulo. XLSX OOXML com células de texto, sem fórmulas, validação independente e módulo de 3,42 KB carregado somente ao exportar Excel. Nenhuma dependência de runtime foi adicionada.
- Envio público passa exclusivamente pela Edge Function `submit-contact`: Turnstile validado no servidor, action/hostname conferidos, origens exatas, limite de corpo, honeypot, timeout e mensagens genéricas. INSERT direto é revogado e bloqueado por política restritiva.
- RPC de inserção acessível somente a `service_role`; segredo fica exclusivamente na Edge Function. Limites atômicos por janela: três envios por e-mail/hora e 100 globais/10 minutos. Identidade de limitação usa HMAC; token usa SHA-256 e proteção de repetição. Tabelas privadas têm limpeza de registros expirados durante os envios.
- Exportação usa SECURITY INVOKER, autorização de contatos e RLS em cada lote. Administrador lê/exporta; atendimento e visualizador precisam do módulo contatos; editorial não recebe acesso a contatos. Usuários comuns e visitantes não consultam nem exportam.
- Bloqueio de credenciais administrativas no build: nomes privados em variáveis VITE, `sb_secret_`, JWT com papel privilegiado e URL com credenciais são rejeitados sem imprimir seus valores.
- CSP sem `unsafe-eval` ou scripts inline; Zod configurado sem compilação JIT. Cabeçalhos de proteção e cache na Vercel, dashboard/login sem cache e sem indexação. CORS do endpoint usa lista explícita; CORS do servidor Vite está desabilitado.
- Imagens de Storage resolvem links assinados sob a sessão atual, inclusive capas públicas permitidas pela RLS de publicação. Cache curto, deduplicação e invalidação por usuário. IDs de buckets, caminhos de objetos e URLs canônicas armazenadas permanecem compatíveis. Links assinados nunca são persistidos no CMS.
- Home, autenticação, coautorias e módulos do dashboard carregam separadamente. SDK administrativo fica fora da entrada da home; conteúdo público busca somente os campos publicados. Excel e shader são carregados sob demanda. Estados de carregamento e paginação são mantidos.
- WOFF2 para NewJune; vídeo com duração integral, faststart e menor resolução/bitrate; imagens WebP/srcset existentes preservadas. Animações, portal, GSAP e movimento reduzido permanecem. Não foram removidos efeitos para elevar métricas.
- Ajustes de toque, modais e overflow, verificados nas oito larguras solicitadas.

## Auditoria: problemas e limites

| Achado | Implementação |
| --- | --- |
| INSERT anônimo direto permitia contornar qualquer CAPTCHA do frontend | Revogação de grants de tabela/coluna, políticas restritivas e endpoint verificado obrigatório |
| Limitação apenas no navegador não impedia automação | Verificação Turnstile no servidor e quotas transacionais; falha de configuração bloqueia o envio |
| Buckets privados da revisão SQL eram incompatíveis com imagens renderizadas por URL pública | Componente de imagem assina referências com a sessão/RLS, mantendo metadados e caminhos anteriores |
| Credencial privada VITE poderia ser incorporada ao bundle | Validação do ambiente durante o build, além da validação do cliente |
| Ausência de CSP e outros cabeçalhos | Configuração de hospedagem e teste de navegador com CSP aplicada; validação Zod sem eval |
| Exportação limitada à página poderia omitir dados; planilhas poderiam interpretar entradas como fórmulas | RPC com cursor e autorização por lote; CSV escapado e XLSX com strings explícitas |
| Home e páginas secundárias carregavam recursos alheios à rota | Separação de bundles, conteúdo público leve, mídia/fontes otimizadas |

Autenticação, redirecionamento interno permitido, guardas de módulo, grants, RLS, RPCs, uploads e erros foram revisados. A revisão anterior de SECURITY DEFINER, último administrador, ISBN e políticas está em [MIGRATION-REVIEW.md](MIGRATION-REVIEW.md). Testes cobrem os seis perfis, negação de acesso e exportação sob RLS. Não foi constatada vulnerabilidade de dependência no `npm audit` executado. Não há prova de ausência de todas as classes de vulnerabilidade: não houve teste ofensivo nem inspeção remota de configuração do projeto.

React renderiza os campos como texto; não foi acrescentado HTML de contatos ao DOM. RPCs usam parâmetros e SQL estático. O backend de envio não aceita nome de tabela/RPC vindo do usuário. CORS não é autenticação: Turnstile e os limites no servidor continuam obrigatórios.

## Desempenho medido

Lighthouse 13.5, Edge headless, preview local de produção, perfil mobile padrão, Supabase desabilitado, uma amostra por rota em cada fase. Estes resultados não representam produção, dados reais do CMS, cache/CDN da Vercel ou distribuição estatística. Relatórios completos: `performance/improvements/{before,after}-{home,coauthors,login}.json` e resumos correspondentes.

| Rota | Performance antes → depois | FCP ms | LCP ms | TBT ms | Transferência bytes |
| --- | --- | --- | --- | --- | --- |
| Home | 87 → 89 | 2411 → 2274 | 3491 → 3223 | 123 → 134 | 316644 → 263068 |
| Coautorias | 87 → 84 | 2556 → 2351 | 3560 → 4051 | 0 → 0 | 336656 → 326979 |
| Login | 81 → 75 | 2786 → 2123 | 3316 → 3041 | 303 → 689 | 330918 → 267171 |

Acessibilidade foi 100 nas três rotas em ambas as fases. CLS permaneceu 0 em coautorias/login e aproximadamente 0,000114 na home. SEO das páginas públicas passou de 92 para 100; login passou de 91 para 63 com restrição de indexação. Não se busca indexar o login administrativo.

A transferência e o FCP caíram nas três rotas, mas o LCP de coautorias e o TBT do login pioraram nessa amostra. Portanto, não há evidência de ganho uniforme de desempenho. O shader WebGL do login permanece um custo a investigar com profiling e medições repetidas em dispositivos reais; a animação não foi removida. SEO do login também não deve ser interpretado como melhoria. O dashboard foi validado funcionalmente/responsivamente com mocks, sem medição Lighthouse autenticada em produção.

| Recurso | Antes | Depois |
| --- | --- | --- |
| Maior chunk JavaScript, sem gzip | 544,33 KB | 260,74 KB |
| CSS de entrada | 31,67 KB | 27,74 KB, com estilos de rotas separados |
| NewJune principal | 31372 bytes TTF | 11716 bytes WOFF2, TTF de fallback preservada |
| Vídeo utilizado | 10597906 bytes | 4029848 bytes |

Vídeo: duração 117,2 s preservada, 432×768, 24 fps, H.264 sem áudio, SSIM normalizado 0,972712. Evidência: `performance/improvements/video-validation.txt`. Fontes e vídeos originais permanecem no projeto.

## Testes executados

| Verificação | Resultado observado |
| --- | --- |
| `npm run build` / TypeScript | Passou; sem chunk acima de 500 KB. Rollup emitiu avisos de comentários de anotação do Zod, sem falha |
| `npm run lint` | Passou |
| `npx playwright test` | 38 testes passaram |
| `npx playwright test -c playwright.integration.config.ts` | 48 testes passaram |
| `npx playwright test -c playwright.production.config.ts` | 1 teste passou, com CSP sobre build de produção e verificação de divisão de rotas |
| Testes afetados por ajustes finais | Sete testes unitários passaram novamente; proteção de credenciais passou novamente após casos adicionais; três testes de formulário/exportação passaram após unificar a normalização de busca entre listagem e exportação |
| `node supabase/tests/run-local.mjs` | 11 cenários locais passaram, incluindo 216 assertions de RLS antes/depois do upgrade, instalação/reaplicação, drift, quotas, replay e exportação de 1005 registros |
| `python scripts/validate-exports.py` | Dois XLSX abriram no OpenPyXL, CRC ZIP e XML válidos, sete colunas, datas/acentos corretos e células sem fórmula |
| `npm audit --json` | Zero vulnerabilidades no diagnóstico e na verificação final; relatório final em `performance/improvements/audit-after.json` |

São 87 casos distintos Playwright, além das repetições direcionadas. Integrações usam domínio `.invalid`, respostas interceptadas e dados fictícios. Testes SQL usam PGlite local com fixtures mínimas de Auth/Storage; não equivalem ao Postgres/Supabase completo. Turnstile real, Auth real, Storage remoto, infraestrutura da Edge e cabeçalhos efetivamente servidos pela Vercel precisam de validação em homologação.

Responsividade: 360, 390, 430, 768, 1024, 1280, 1440 e 1920 px; home, coautorias, login e oito módulos do dashboard. Inclui modais de exportação, foco/teclado, formulários, listagens e ausência de overflow horizontal global. Tabelas largas usam rolagem interna. Há testes de formulário com Outros obrigatório, manutenção dos dados na falha, exportação completa de 1005 contatos em três lotes e exportação filtrada em XLSX. Não houve ensaio visual manual em todos os aparelhos físicos.

O sandbox do Windows bloqueou a leitura do esbuild na primeira tentativa do build final. A repetição autorizada fora dessa restrição passou. Isso não foi erro de compilação da aplicação.

## Ativação manual — Supabase e Vercel

Não executar migrations antigas de criação sobre tabelas existentes. Revisar o SQL integral e fazer backup antes do rollout. Não usar os testes com fixtures de Auth em produção.

1. Em homologação, revisar/aplicar a migration administrativa corrigida `supabase/migrations/202610210001_administrative_dashboard.sql`, caso essa revisão ainda não esteja instalada. A revisão preserva dados e tem pré-condições; ler [MIGRATION-REVIEW.md](MIGRATION-REVIEW.md), especialmente a matriz e o tratamento de buckets privados. Um SQL anteriormente aplicado com o mesmo nome não é atualizado automaticamente pelo histórico do CLI.
2. Revisar `supabase/migrations/202610210002_contact_security_and_exports.sql`. No Supabase SQL Editor, abrir uma consulta, colar o arquivo completo, conferir o projeto selecionado e executar somente após aprovação do responsável. O arquivo tem BEGIN/COMMIT e depende da migration administrativa revisada. Adiciona colunas/índices, funções e controles, sem apagar contatos. A reaplicação local foi testada.
3. Criar um widget Turnstile para os domínios autorizados. Guardar `TURNSTILE_SECRET_KEY` somente nos secrets da Edge Function. Configurar `CONTACT_ALLOWED_ORIGINS` com origens completas separadas por vírgula, incluindo cada domínio permitido com esquema e porta quando aplicável, sem wildcard; exemplo estrutural: `https://dominio,https://www.dominio`. Configurar `CONTACT_HASH_SECRET` com segredo aleatório forte, exclusivo do servidor. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` devem estar disponíveis no ambiente da função; não copiá-los para variáveis VITE.
4. Publicar a função `supabase/functions/submit-contact` usando o fluxo de Edge Functions do projeto. O arquivo `supabase/config.toml` declara `verify_jwt=false` para esse endpoint público; o handler exige a prova Turnstile e os limites no backend. Se usar o CLI, a operação manual é `supabase functions deploy submit-contact --no-verify-jwt`, com o projeto correto previamente selecionado. Nenhum deploy foi executado nesta tarefa.
5. Na Vercel, configurar as variáveis públicas `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_TURNSTILE_SITE_KEY`; manter segredos fora do frontend. Gerar novo build. A chave Turnstile deve corresponder ao widget/secret e aos hostnames usados. Supabase Auth continua com Email habilitado, usuários previamente provisionados e URLs autorizadas corretas.
6. Coordenar migration, função e frontend em janela de atualização: a nova migration bloqueia clientes antigos que ainda fazem INSERT direto; o novo frontend não tem fallback inseguro. Sem Turnstile/Edge configurados, o contato mostra indisponibilidade e não finge sucesso. Recomenda-se preparar a função primeiro em homologação e programar a troca de frontend/SQL em conjunto.
7. Depois da aprovação de produção, repetir manualmente: contato real com área/Outros; falha de CAPTCHA/quota; contatos antigos; login de cada perfil; exportações completas/filtradas; capas abertas, fechadas, rascunhos e publicadas com sessões distintas; respostas e cabeçalhos reais da Vercel. Não colocar dados pessoais nos artefatos de teste.

`vercel.json` aplica CSP, HSTS sem preload, nosniff, frame denial, Permissions-Policy e Referrer-Policy. Somente assets com hash recebem cache imutável de um ano; fontes sete dias e imagens um dia. Dashboard/login recebem `no-store` e `X-Robots-Tag`. A CSP permite Supabase em `*.supabase.co` e Turnstile; um domínio customizado de Supabase exige ajuste explícito. Estilos inline permanecem permitidos para as animações existentes; scripts inline/eval permanecem bloqueados. Verificar headers reais após publicação, pois Vite preview não reproduz a infraestrutura Vercel.

## Arquivos da implementação

| Grupo | Arquivos |
| --- | --- |
| Backend incremental | `supabase/migrations/202610210002_contact_security_and_exports.sql`, `supabase/functions/submit-contact/{handler,index}.ts`, `supabase/config.toml` |
| Formulário | `src/data/contact-areas.ts`, `src/lib/{contact-schema,contact}.ts`, `src/components/ui/contact-challenge.tsx`, `src/sections/ContactSection.tsx` |
| Dashboard/exportação | `src/pages/dashboard/Contacts.tsx`, `src/types/dashboard.ts`, `src/lib/{contact-export,contact-export-format,contact-xlsx,dashboard}.ts` |
| Storage/imagens | `src/lib/storage-assets.ts`, `src/components/ui/{storage-image,responsive-image}.tsx`, componentes de coautoria `BookCard`, `BookDetails`, `BookForm`, `AdminCoauthorsPage`, `Catalog`, `CatalogForm`, `AboutSection` |
| Rotas/carregamento/configuração | `src/{main,router}.tsx`, `src/pages/{HomePage,AuthRoutes}.tsx`, `src/components/PublishedContent.tsx`, `src/lib/{public-config,published-content,navigation-security,build-security,validation,dashboard-validation}.ts`, `src/components/ui/auth-section-1.tsx`, `vite.config.ts` |
| Estilos e mídia | Estilos globais/auth/dashboard/coautorias, `index.html`, `src/data/phone-media.ts`, `public/fonts/NewJuneBold.woff2`, `public/videos/literare-phone.web.mp4`, `public/robots.txt` |
| Hospedagem/ferramentas | `vercel.json`, `.env.example`, `.gitignore`, `eslint.config.js`, configurações Playwright |
| Evidências/testes | `tests/{build-security,contact-security,contact-export,site,content-layout,editorial-motion}.spec.ts`, `tests/integration/{contact-improvements,responsive-improvements,login-responsive,supabase,coauthors}.spec.ts`, `tests/production/security.spec.ts`, `supabase/tests/{contact_security.sql,run-local.mjs}`, `scripts/{measure-performance.mjs,validate-exports.py}`, `performance/improvements/` |

PGlite/OpenPyXL/fonttools foram instalados apenas em `.local-tools` para validação/conversão; não são dependências do app. Para reproduzir SQL/Excel, instalar essas ferramentas locais conforme os scripts e rodar os testes de exportação antes do validador Python. Os relatórios medidos ficam fora dos diretórios de saída que Playwright limpa.

## Pendências e limitações

- Nenhuma migration, Edge Function, configuração Turnstile ou alteração Vercel foi ativada remotamente. O formulário novo depende desse rollout; não está certificado em produção.
- Quotas usam janelas fixas por e-mail, não IP; não eliminam abuso distribuído nem substituem monitoramento/WAF. Turnstile é dependência externa, com falha fechada.
- Exportação usa limite de criação e cursor, não uma transação MVCC entre chamadas: edições/exclusões durante a exportação podem alterar os dados retornados. Arquivos são montados em memória; grandes volumes exigem períodos menores. Há erro explícito no limite do Excel, sem truncamento silencioso.
- Links assinados duram 60 segundos e o cache 50 segundos; uma URL já emitida continua válida até expirar mesmo após revogação de permissões.
- Cache, políticas desconhecidas e características reais de Storage/Auth requerem homologação. PGlite não valida CORS remoto, papel proprietário real ou serviço de Storage.
- Regressões pontuais de Lighthouse descritas acima permanecem e precisam de profiling/medições repetidas. Não há alegação de cumprimento universal de Core Web Vitals.

Referências primárias consultadas: [validação Turnstile no servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [privacidade de buckets Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals), [API Supabase](https://supabase.com/docs/guides/api/creating-routes), [SECURITY DEFINER no PostgreSQL](https://www.postgresql.org/docs/current/sql-createfunction.html).
