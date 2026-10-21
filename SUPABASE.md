# Configuração atual

Veja [VERCEL.md](VERCEL.md) para a configuração vigente de ambiente, causa do erro de login e preparo do deploy. O provedor Email precisa ser habilitado no painel; os SQL existentes não precisam ser repetidos. O login padrão volta para `/dashboard`, preservando o destino administrativo quando solicitado.

# Login e contatos — configuração

A etapa posterior adiciona `/coautorias` e `/dashboard/coautorias`, com autorização administrativa própria. O login agora utiliza o gerenciamento de coautorias como destino padrão; `/login?next=/dashboard` conserva o destino vazio anterior. Veja [COAUTORIAS.md](COAUTORIAS.md) para a migração e concessão de acesso. As descrições abaixo do fluxo original do dashboard se aplicam ao destino explícito `/dashboard`.

**Atualização de 21/10/2026:** o envio agora utiliza Edge Function com Turnstile, sem INSERT público direto. Capas usam leitura autorizada e URLs assinadas. Consulte [as instruções atuais de rollout](MELHORIAS-SEGURANCA-PERFORMANCE.md) antes de seguir os registros históricos abaixo. As novas migrations exigem revisão e execução manual; nenhuma foi executada remotamente nesta tarefa.

## Configuração do projeto

1. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com a URL do projeto e a chave **publishable** ou **anon**. Nunca use `service_role` ou `sb_secret_`. Esses valores Vite são públicos e incorporados no build; RLS é a proteção do banco.
2. Execute `supabase/migrations/202610200001_contact_submissions.sql` no SQL Editor do seu projeto, ou aplique a migração pelo Supabase CLI já conectado ao projeto. A migração cria uma tabela nova; não contém dados demonstrativos.
3. Em Authentication, habilite e-mail/senha e desabilite novos cadastros públicos. Crie os usuários autorizados pelo painel administrativo e confirme seus e-mails. O site não oferece cadastro nem login social.
4. Configure a Site URL e URLs autorizadas no Supabase conforme seu domínio. Reinicie `npm run dev` após modificar o ambiente; para produção, gere novo build.
5. Na hospedagem, configure fallback SPA: `/login` e `/dashboard` devem servir `index.html`. Exemplo Netlify: regra `/* /index.html 200`; em Nginx, `try_files $uri $uri/ /index.html;`.

Os arquivos `.env` e `.env.*` são ignorados pelo Git, exceto `.env.example`. A chave pública fornecida foi configurada somente no ambiente local ignorado pelo Git. Configuração ausente ou chave administrativa mantém a integração indisponível, com mensagem amigável e sem sucesso fictício.

## Login e sessão

O Header e o menu móvel levam a `/login`. `auth-section-1.tsx` segue a composição AuthSectionOne fornecida: duas colunas, formulário claro com borda e painel escuro com GrainGradient em branco/amarelo Literare. O shader carrega separadamente, somente no login, sem bloquear o formulário. Tem limite de pixels e fallback CSS para movimento reduzido, WebGL indisponível ou erro de renderização.

O cliente oficial centralizado em `src/lib/supabase.ts` usa `signInWithPassword`. A sessão, armazenamento e renovação ficam com o SDK. `AuthRoutes` restaura via `getSession`, acompanha `onAuthStateChange`, cancela o listener ao desmontar e reavalia expiração. Durante a recuperação não renderiza conteúdo protegido. Sem sessão, dashboard redireciona ao login; com sessão válida, login redireciona ao dashboard. O dashboard renderiza `null`: não tem conteúdo, menu ou botão de logout.

A função reutilizável `signOut()` está exportada em `src/lib/supabase.ts`. A proteção de rota controla a interface; futuras APIs/dados administrativos também precisarão de autorização no servidor/RLS.

## Formulário e RLS

O formulário conserva nome, e-mail, telefone e mensagem. A validação Zod é compartilhada com o serviço. O envio chama `contact_submissions.insert` sem `select`, aguarda a resposta, limpa os campos apenas em sucesso e mantém o preenchimento quando falha. O botão fica indisponível durante a requisição e uma trava impede envios concorrentes. Erros internos não são exibidos.

A migração cria UUID automático, timestamp, campos obrigatórios e limites de tamanho/formato. Habilita RLS, revoga privilégios existentes e concede apenas INSERT nas quatro colunas de conteúdo a `anon` e `authenticated`. Não cria políticas nem permissões de SELECT, UPDATE ou DELETE para esses papéis. Usuários comuns autenticados também podem enviar, mas não ler contatos. Consulte registros somente pelo painel do Supabase ou por um backend com autorização apropriada.

As restrições do banco e a trava de envio não constituem proteção completa contra bots. Para um endpoint público exposto a spam, configure uma Edge Function que valide CAPTCHA (por exemplo, Turnstile com segredo exclusivamente no servidor) e aplique limite de frequência. Nesse caso, remova o INSERT direto dos papéis públicos e faça a inserção pelo backend após validação. Nenhuma dependência de CAPTCHA foi adicionada sem configuração externa.

## Verificação real após configurar

- Entrar com um usuário existente; recarregar o dashboard e confirmar sessão. Conferir redirecionamento de `/login`, expiração/renovação e logout.
- Enviar o contato sem login e conferir uma nova linha no painel. Tentar SELECT, UPDATE e DELETE como anon e usuário comum: devem ser negados.
- Confirmar que entradas inválidas são rejeitadas pelo banco e que falhas de rede preservam os campos.

Os testes locais usam o SDK real com HTTP interceptado para os cenários de autenticação e envio. Eles não executam a migração nem comprovam persistência, RLS ou entrega em um projeto Supabase real.

## Painel administrativo (21/10/2026)

Consulte [DASHBOARD.md](DASHBOARD.md) antes de aplicar `supabase/migrations/202610210001_administrative_dashboard.sql`. Essa migration preserva os administradores existentes, centraliza permissões por recurso e acrescenta status de atendimento, catálogo, conteúdo, relatórios e diretório administrativo. O script `supabase/tests/dashboard_rls.sql` é destinado apenas à homologação descartável e não deve ser aplicado como migration. Nenhum SQL dessa entrega foi executado em produção.
