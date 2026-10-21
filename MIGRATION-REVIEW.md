# Revisão da migration administrativa — 21/10/2026

Arquivo corrigido: `supabase/migrations/202610210001_administrative_dashboard.sql`.

Nota posterior: o frontend com imagens assinadas e a migration incremental que fecha INSERT público estão em [MELHORIAS-SEGURANCA-PERFORMANCE.md](MELHORIAS-SEGURANCA-PERFORMANCE.md). As afirmações abaixo sobre frontend inalterado e INSERT público descrevem somente a revisão SQL anterior.

Nenhum SQL foi executado no Supabase. Não houve acesso ao banco de produção. Nenhum arquivo do frontend ou de suas dependências foi alterado nesta revisão. Os testes foram executados exclusivamente em PostgreSQL/WASM local, com estruturas mínimas que representam Auth e Storage.

## Problemas encontrados e correções

| Problema identificado | Correção |
| --- | --- |
| O fallback consultava `coauthor_admins` sempre que faltava uma autorização centralizada, podendo restaurar acesso removido | Importação somente na primeira criação de `dashboard_members`. Sem fallback em consultas de autorização. Registros legados preservados |
| Administradores recebiam `true` para recursos desconhecidos e relatórios apareciam como escrita para alguns perfis | Lista fechada de seis recursos; parâmetros NULL negados; relatórios somente leitura. Editorial/atendimento exigem módulo autorizado e compatível com o perfil; visualizadores nunca escrevem |
| `is_coauthor_admin()` havia passado a significar permissão editorial de escrita | Função legada voltou a significar administrador. Políticas de coautorias/Storage concedem acesso editorial explicitamente por recurso |
| Apenas impedir alteração da própria conta não protegia contra exclusão direta, cascata do Auth, TRUNCATE e alterações concorrentes do último administrador | RPC verifica o último administrador. Triggers protegem UPDATE/DELETE/cascata e rejeitam TRUNCATE. Uma linha privada escrita serializa mudanças; em isolamento mais forte, concorrência conflitante deve gerar erro de serialização |
| Buckets públicos permitiam baixar capas de obras fechadas e imagens de rascunhos por URL, mesmo com RLS | Os três buckets ficam privados, mantendo IDs e nomes de objetos. RLS de leitura libera imagens referenciadas por obras abertas/conteúdo publicado; leitores autorizados podem ler o recurso privado do módulo. Remoção apenas de arquivos sem referências em qualquer versão |
| `ON CONFLICT DO NOTHING` não corrigia a visibilidade de buckets já existentes | Os dois buckets novos são atualizados para privados em caso de conflito; o bucket existente de coautorias também tem a visibilidade corrigida, sem movimentar objetos |
| Checks de arquivos sem referência eram sujeitos às linhas ocultadas pela RLS do chamador | Helpers com `SECURITY DEFINER` e `search_path=''` verificam todas as referências antes de autorizar remoção |
| A função ISBN aceitava texto formado somente por separadores; NULL e domínio de entrada não estavam tratados explicitamente | Validação de caracteres ASCII, limite de tamanho, prefixo 978/979 para ISBN-13 e checksum de ambos os formatos; X apenas na última posição do ISBN-10. Vazio significa campo opcional; NULL/separadores isolados são inválidos. Não verifica atribuição em registro editorial mundial |
| Funções substituídas poderiam conservar ACLs antigas; helpers herdavam EXECUTE público por padrão | Revogação explícita de PUBLIC, anon e authenticated antes dos grants mínimos. Trigger functions não são pontos de entrada públicos. Funções privilegiadas têm caminho de resolução fixado e referências qualificadas; proprietários API são rejeitados |
| REVOKE em tabela não removia grants antigos por coluna | Revogação de privilégios tanto na tabela quanto em todas as colunas, seguida de grants explícitos. Contatos: INSERT apenas dos quatro campos públicos; atendimento atualiza apenas status |
| Políticas permissivas preexistentes poderiam se combinar por OR e ampliar acesso | Políticas conhecidas são substituídas com justificativa. Políticas restritivas estabelecem o limite obrigatório por operação, inclusive no Storage, sem remover políticas desconhecidas. Políticas restritivas externas ainda podem reduzir acesso e precisam de inspeção em homologação |
| Membership não tinha atualização automática de `updated_at`; a migration anterior não era reaplicável | Triggers consistentes para as cinco tabelas, índices com IF NOT EXISTS, funções substituídas preservando assinaturas e políticas recriadas de forma controlada. Tabelas existentes não são recriadas |
| Ausência de pré-condições e validação de dados existentes | Checagem de dependências, tipos e NOT NULL; constraints nomeadas validadas em registros existentes; RLS, proprietários e privacidade checados antes do COMMIT. Incompatibilidade aborta a transação, sem corrigir/apagar dados silenciosamente |
| Relatórios aceitavam períodos NULL/infinitos | Datas finitas obrigatórias e fim posterior ao início; agregações continuam como SECURITY INVOKER, respeitando a RLS e os módulos de origem |

O arquivo corrigido não contém cercas Markdown, negrito, barras invertidas nem escapes de Markdown. Asteriscos em `count(*)` e operadores aritméticos são sintaxe SQL válida e foram mantidos. Expressões regulares usam `[.]` para o ponto literal, sem barras de escape.

## Matriz de permissões

`L` = leitura administrativa; `C/E/X` = criar, editar e excluir; `*` = somente se o módulo estiver explicitamente autorizado. Todos os acessos administrativos exigem membership ativo.

| Perfil | Coautorias | Catálogo | Conteúdo | Contatos | Relatórios | Usuários/permissões |
| --- | --- | --- | --- | --- | --- | --- |
| Administrador | L + C/E/X | L + C/E/X | L + C/E/X | L + atualizar status | L, fontes autorizadas | Listar e gerenciar outras contas |
| Editorial | L + C/E/X* | L + C/E/X* | L + C/E/X* | — | L*, somente fontes autorizadas | — |
| Atendimento | — | — | — | L + atualizar status* | L*, somente contatos autorizados | — |
| Visualizador | L* | L* | L* | L* | L*, somente fontes autorizadas | — |
| Autenticado sem permissão, revogado ou apenas legado sem membership central | Somente obras abertas | Somente publicados | Somente publicado | Pode enviar formulário, não lê contatos | — | — |
| Visitante anônimo | Somente obras abertas | Somente publicados | Somente publicado | Pode enviar formulário, não lê contatos | — | — |

Leitores administrativos autorizados de catálogo/conteúdo podem consultar também rascunhos desses módulos. Atualizar texto, endereço, e-mail ou excluir contatos não é permitido a nenhum papel da API; apenas o status de atendimento é atualizável. Os timestamps são mantidos pelo banco.

O administrador tem todos os recursos conhecidos pelo papel; os demais perfis precisam da lista explícita de módulos. A tabela valida que editorial e atendimento não recebam módulos incompatíveis. Nem administradores podem alterar a própria autorização pelo RPC ou remover o último administrador por DML comum.

## Storage e compatibilidade do frontend

IDs preservados: `coauthor-book-covers`, `catalog-book-covers` e `institutional-images`. O formato `usuario/livro-ou-grupo/arquivo.ext` permanece igual. Não há exclusão ou movimentação de arquivos. Uploads continuam com nomes novos; UPDATE/move/overwrite nos buckets administrados são bloqueados.

**Não publicar esta mudança isoladamente com o frontend atual.** Ele monta URLs com `getPublicUrl()`. Buckets privados exigem download autorizado ou URL assinada, mesmo quando o arquivo tem uma política de leitura pública por estar publicado. Conforme solicitado, essa adaptação do frontend não foi feita. A migration é a proposta para revisão; o rollout precisa coordenar a futura entrega de URLs.

A RLS libera SELECT de objetos publicados para anon/authenticated e arquivos privados somente para leitores administrativos do módulo. URLs assinadas futuras devem ter prazo curto: um arquivo anteriormente publicado e copiado ou uma URL ainda válida não se tornam secretos retroativamente. Esta migration não controla arquivos estáticos em `/images`, URLs externas, caches já existentes nem buckets de outros recursos.

Acesso a `storage.objects` nos testes representa autorização SQL, não uma verificação dos endpoints de download, emissão de assinaturas, MIME/bytes, CDN, limites de upload ou comportamento de cache do serviço real.

## Testes executados

Ferramenta: `@electric-sql/pglite`, instalada somente em `qa-results/sql-runtime`, sem alteração de `package.json` ou `package-lock.json`. O runner não lê `.env`, não usa rede para SQL e cria bancos locais em memória.

```powershell
npm install --prefix qa-results/sql-runtime --no-save --package-lock=false --ignore-scripts @electric-sql/pglite
node supabase/tests/run-local.mjs
node --check supabase/tests/run-local.mjs
```

Resultados:

- Pré-requisitos ausentes: erro esperado, sem aplicação parcial.
- Instalação sobre as duas migrations existentes: aprovada.
- Reaplicação: aprovada, sem perda dos registros de teste.
- Preservação de contatos e administradores legados: aprovada.
- Reaplicação após remoção central: não ressuscita autorização legada.
- Upgrade da migration anterior: aprovado, preservando catálogo e removendo grants indevidos por coluna.
- Esquema incompatível: erro esperado e rollback integral.
- **216 assertions SQL aprovadas**, incluindo os seis perfis, módulos não atribuídos, papéis revogados, recursos desconhecidos, ISBNs, constraints, contactos públicos, status/timestamp, CRUD editorial, diretório/RPC, último administrador, cascata do Auth, TRUNCATE e Storage público/privado. A mesma suíte passou também após o upgrade da versão anterior.
- Sintaxe JavaScript do runner: aprovada. Varredura da migration: sem escapes ou formatação Markdown.

Arquivos: `supabase/tests/dashboard_rls.sql`, `supabase/tests/run-local.mjs` e `supabase/tests/fixtures/dashboard_v1.sql`. A fixture contém a versão anterior exclusivamente para testar o upgrade: **não deve ser executada como migration**. Resultados locais: `qa-results/sql-runtime/results.json` e `assertions.json`.

Não foram executados build/lint/testes do frontend nesta tarefa, pois ele não foi alterado. Não houve validação no Supabase. O PGlite é uma única instância local: a proteção contra concorrência foi projetada com escrita serializada, mas testes com duas conexões, níveis de isolamento, timeout e deadlocks devem ser feitos em PostgreSQL/Supabase de homologação. Os limites operacionais do Auth/Storage e a configuração real do PostgREST também continuam pendentes.

## Execução futura no Supabase SQL Editor

1. Revisar esta migration e o impacto dos buckets privados. Preparar a adaptação futura de URLs antes de qualquer rollout que mantenha o site público operacional.
2. Selecionar um projeto **de homologação descartável**, com as migrations `202610200001_contact_submissions.sql` e `202610200002_coauthor_books.sql` já aplicadas. Não reaplicar essas duas migrations originais.
3. Inspecionar os objetos e permissões reais. A configuração desconhecida de produção não foi consultada. Se não houver administrador legado nem central, o responsável precisará cadastrar explicitamente a primeira conta administrativa existente no Auth por SQL/backend confiável; a migration não escolhe uma conta automaticamente.
4. Colar o conteúdo completo de `202610210001_administrative_dashboard.sql`, do `begin;` ao `commit;`, no SQL Editor com papel proprietário confiável. Não executar apenas uma seleção parcial. Aguardar a conclusão. Se houver erro, executar `rollback;` caso a sessão permaneça em transação abortada e revisar a causa antes de repetir.
5. A migration é reaplicável para o esquema esperado e também corrige a versão anterior do dashboard. Divergências de tipos, NOT NULL, dados inválidos ou permissões de DDL interrompem a execução. Não remover checks ou desativar RLS para contornar esses erros. Se a versão anterior já foi registrada por uma ferramenta de migrations, registrar a correção em uma nova versão de implantação após a revisão, em vez de esperar que a ferramenta reaplique um arquivo já marcado.
6. Executar o arquivo completo `supabase/tests/dashboard_rls.sql` somente em homologação descartável, como proprietário. Ele cria usuários de teste e helpers dentro de uma transação, relata resultados e termina com `rollback`. Não é um script de produção. Em caso de falha, dar rollback manual antes de continuar.
7. Testar com contas e JWTs reais: login, expiração/revogação, contatos públicos, CRUD conforme papel, Storage e entrega de imagens. Testar concorrência de administração com duas conexões e verificar políticas externas que possam reduzir acesso. Conferir também schema exposto do PostgREST e não expor `literare_private`.
8. Somente após revisão, homologação e autorização explícita, planejar execução em produção junto da adaptação de URLs. Nenhuma execução ou publicação foi realizada nesta tarefa.

Referências usadas: [Supabase: buckets públicos e privados](https://supabase.com/docs/guides/storage/buckets/fundamentals), [PostgreSQL: SECURITY DEFINER e privilégios de funções](https://www.postgresql.org/docs/current/sql-createfunction.html), [PostgreSQL: políticas permissivas e restritivas](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [PGlite: execução local de PostgreSQL](https://pglite.dev/docs/).
