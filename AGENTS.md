## Escopo
- Modulo da visao `MANAGER`.
- Cobre gestao administrativa: devices, configurador, conexoes, integracoes, historico, hub financeiro e cadastros de administracao.

## Estado
- Este modulo tem implementacao ativa em `src/react` e deve constar em novos prompts.
- Se existir `src/vue`, ela e apenas legado e deve ser ignorada, salvo pedido explicito.

## Quando usar
- Prompts sobre `MANAGER`, administracao, devices, impressoras, configuracoes de empresa, integracoes e telas de gestao.

## Limites
- Fluxo operacional de venda e checkout pertence a `ui-orders`.
- Fluxo cliente-facing da loja online pertence a `ui-shop`.

## Regras
- Telas administrativas que limpam listas por ausencia de empresa selecionada devem fazer essa limpeza de forma idempotente, sem entrar em loop de efeito com o store.
- Configuracoes administrativas de `PDV` para atendimento por `tab/table` devem expor valores canonicos em ingles no codigo e usar traducao apenas nos labels visuais.
- O `MANAGER` e a fonte administrativa das configuracoes operacionais do `PDV`, inclusive das permissoes que definem se um device pode abrir e fechar `tab/table` ou apenas operar sobre atendimentos ja abertos.
- Fluxos administrativos de liquidacao, consolidacao ou pagamento de `tab/table` pertencem ao `MANAGER`, mesmo quando o `POS` estiver restrito a usar apenas atendimentos ja abertos.
