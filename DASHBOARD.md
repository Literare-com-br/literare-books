# Dashboard administrativo — Literare Books

Implementação local em 21/10/2026, sobre o React/Vite existente. Não houve publicação nem execução de SQL no projeto de produção.

Revisão SQL posterior: [MIGRATION-REVIEW.md](MIGRATION-REVIEW.md) substitui as orientações de segurança e implantação abaixo. A migration corrigida usa buckets privados, exige adaptação futura das URLs do frontend antes de publicação e foi testada em PostgreSQL/WASM local. Nenhum banco Supabase foi acessado.

## Ativação e dependências

O código utiliza o cliente de `src/lib/supabase.ts` e as variáveis públicas já configuradas. Não usa `service_role`, credenciais em componentes nem acesso direto do navegador a `auth.users`.

Aplicar as migrations **uma única vez**, na ordem abaixo, primeiro em homologação. Se as duas primeiras já constam como aplicadas, executar somente a terceira:

1. `supabase/migrations/202610200001_contact_submissions.sql`
2. `supabase/migrations/202610200002_coauthor_books.sql`
3. `supabase/migrations/202610210001_administrative_dashboard.sql`

No Supabase SQL Editor, executar o arquivo completo da terceira migration, incluindo `begin` e `commit`, após revisão e com autorização do responsável. Ela depende das duas anteriores e das estruturas `auth`/`storage` do Supabase. A versão corrigida é incremental, transacional e reaplicável ao esquema esperado. Não recria as tabelas existentes nem exclui dados. Não aplicar parcialmente. Verifique o impacto dos buckets privados em MIGRATION-REVIEW.md antes da implantação.

Enquanto a função `dashboard_access` não existir, o dashboard bloqueia os módulos e apresenta a dependência da migration com botão de nova tentativa. O site público mantém o conteúdo original quando a tabela de conteúdo não existe ou a consulta falha.

Depois de aplicar:

1. Validar as políticas em homologação com `supabase/tests/dashboard_rls.sql`. Esse script cria fixtures temporárias dentro de uma transação e termina com rollback; executar apenas em projeto descartável de homologação, nunca como migration de produção.
2. Entrar com uma conta administrativa já presente em `coauthor_admins`. A migration copia essas autorizações para `dashboard_members`, preservando todos os registros anteriores.
3. Caso não exista nenhum administrador, o responsável pelo projeto deve incluir explicitamente uma conta já existente no Auth em `dashboard_members`, pelo SQL Editor/backend. Não há concessão automática de administração a usuários autenticados.
4. Autorizar outras contas existentes na página Usuários e Permissões. Criação de contas e convites continuam no Supabase Auth; não foi criado um endpoint privilegiado de convites.
5. Validar CRUD, persistência, revogação e Storage com contas reais de cada perfil antes da publicação na Vercel.

## Modelo de acesso

| Perfil | Acesso |
| --- | --- |
| Administrador | Todos os recursos, inclusive gestão de permissões |
| Editorial | Escrita nos módulos explicitamente autorizados de coautorias, catálogo e conteúdo; relatórios autorizados |
| Atendimento | Contatos e relatórios explicitamente autorizados |
| Visualizador | Somente leitura dos módulos explicitamente autorizados |

`active=false` revoga o acesso. Os relatórios também exigem permissão de leitura no módulo de origem: permitir relatórios isoladamente não expõe contatos ou livros. Visão geral só retorna indicadores e atividades dos módulos autorizados. Configurações fica disponível para as contas autorizadas no dashboard.

As políticas RLS e privilégios por coluna fazem a autorização no banco. A interface apenas reflete as permissões. `dashboard_set_member` verifica o administrador e impede alterar a própria autorização. `dashboard_users` retorna uma página de contas autorizadas, com e-mail, perfil, módulos, situação e data da autorização; não expõe a tabela Auth ao frontend.

A política original de leitura de coautorias foi substituída para incluir leitores explicitamente autorizados. A condição pública `registration_status='open'` foi preservada. As políticas de escrita e Storage existentes continuam usando `is_coauthor_admin`, agora ligado à autorização de escrita de coautorias. Isso permite o perfil editorial e respeita revogações centralizadas.

## Entrega por fase

### Fase 1 — Fundação

Arquivos: `src/Router.tsx`, `src/pages/AuthRoutes.tsx`, `src/pages/Dashboard.tsx`, `src/components/dashboard/context.ts`, `src/components/dashboard/shared.tsx`, `src/styles/dashboard.css`, `src/hooks/use-dashboard-query.ts`, `src/hooks/use-debounced-value.ts`, `src/lib/dashboard.ts`, `src/lib/dashboard-validation.ts`, `src/types/dashboard.ts`, `src/components/ui/auth-section-1.tsx` e a nova migration.

Sidebar fixa no desktop e drawer em tablet/mobile; cabeçalho com identidade autenticada, breadcrumbs, perfil e logout; transições Framer Motion com movimento reduzido; diálogos nativos com foco contido, Escape e restauração do foco. Rotas protegidas e redirecionamento de login por lista de destinos permitidos. O antigo `src/components/coauthors/AdminGate.tsx` foi removido: a autorização agora é centralizada.

Validação: testes de login, sessão persistida, sessão expirada, logout, ausência de autorização, acesso direto negado e migration ausente; layout em 375/768/1024/1440 px.

Pendência: aplicar a migration e verificar RLS no Supabase real. A verificação visual não substitui a autorização no banco.

### Fase 2 — Funcionalidades essenciais

Arquivos: `src/pages/dashboard/Overview.tsx`, `src/pages/AdminCoauthorsPage.tsx`, `src/pages/dashboard/Contacts.tsx`, serviços e tipos compartilhados, migration.

Visão geral por RPC com contagens reais e últimos cadastros/mensagens. Coautorias reaproveita `BookForm` e os serviços existentes, adicionando filtros, ordenação, cards e paginação. Mantém uploads, substituição de capas, alternância de inscrições e confirmação para exclusão. O caminho das capas continua `usuario/livro/arquivo.ext` no bucket `coauthor-book-covers`.

Contatos possui pesquisa, datas, ordenação, status persistente, detalhe em drawer, copiar dados e ação `mailto:`. O banco permite atualizar apenas `status`; o trigger mantém `updated_at`. Contatos antigos recebem `pending` e `updated_at` na aplicação da migration. O envio público original permanece habilitado sem acesso público à leitura.

Validação: CRUD de coautorias com upload, status, exclusão confirmada; consulta/atualização de contatos e recarga; falha de consulta com nova tentativa; visibilidade pública apenas para inscrições abertas.

Pendência: não há histórico de edição/auditoria anterior. Atividades não inventa alterações editoriais e informa essa limitação.

### Fase 3 — Gestão editorial

Arquivos: `src/pages/dashboard/Catalog.tsx`, `src/components/dashboard/CatalogForm.tsx`, `src/pages/dashboard/Content.tsx`, `src/data/content-defaults.ts`, `src/components/PublishedContent.tsx`, `src/App.tsx`, `src/sections/AboutSection.tsx`, `src/sections/IndustriesSection.tsx`, `src/sections/ContactSection.tsx`, serviços/tipos e migration.

Catálogo separado das coautorias, com múltiplos autores, ISBN-10/13 com checksum no frontend e SQL, sinopse, categoria, link opcional, capa, rascunho/publicação, filtros, paginação e exclusão confirmada. Bucket `catalog-book-covers`, uploads únicos até 5 MB, JPG/PNG/WebP; arquivos referenciados têm remoção bloqueada por política. Metadados públicos limitados aos livros publicados. Nenhuma nova página pública de catálogo foi criada.

Conteúdo usa chaves conhecidas: `hero`, `about_intro`, `about_1`, `about_2`, `about_3`, `banner`, `categories` e `contact`. Título até 100 caracteres, apoio até 600, categorias de 1 a 12 com até 48 caracteres. Sem HTML arbitrário. Publicado e rascunho são registros separados, selecionáveis na interface; salvar rascunho preserva a publicação. Preview de texto/imagem e upload em `institutional-images`. Os três cards Sobre, título institucional, categorias, contato e banner existente passam a consumir conteúdo publicado, com os textos originais como fallback. Os cálculos de scroll são atualizados quando o conteúdo publicado chega para acomodar mudanças na altura das seções.

Na revisão SQL, os três buckets passam a ser privados. IDs e caminhos são preservados, mas o frontend atual ainda usa URLs públicas; será necessária uma adaptação futura para downloads autorizados ou URLs assinadas, fora desta revisão. Imagens substituídas no CMS ficam preservadas porque podem continuar referenciadas por outra versão. A limpeza administrativa de imagens abandonadas não tem rotina automática.

Validação: catálogo com múltiplos autores, ISBN inválido bloqueado, rascunho sem compra, edição/exclusão; CMS com preview, persistência de rascunho e publicação; consulta pública exige `state=published`; fallback e layout institucional preservados.

Pendência: confirmar os novos buckets e operações reais após a migration. Pré-visualização é do conteúdo editado; o layout final continua sendo o site existente.

### Fase 4 — Administração

Arquivos: `src/pages/dashboard/Reports.tsx`, `src/pages/dashboard/Members.tsx`, `src/pages/dashboard/Configuration.tsx`, serviços/tipos e migration.

Relatórios agregados em SQL, períodos de 7/30/90 dias ou personalizado, contatos mensais/status, coautorias abertas/fechadas, cadastros e categorias de coautorias e catálogo. Gráficos em HTML/CSS com valores acessíveis, sem dependência extra. Exportação CSV agregada com escape de células que poderiam ser interpretadas como fórmulas. Os gráficos de status usam a situação atual dos registros criados no período. Agrupamento mensal em `America/Sao_Paulo`; nenhuma métrica de visitantes ou conversão foi inventada.

Usuários: pesquisa e paginação, autorizar conta existente, escolher perfil/módulos e revogar acesso; proteção contra modificar a própria conta no SQL. Configurações: perfil real, alteração de senha pelo Auth, espaçamento compacto persistido neste navegador, logout e identificação básica do ambiente sem chaves/tokens.

Validação: acesso de visualizador sem escrita; submissão de permissões explícitas; própria autorização bloqueada na UI; exportação CSV; senha via SDK Auth e encerramento de sessão. O script SQL de homologação cobre tentativas diretas de escalada, perfis e revogação, mas ainda precisa ser executado no Supabase.

### Fase 5 — Validação

Testes novos: `tests/dashboard-validation.spec.ts`, `tests/integration/dashboard-fixtures.ts`, `tests/integration/dashboard.spec.ts`, `tests/integration/dashboard-layout.spec.ts`, `tests/integration/published-content.spec.ts`. Atualizados: `tests/integration/coauthors.spec.ts`, `tests/integration/supabase.spec.ts` para o novo contrato de autorização e dashboard funcional.

Durante a regressão, o vídeo institucional permanecia tocando atrás do cabeçalho de 78 px. `src/components/ui/phone-video.tsx` agora considera essa área ao detectar visibilidade, preservando o carregamento antecipado.

Comandos:

```sh
npm run build
npm run lint
npx playwright test --config playwright.config.ts --workers=2
npx playwright test --config playwright.integration.config.ts --workers=2
```

Os testes de integração usam o SDK Supabase real com HTTP interceptado em `literare-test.invalid`. Validam os contratos, requisições e comportamentos do navegador, incluindo recarga das telas; não comprovam execução SQL, RLS real ou persistência em produção. Nenhuma consulta, envio de contato ou mutation real foi feita no projeto `yamkwtivuchxmeacrdyy` durante os testes.

Capturas de tela ficam em `qa-results/integration/`. As listas de coautorias, contatos, catálogo e usuários são paginadas em 12 registros e as pesquisas aguardam 250 ms para evitar chamadas a cada tecla. As atividades têm limite de 10 itens, o CMS possui um conjunto fixo de chaves e relatórios retornam agregações, evitando carregar tabelas completas no navegador.

Build e lint aprovados. Suíte do site: **32 testes aprovados**. Suíte de integração: **29 testes aprovados**. Total: **61 testes**, incluindo as quatro larguras solicitadas. Após o ajuste final de recálculo do conteúdo publicado, esse teste foi repetido e aprovado, assim como build e lint. O build possui avisos não bloqueantes de anotações de dependência Zod e de tamanho de chunk.

## Limites de conclusão

A implementação e a validação local não são ativação em produção. Faltam a execução autorizada da migration, o teste SQL de homologação, validação de Auth/Storage/RLS com contas reais e a publicação após essas verificações. Não se deve considerar atendidos os critérios de persistência e isolamento em produção antes dessa etapa.
