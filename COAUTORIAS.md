# Coautorias — implementação e configuração

## Páginas e uso

`/coautorias` é pública e consulta o Supabase, filtrando `registration_status = open`. Não há livros fixos nem inscrições/pagamentos simulados. A página reutiliza Header, Footer, NewJune, Poppins, amarelo institucional e BlurReveal. Capas entram com GSAP/ScrollTrigger, stagger e movimento vertical sutil; hover usa transformações sem deslocar o layout. Os efeitos respeitam movimento reduzido e são limpos ao desmontar.

O diálogo nativo mostra capa, categoria, título, coordenação, descrição em parágrafos e status do registro. Tem animações de entrada/saída, foco contido pelo navegador, fechamento por botão, Escape ou fundo, bloqueio de scroll e retorno do foco. Carregamento, erro com nova tentativa e ausência de oportunidades têm estados próprios.

`/dashboard/coautorias` reutiliza a sessão existente e exige autorização adicional por RPC. O painel oferece novo livro, edição, prévia/upload de capa, abertura/encerramento e exclusão confirmada. Projetos encerrados permanecem gerenciáveis. O link Login agora leva ao gerenciamento após autenticação; contas sem permissão recebem uma tela de acesso restrito. `/dashboard` continua vazio e protegido; `/login?next=/dashboard` mantém esse destino quando necessário. Não há redirecionamento arbitrário para URLs externas.

No formulário, preencha título, descrição, categoria livre e coordenação. Selecione uma imagem JPG/PNG/WebP de até 5 MB. O arquivo é validado e pré-visualizado antes de salvar. Projetos abertos exigem capa; projetos encerrados podem ser preparados sem capa. Depois de salvar, uma nova consulta pública reflete a alteração, sem edição de código ou deploy. Encerre pelo botão da lista ou pelo status no formulário. Excluir exige confirmação explícita.

## Supabase

Use o mesmo ambiente descrito em [SUPABASE.md](SUPABASE.md). Não foram fornecidas credenciais reais nesta etapa.

1. Aplique `supabase/migrations/202610200002_coauthor_books.sql` no projeto correto, pelo SQL Editor ou CLI.
2. Crie/identifique o usuário em Authentication. Pelo SQL Editor, executado pelo proprietário do projeto, conceda a permissão:

```sql
-- Substitua pelo UUID real de um usuário previamente autorizado.
insert into public.coauthor_admins (user_id)
values ('UUID-DO-USUARIO-AUTORIZADO');
```

Para revogar, execute `delete from public.coauthor_admins where user_id = 'UUID-DO-USUARIO';`. O usuário perde o direito de novas operações mesmo que mantenha uma aba aberta: as políticas são verificadas no servidor em cada requisição. Recarregue a página para atualizar também a interface. Não conceda privilégios por `user_metadata` editável nem exponha uma tela pública de atribuição de papéis.

3. Entre em `/login` e abra `/dashboard/coautorias`. Cadastre uma obra, envie a capa e defina inscrições abertas. Consulte `/coautorias` em outra aba para conferir os dados publicados.
4. Preserve o fallback SPA da hospedagem para essas rotas. Após preencher variáveis Vite, reinicie o servidor ou gere novo build.

### Banco e autorização

`coauthor_admins` não concede leitura ou escrita aos papéis do frontend. A função `is_coauthor_admin()` é `security definer`, usa `search_path` vazio, consulta a associação pelo `auth.uid()` e retorna somente um booleano. Apenas o proprietário/backend confiável pode conceder permissão.

`coauthor_books` possui UUID, campos limitados/obrigatórios, status restrito, autoria vinculada a `auth.users`, timestamps, índice parcial para obras abertas e índice para caminhos de capa. Um trigger mantém `updated_at`. RLS permite leitura pública somente de obras abertas, enquanto administradores podem consultar todas e inserir/alterar/excluir. As concessões de escrita são limitadas às colunas de conteúdo; o frontend não escolhe `created_by` nem os timestamps. Login comum não concede administração.

### Storage

A migração cria o bucket público `coauthor-book-covers`, com limite de 5 MB e tipos JPEG/PNG/WebP. Os uploads usam `UUID-usuario/UUID-livro/UUID-arquivo.ext`, sem sobrescrita. Somente administradores podem enviar e remover arquivos; substituição usa um caminho novo.

Por ser público, uma capa com URL conhecida pode ser acessada mesmo depois de encerrar inscrições. Encerrar remove a obra da consulta pública, preservando seu registro e imagem. Caso capas também precisem de confidencialidade, será necessário migrar para bucket privado com entrega autorizada; isso não foi solicitado nesta etapa.

Após substituir uma capa ou excluir um livro, o serviço consulta referências antes de tentar remover o arquivo. A política de DELETE do Storage também bloqueia capas ainda referenciadas. Se o salvamento falhar depois do upload, tenta limpar o arquivo não utilizado. Falhas de limpeza mostram aviso, sem ocultar que o registro já foi salvo/excluído. Banco e Storage não oferecem uma transação única; em quedas de conexão, confira registros/objetos antes de repetir a operação ou efetuar limpeza pelo painel.

## Arquivos envolvidos

Criados:

- `src/pages/CoauthorsPage.tsx`, `src/pages/AdminCoauthorsPage.tsx`.
- `src/components/coauthors/BookCard.tsx`, `BookDetails.tsx`, `BookForm.tsx`, `AdminGate.tsx`.
- `src/components/ui/editorial-dialog.tsx`.
- `src/hooks/use-coauthor-books.ts`, `src/lib/coauthors.ts`, `src/lib/navigation.ts`, `src/types/coauthor.ts`.
- `src/styles/coauthors.css`, a migração SQL acima e este documento.
- `tests/coauthors.spec.ts`, `tests/integration/coauthors.spec.ts`.

Alterados: `src/Router.tsx`, `src/pages/AuthRoutes.tsx`, `src/components/ui/auth-section-1.tsx`, Header, MobileMenu, Footer, `README.md`, `SUPABASE.md`, `tests/editorial-motion.spec.ts` (espera pelo carregamento real da timeline) e `tests/integration/supabase.spec.ts` (o teste anterior do dashboard vazio usa o destino explícito). O site mantém suas seções existentes. Não foram adicionadas dependências.

## Validações e limites

Os testes locais exercitam o SDK real com HTTP interceptado. Cobrem página pública, filtro, estados de erro/vazio, modal/foco, autenticação/autorização, criação, upload, edição, encerramento e confirmação de exclusão. Esses testes não substituem a execução das políticas em PostgreSQL/Storage.

Sem acesso ao projeto remoto, a migração não foi aplicada e não há comprovação de gravação real nem de eficácia das políticas no ambiente implantado. Após aplicar, valide com três perfis: anônimo, usuário autenticado comum e administrador. Os dois primeiros devem ler somente obras abertas e receber negação ao tentar escrita, upload ou autoatribuição de permissões. O administrador deve conseguir todo o fluxo. Confira também timestamps, preservação de capas ao encerrar e proteção contra excluir arquivos compartilhados.

Comandos: `npm run build`, `npm run lint`, `npx playwright test --workers=2` e `npx playwright test --config playwright.integration.config.ts --workers=1`. Resultados executados são registrados na entrega desta etapa; não foram solicitadas auditorias extensivas.

Resultado executado: build/TypeScript e lint aprovados. Os 25 cenários da suíte principal tiveram aprovação em rodadas completas e direcionadas; as falhas iniciais nos saltos programáticos da timeline foram revalidadas após sincronizar seu carregamento. A suíte de integração concluiu seus dez cenários com aprovação. Capturas foram conferidas em desktop, tablet e mobile, incluindo página, diálogo e administração. Os livros/imagens usados nos testes são fixtures interceptadas e não foram cadastrados no aplicativo ou no Supabase remoto.
