# Publicação na Vercel e configuração atual

**Atualização de 21/10/2026:** novas variáveis Turnstile, CSP, cache e ativação coordenada de SQL/Edge/frontend estão em [MELHORIAS-SEGURANCA-PERFORMANCE.md](MELHORIAS-SEGURANCA-PERFORMANCE.md). Nenhum deployment foi executado nesta tarefa. As verificações remotas citadas abaixo pertencem a etapas anteriores e não foram repetidas nesta auditoria.

## Causa do erro de acesso

A mensagem antiga era emitida por `auth-section-1.tsx` quando o cliente centralizado em `src/lib/supabase.ts` era `null`. O cliente só lia `VITE_SUPABASE_ANON_KEY`; variáveis colocadas apenas em `.env.example` não são carregadas pelo Vite. No início desta correção, `.env.local` já existia com uma chave anon válida, mas o modelo `.env.example` estava ausente. Um processo Vite iniciado com a configuração anterior também precisa recarregar/reiniciar para utilizar as variáveis novas.

Agora `.env.local` usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, com os valores fornecidos. O modelo foi recriado sem valores reais e `.env.local` continua ignorado pelo Git. A configuração valida URL e chave, rejeita credenciais administrativas e conserva compatibilidade com `VITE_SUPABASE_ANON_KEY` como alternativa legada. Há somente um cliente oficial com persistência e renovação da sessão. Nenhuma chave ou senha é registrada em logs.

**Bloqueio confirmado no projeto remoto:** a consulta pública `/auth/v1/settings` respondeu HTTP 200, mas informou `external.email = false`. O responsável pelo projeto precisa habilitar o provedor **Email** em Authentication → Sign In / Providers. Isso é diferente de habilitar novos cadastros: mantenha o cadastro público desativado se o acesso continuar exclusivo para usuários previamente criados. O frontend trata o código `email_provider_disabled` com uma mensagem específica. Veja a [configuração de autenticação do Supabase](https://supabase.com/docs/guides/auth/general-configuration).

Não é necessário executar novamente os SQL existentes. A associação a `coauthor_admins` deve ser concedida apenas ao usuário autorizado, pelo proprietário do projeto. O procedimento está em [COAUTORIAS.md](COAUTORIAS.md). Autenticação comum continua permitindo `/dashboard`, e o gerenciamento `/dashboard/coautorias` exige a RPC e as políticas administrativas existentes. O login padrão retorna a `/dashboard`; o destino administrativo é preservado quando solicitado pela rota protegida.

## Vercel

1. Importe o repositório na Vercel usando o preset **Vite**. Build: `npm run build`; saída: `dist`.
2. Em **Settings → Environment Variables**, selecione **Production** e cadastre:

| Nome | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://yamkwtivuchxmeacrdyy.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | A publishable key fornecida, também disponível no painel Supabase e no `.env.local` local |

Não inclua `service_role`, `sb_secret_` ou senhas. A chave pública é incorporada ao bundle Vite; o acesso aos dados depende das políticas RLS. Os valores do arquivo local não são transferidos automaticamente para a Vercel. Se usar Preview, configure também esse ambiente com os valores adequados e faça um novo deployment após alterar variáveis. [Variáveis na Vercel](https://vercel.com/docs/environment-variables).

3. O `vercel.json` já contém o fallback SPA para `/index.html`, conforme a [documentação Vite da Vercel](https://vercel.com/docs/frameworks/frontend/vite). Ele permite abrir diretamente `/login`, `/dashboard`, `/dashboard/coautorias` e `/coautorias`.
4. Adicione seu domínio em **Settings → Domains**, aplique os registros DNS indicados pela Vercel e confirme que o domínio está válido com HTTPS. Defina qual domínio será o principal e redirecione a alternativa, se houver.
5. No Supabase, ajuste **Authentication → URL Configuration → Site URL** para `https://seu-dominio` e cadastre as URLs de redirecionamento necessárias do domínio real. E-mail/senha funciona pelo SDK sobre HTTPS; as URLs também precisam estar corretas para eventuais confirmações de e-mail. Não há domínio definitivo configurado por esta entrega.
6. Após publicar, abra as rotas diretamente, entre com um usuário real, atualize o dashboard, teste logout e confira o acesso administrativo. A sessão é vinculada à origem do navegador: sessões do localhost não são transferidas para o domínio de produção.

## Interface atualizada

A seção `#diferenciais` reutiliza o componente de timeline para **Nosso processo editorial.**, com as sete etapas fornecidas, numeradas de 01 a 07. Não há subtítulo ou marcos fictícios. Desktop/tablet usam percurso horizontal com scroll real; mobile utiliza sequência vertical. GSAP, ScrollTrigger e SplitText mantêm revelação progressiva e linha de progresso, com limpeza dos efeitos e versão sem movimento.

Os indicadores são exclusivamente **+1.000 Livros publicados**, **+200 mil Páginas diagramadas** e **+200 milhões Caracteres revisados**. Os contadores usam GSAP/ScrollTrigger, formatação `pt-BR`, prefixo `+`, execução única e texto acessível estável. A composição tem três colunas no desktop e se adapta ao mobile.

## Arquivos

- Configuração: `.env.local` (ignorado), `.env.example`, `vercel.json`, `src/lib/supabase.ts`, `src/lib/supabase-config.ts`, `src/lib/auth-error.ts`, `src/vite-env.d.ts`.
- Login/rotas: `src/components/ui/auth-section-1.tsx`, `src/pages/AuthRoutes.tsx`.
- Jornada/indicadores: `src/data/timeline.ts`, `src/components/ui/timeline.tsx`, `src/styles/timeline.css`, `src/data/siteContent.ts`, `src/sections/MetricsSection.tsx`, `src/components/animations/AnimatedCounter.tsx`, `src/styles/editorial-motion.css`, `src/index.css`.
- Testes: `playwright.config.ts`, `playwright.integration.config.ts`, `tests/auth.spec.ts`, `tests/global-motion.spec.ts`, `tests/editorial-motion.spec.ts`, `tests/integration/supabase.spec.ts`, `tests/supabase-config.spec.ts`.
- Documentação: este arquivo, `README.md` e `SUPABASE.md`.

O arquivo antigo `src/sections/InsightsSection.tsx` havia reaparecido sem ser importado pela aplicação e referenciava dados que já não existem, bloqueando o TypeScript. Foi preservado integralmente em `assets-source/legacy/InsightsSection.tsx`, fora do código compilado. A seção não foi reintroduzida.

## Verificações reais e limites

Foram feitas somente consultas de leitura ao projeto remoto: Auth settings HTTP 200, consulta pública de livros abertos HTTP 200, filtro de livros encerrados sem retorno e RPC de autorização administrativa retornando `false` para anônimo. Nenhum contato, usuário ou livro de teste foi criado; nenhuma política ou tabela foi alterada. Como a consulta de encerrados não encontrou registros visíveis, isso não comprova isoladamente todas as políticas sobre dados existentes.

Login real com uma conta existente, persistência real e logout real ainda dependem de habilitar o provedor Email e de uma autenticação pelo usuário; nenhuma senha foi fornecida nem solicitada. O fluxo de senha, sessão, logout e restrição administrativa é verificado localmente com o SDK oficial e HTTP interceptado. Publicação, DNS e HTTPS na Vercel dependem do painel/conta do proprietário.

Resultados executados: `npm run build` e `npm run lint` aprovados. Os 26 cenários principais foram executados, com duas falhas de sincronização de scroll corrigidas no helper e aprovadas em reexecução direcionada. Os onze cenários de integração passaram. A jornada e os valores finais foram novamente conferidos em 320, 768 e 1440 px. As suítes usam servidores isolados e variáveis de teste para evitar enviar dados fictícios ao projeto real.

No build de produção local, `/login`, `/dashboard` e `/dashboard/coautorias` responderam HTTP 200 e as rotas privadas mostraram o login sem sessão. Uma tentativa inicial de verificar a consulta pública no navegador terminou por timeout; a verificação isolada posterior confirmou `/coautorias` consultando o Supabase real com HTTP 200, estado vazio correto e nenhum erro JavaScript. Os servidores auxiliares foram encerrados após a verificação. Isso não equivale a um deploy ou teste do domínio na Vercel.
