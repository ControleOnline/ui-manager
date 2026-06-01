# Auditoria de migracao - MenuCostsPage Gyros

Data: 2026-05-31

## Escopo

Esta auditoria orienta a migracao do PWA Gyros de Engenharia de Produtos e Processos para a rota `/menu-costs-page`.

Regra de isolamento:

- A implementacao visual e funcional deve afetar somente `src/react/pages/MenuCostsPage`.
- Outros modulos do ERP, como `ui-products`, `categories-page`, `ProductDetails`, `ProductGroups` e stores compartilhados, devem ser usados como contrato e fonte de leitura, nao alterados nesta fase.
- Nenhuma escrita em produto, custo, grupo, compra ou evidencia real deve acontecer antes de fechar o mapeamento e revisar impacto.

## Estado atual da migracao

A pagina React atual ja porta a estrutura inicial do PWA para o ERP, com dados locais vindos de `gyros-custos-cardapio.json`.

Coberto na primeira versao:

- Dashboard tecnico.
- Produtos de venda.
- Ingredientes.
- Preparos.
- Embalagens.
- Revenda.
- Compras e evidencias em leitura resumida.
- Processos em matriz resumida.
- Fornecedores.
- Pendencias.
- Parametros locais.
- Calculo de custo base, custo de grupos obrigatorios, margem e preco sugerido.
- Persistencia local por `AsyncStorage`.
- Exportacao JSON local.

Incremento de paridade local aplicado em 2026-05-31:

- Imagens do cardapio PWA copiadas para o escopo da `MenuCostsPage` e conectadas a produtos, categorias, recursos tecnicos e adicionais.
- Assets otimizados para uso no ERP local, reduzindo o pacote visual copiado de aproximadamente 96 MB para aproximadamente 13 MB.
- Export JSON completo mantido.
- Export ERP JSON local adicionado com produtos, componentes, adicionais, ingredientes, preparos, embalagens, compras, inputs e fornecedores.
- Export CSV ERP local adicionado para conferencia do catalogo.
- Import JSON local adicionado para restaurar ou testar uma base exportada sem tocar na API.
- Aba de Embalagens adicionada na ficha de Produto de venda.
- Ficha do produto passou a exibir imagem e resumo visual da publicacao/composicao.
- Tabela de custo ativo adicionada para ingredientes, preparos e embalagens, mantendo custo canonico, leitura de calculo, historico e auditoria separados.
- Ficha tecnica de ingrediente/preparo/embalagem passou a mostrar a decisao de custo ativo da Engenharia.
- Compras/evidencias passaram a ter agrupamento por familia comparavel, com historico, fornecedores, evidencias e ultima compra.
- Engenharia de Processos passou a abrir detalhe operacional do item selecionado, preservando compra, recebimento, estoque, manipulacao, porcao, uso, evidencia e componentes quando for preparo.

Lapidacao aplicada em 2026-05-31:

- Aba de Processos corrigida para nao depender de `requiredAddons`, campo inexistente no `computeProduct`; a contagem obrigatoria agora deriva dos adicionais calculados.
- Telas de Ingredientes, Preparos e Embalagens trocaram a tabela ampla inicial por resumo tecnico, deixando a decisao detalhada de custo dentro da ficha do item selecionado.
- Compras/evidencias trocaram a tabela gigante inicial por mapa compacto de familias comparaveis e detalhe mestre da compra selecionada.
- Matriz de Processos passou para leitura mestre-detalhe, reduzindo a sensacao de relatorio cru e mantendo as etapas operacionais separadas de custo tecnico.
- Layout mestre-detalhe agora pode quebrar linha em telas menores, evitando estouro horizontal nas leituras principais.

Ainda nao e uma integracao real com o catalogo do ERP. O estado atual e uma fotografia funcional do PWA dentro da tela do ERP.

## Inventario do PWA usado como fonte

Base local atual:

- Categorias: 11.
- Ingredientes: 71.
- Embalagens: 15.
- Preparos: 38.
- Produtos: 74.
- Produtos ativos/contados no catalogo: 40.
- Produtos com componentes: 74.
- Produtos com grupos/adicionais: 18.
- Linhas de adicionais/grupos: 249.
- Linhas obrigatorias ou com minimo: 105.
- Linhas opcionais: 144.
- Grupos distintos de adicionais: 20.
- Fornecedores: 68.
- Pedidos/compras: 99.
- Itens de compra: 387.
- Inputs/evidencias: 103.
- Gastos: 10.
- Custos fixos: 5.

Grupos de adicionais encontrados no PWA:

- Escolha seu queijo.
- Turbine seu Gyros.
- Adicionais.
- Deseja remover algo.
- Molhos extra a parte.
- Escolha seu Gyros.
- Escolha sua Bebida 350ml.
- Tempero da batata.
- Finalize seu combo.
- Gyros 1, Gyros 2, Gyros 3, Gyros 4.
- Tempero das batatas do combo.
- Escolha o tempero da sua Batata.
- Escolha a proteina.
- Escolha o queijo gratinado.
- Escolha sua proteina.
- Escolha o tempero.
- Proteina extra.

## Funcionalidades do PWA que nao podem ficar de fora

### Engenharia de Produtos

- Ficha rica de Produto de venda.
- Foto/imagem comercial do produto.
- Categoria comercial.
- Status de publicacao/contagem no cardapio.
- Preco de venda.
- Preco automatico sugerido.
- Margem.
- Custo direto.
- Custo com obrigatorios.
- Simulacao por iFood/canal.
- Componentes fixos.
- Embalagens.
- Grupos obrigatorios e opcionais.
- Quantidades editaveis por componente.
- Quantidades editaveis por adicional.
- Separacao entre custo absorvido e custo repassado.
- Aba de compras vinculadas.
- Aba de operacao/processo.

### Itens tecnicos

- Ingrediente, Preparo, Embalagem e Revenda separados por papel.
- Custo ativo canonico por kg, L ou un.
- Custo por g/ml apenas como detalhe de calculo.
- Rendimento em Preparos.
- Componentes em Preparos.
- Usos diretos e indiretos.
- Status de auditoria: comprovado, estimado, revisar, manual.
- Fonte do custo ativo.
- Historico resumido de compra na ficha.
- Atalho para compras/evidencias.

### Compras e evidencias

- Visao mestre auditavel.
- Pedido/nota/orcamento/comprovante.
- Fornecedor.
- Data.
- Status de pagamento.
- Linhas de compra.
- Vinculo de evidencias aos itens.
- Comparacao por familia de compra.
- Faixa historica.
- Distincao entre ultima compra e custo ativo.
- Inputs com arquivo, URL ou caminho.

### Processos

- Processo operacional separado de custo tecnico.
- Etapas de recebimento, armazenamento, manipulacao, porcao, uso e evidencia.
- Eventos operacionais quando existirem.
- Midia operacional quando existir.
- Mapa de uso em produtos/preparos.

### Exportacao e ponte ERP

- Export estruturado para ERP.
- Export catalogo/CSV.
- Linhas de produto, componentes, adicionais, preparos, saidas de preparos, compras, evidencias e eventos.
- Codigos/SKUs preservados.
- Campos que permitam reconciliar PWA e ERP sem duplicar cadastro.

## Contrato real do ERP observado

### Catalogo e categorias

Fonte atual de catalogo:

- Rota: `/categories-page/?store=category`.
- Componente: `ui-products/src/react/pages/Categories.js`.
- Store: `categories`.
- Endpoint: categorias via store default.
- Contextos: `products` e `supplies`.
- Empresa atual vem do store `people`.
- Imagens usam `productFiles`, `categoryFiles` ou relacoes equivalentes resolvidas por `resolveFileImageUrl`.

Conclusao:

- A `categories-page` e a fonte visual/comercial real atual do ERP.
- Ela deve ser lida como referencia para produto, categoria, imagem e publicacao.
- A `MenuCostsPage` nao deve copiar nem alterar o componente, apenas consumir o mesmo contrato quando a integracao read-only for feita.

### Produtos

Store real:

- Store: `products`.
- Endpoint: `products`.
- Campos relevantes observados: `id`, `sku`, `product`, `description`, `productUnit`, `queue`, `type`, `productCondition`, `price`, `featured`, `active`, `company`, `defaultOutInventory`, `defaultInInventory`, `extraData`.

Tipos reais usados no ERP:

- `product`.
- `manufactured`.
- `custom`.
- `service`.
- `component`.
- `feedstock`.
- `package`.

Leitura para migracao:

- Produto de venda do PWA deve reconciliar com `products` de tipo `product`, `manufactured` ou `custom`.
- Ingrediente do PWA deve reconciliar com `products` de tipo `feedstock`.
- Preparo do PWA tende a reconciliar com `products` de tipo `component` ou `manufactured`, conforme o uso real.
- Embalagem do PWA deve reconciliar com `products` de tipo `package`.
- Revenda do PWA deve reconciliar com produto comercial simples, normalmente `product`, sem ficha tecnica interna complexa.

### Grupos e adicionais

Stores reais:

- `product_group`: endpoint `product_groups`.
- `product_group_parent`: endpoint `product_group_parents`.
- `product_group_product`: endpoint `product_group_products`.
- `product_group_feedstock`: tambem usa `product_group_products`.

Campos confirmados em componente real:

- `product_group`: `id`, `company_id`, `product_group`, `price_calculation`, `required`, `minimum`, `maximum`, `active`, `show_in_display`, `group_order`.
- Associacao produto pai x grupo: `product_group_parent`.
- Itens do grupo: `product_group_product`.
- Tipos aceitos nos itens de grupo: `feedstock`, `component`, `package`.
- `showInParentQueue`/`show_product_group_in_queue` controlam leitura operacional, nao persistencia extra.

Conclusao:

- Grupo/adicional do PWA deve virar `product_group`.
- Vinculo do grupo ao produto de venda deve virar `product_group_parent`.
- Cada opcao/componente do grupo deve virar `product_group_product`.
- Obrigatoriedade, minimo e maximo ja existem no ERP.
- `priceCalculation` ja existe no ERP e deve receber `sum`, `average`, `biggest` ou `free`.
- O custo dos obrigatorios deve continuar calculado pela Engenharia antes de qualquer escrita em produto.

### Custo real de ficha no ERP

Hoje existe leitura de custo em:

- `productCosting.js`.
- `buildProductCostBreakdown`.
- `product_group_products` com `summary: pricing`.
- `extraData.pricing` em catalogo normalizado.

Campos de custo ja previstos em `extraData.pricing`:

- `source`.
- `syncMode`.
- `cost`.
- `costManual`.
- `markup`.
- `marginTarget`.
- `additionalPackagingCost`.
- `additionalDisposableCost`.
- `additionalOperationalCost`.
- `additionalLogisticsCost`.
- `lossPct`.
- `costOutdated`.
- `lastInventoryCost`.
- `channelPolicies`.
- `channelSimulations`.
- `costBreakdown.ingredientCost`.
- `costBreakdown.packagingCost`.
- `costBreakdown.disposableCost`.
- `costBreakdown.operationalCost`.
- `costBreakdown.logisticsCost`.
- `costBreakdown.lossCost`.
- `costBreakdown.mandatoryModifiersCost`.
- `costBreakdown.optionalModifiersPotentialCost`.
- `costBreakdown.totalUnitCost`.

Conclusao:

- A Engenharia pode produzir um snapshot de custo compatavel com `extraData.pricing`.
- A escrita desse snapshot nao deve ser feita ainda.
- Primeiro a tela deve mostrar diferencas entre custo calculado no PWA e custo real atual do ERP.

## Matriz de equivalencia PWA x ERP

| PWA | Papel | ERP real provavel | Observacao |
| --- | --- | --- | --- |
| `categories` | Categoria comercial | `categories` | Usar para reconciliar exibicao em `categories-page`. |
| `products` | Produto de venda/catalogo | `products` tipo `product`, `manufactured` ou `custom` | Fonte futura do custo calculado. |
| `products.components` | Ficha tecnica base | `product_group_products` sem grupo ou estrutura de ficha equivalente | Precisa validar contrato final antes de escrita. |
| `products.addons` | Grupos/opcoes/adicionais | `product_groups` + `product_group_parents` + `product_group_products` | Obrigatorio/min/max ja tem campo real. |
| `ingredients` | Ingrediente de compra/custo | `products` tipo `feedstock` | Nao misturar com Preparo ou Produto de venda. |
| `recipes` | Preparo/semiacabado | `products` tipo `component` ou `manufactured` | Deve manter rendimento e componentes. |
| `packaging` | Embalagem/descartavel | `products` tipo `package` | Impacta custo por canal/produto. |
| `suppliers` | Fornecedor | `people` fornecedor ou entidade comercial equivalente | Precisa mapear com cadastro real antes de escrita. |
| `purchaseOrders` | Pedido/nota/orcamento | `orders` tipo `purchase` | ERP ja consulta compras por `orderType: purchase`. |
| `purchaseItems` | Linhas da compra | `orderProducts` de pedido de compra ou recurso equivalente | Usado para historico e custo ativo. |
| `inputs` | Evidencia/anexo/input | Arquivos/anexos/documentos do ERP | Deve preservar vinculo auditavel. |
| `expenseEntries` | Gasto nao itemizado | Financeiro ou compra sem itemizacao | Nao deve virar ingrediente automaticamente. |
| `fixedCosts` | Custo fixo/alocacao | Financeiro/parametros de custo | Deve ficar separado da ficha direta. |
| `operationEvents` | Evento/processo operacional | Ainda sem contrato unico identificado nesta tela | Por enquanto manter local/read-only. |

## Lacunas da tela React atual

Funcionalidade parcial:

- Ficha de produto existe, mas ainda e mais resumida que o PWA.
- Grupos obrigatorios/opcionais aparecem e entram no custo, mas ainda nao tem a edicao rica original.
- Compras/evidencias ja aparecem com leitura por familia, mas ainda precisam da edicao rica e do painel amplo do PWA.
- Processos aparecem em matriz com detalhe operacional, mas ainda sem eventos/midias ricos.
- Exportacao JSON, ERP JSON e CSV ja existem localmente, mas ainda nao escrevem no ERP.

Funcionalidade ainda ausente ou insuficiente:

- Reconciliacao com produtos reais da API.
- Reconciliacao com categorias reais da API.
- Reconciliacao com grupos reais da API.
- Imagens vindas do ERP real.
- Edicao rapida de custo ativo por item.
- Edicao rica de componentes e adicionais no mesmo nivel do PWA.
- Ficha unica de Engenharia sem parecer que leitura e edicao sao registros diferentes.
- Export catalogo/CSV equivalente ao PWA.
- Ponte de diferencas entre PWA e ERP.

## Plano seguro antes de escrever no ERP

### Etapa 1 - Completar portabilidade local

Continuar dentro de `/menu-costs-page`, ainda com seed local, ate cobrir toda a experiencia do PWA:

- Ficha rica de produto.
- Ficha rica de ingrediente, preparo, embalagem e revenda.
- Tabela de custo ativo.
- Compras/evidencias mestre.
- Familias tecnicas.
- Processos detalhados.
- Export ERP/CSV.
- Imagens.

### Etapa 2 - Integracao read-only com ERP

Adicionar leitura sem escrita:

- Ler categorias reais.
- Ler produtos reais.
- Ler arquivos/imagens reais.
- Ler grupos reais.
- Ler itens de grupos reais.
- Ler compras reais quando possivel.

Exibir na `MenuCostsPage`:

- Item PWA correspondente no ERP.
- Produto sem correspondencia.
- Produto ERP sem engenharia.
- Categoria divergente.
- Grupo divergente.
- Obrigatorio/min/max divergente.
- Imagem disponivel no ERP.
- Custo ERP atual x custo calculado pela Engenharia.

### Etapa 3 - Matriz de impacto

Antes de qualquer escrita:

- Listar produtos afetados.
- Listar componentes afetados.
- Listar grupos afetados.
- Listar custos que mudariam.
- Listar campos ERP que seriam atualizados.
- Mostrar preview e exigir confirmacao humana.

### Etapa 4 - Escrita controlada

Somente depois:

- Atualizar snapshot de custo do produto.
- Atualizar `extraData.pricing` ou contrato oficial definido.
- Atualizar grupos/adicionais se autorizado.
- Nunca criar ingrediente/preparo/embalagem a partir de nome de nota sem revisao.

## Decisao atual

A migracao total ainda nao esta pronta para gravar em produto real.

Proximo passo recomendado:

1. Completar a portabilidade local das funcionalidades ricas do PWA.
2. Em seguida, criar modo read-only de reconciliacao com `categories-page`, `products`, `product_groups`, `product_group_products`, imagens e compras.
3. So depois abrir fluxo de escrita controlada para alimentar o Produto real.
