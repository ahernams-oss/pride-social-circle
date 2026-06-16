## Visão geral

O **VoteFlow Suite** é um sistema eleitoral institucional bem mais robusto do que o módulo atual de Votações deste projeto. Ele trabalha com **delegados credenciados** (titular/suplente/nato), **comissão eleitoral**, **códigos de acesso**, **kiosk presencial**, **votação remota** e **auditoria detalhada** — focado em eleições oficiais de Distrito (Governador, 1º e 2º Vice-Governador).

Como ele usa esquema, telas e fluxos completamente diferentes do módulo simples que existe hoje (`elections`, `election_candidates`, `election_ballots`), faz mais sentido **portar como módulo paralelo** ("Eleições Oficiais") em vez de tentar fundir nos modelos atuais.

## Escopo do port

### Banco de dados (nova migration)
Tabelas novas (prefixo mantido em português para preservar o domínio do VoteFlow):
- `vf_eleicao`, `vf_candidatura`, `vf_delegado`, `vf_comissao_eleitoral`, `vf_voto`
- `vf_log_auditoria`
- Enums: `vf_status_eleicao`, `vf_cargo_eleitoral`, `vf_status_candidatura`, `vf_tipo_delegado`, `vf_funcao_comissao`, `vf_tipo_voto`
- RLS: leitura para autenticados; gestão para admins (reaproveita `has_role(... ,'admin')` existente)
- Política de `INSERT` de voto exige delegado habilitado e que ainda não votou
- Reusa `profiles` como "associado" via FK por `user_id`, em vez de duplicar cadastro de membros

### Telas (rotas TanStack novas, em `/eleicoes-oficiais/*`)
- `eleicoes-oficiais.tsx` — listagem + criação (admin) com fases: configurando → credenciamento → votação aberta → encerrada → apurada
- `eleicoes-oficiais.$id.tsx` — detalhe da eleição: abas Candidaturas, Delegados, Comissão, Apuração
- `eleicoes-oficiais.$id.candidatos.tsx` — CRUD candidaturas (cargo eleitoral por chapa)
- `eleicoes-oficiais.$id.delegados.tsx` — credenciamento, geração de **código de acesso** por delegado, marcação presente / habilitado / suplente acionado
- `eleicoes-oficiais.$id.apuracao.tsx` — apuração em tempo real (Realtime na tabela `vf_voto`)
- `votar.tsx` — votação remota: delegado entra com seu código de acesso, vota uma vez
- `kiosk-eleicao.tsx` — kiosk presencial admin-only: cada delegado se autentica com código, vota, sistema libera próximo
- `auditoria-eleicao.tsx` — log de auditoria (admin)

### Integração
- Itens no menu lateral (admin): "Eleições Oficiais", "Auditoria"
- Item público para delegado credenciado: "Votar" (aparece se houver eleição aberta e delegado habilitado vinculado ao usuário)
- O módulo simples atual de Votações continua existindo para enquetes/referendos internos rápidos

## Fora do escopo (não vou portar agora)
- Distrito Múltiplo / Distrito / Clube como entidades novas — o projeto já tem `clubs`
- Associados, Mensalidades, Contas a Pagar/Receber, Patrimônio, Eventos, Fornecedores, Relatórios financeiros, Cargos/Mandatos institucionais
- Página de Estrutura organizacional

Se você quiser depois, dá pra trazer esses módulos em outra rodada.

## Como vou executar
1. Criar a migration com as tabelas, enums, RLS e GRANTs
2. Após a migration aprovada e tipos regenerados, criar as rotas TanStack e componentes (React Query + Suspense, padrão do projeto)
3. Adicionar links no `_app.tsx` (admin-only onde necessário)
4. Verificar build e fluxo básico no preview

## Pontos de decisão antes de eu codar

1. **Vínculo delegado ↔ usuário do app**: usar `profiles.id` (auth user) como "associado" do VoteFlow, ok? Isso evita duplicar cadastros.
2. **Cargos**: manter o enum original (`governador`, `1o_vice_governador`, `2o_vice_governador`) ou deixar livre via texto para o admin definir os cargos da eleição?
3. **Distrito**: o VoteFlow exige `distrito_id` por eleição. O projeto atual não tem entidade Distrito. Posso (a) criar uma tabela `distritos` mínima, ou (b) tornar o campo opcional/texto livre na eleição. Qual prefere?
