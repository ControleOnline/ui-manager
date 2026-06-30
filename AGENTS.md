# ui-manager

## Escopo
- Módulo de telas e fluxos do Manager.
- As páginas devem continuar pequenas e separadas por responsabilidade.
- Quando uma seção da `MenuCostsPage` precisar de URL própria ou ciclo próprio de carregamento, ela deve virar rota dedicada dentro deste módulo.

## Regras atuais
- A rota `/menu-costs-page/parametros` é a tela oficial de parâmetros da engenharia.
- Essa tela lê e grava apenas `configs` da empresa selecionada.
- `MenuCostsPage` deve navegar para essa rota quando o usuário tocar em `Parâmetros`.
- Nesta fase, não mexer em produtos de venda nem em componentes de produto para resolver parâmetros da engenharia.
- As imagens da `MenuCostsPage` e das rotas derivadas devem vir do banco via `productFiles`/`categoryFiles` e `resolveFileImageUrl`; os assets locais do módulo nao devem ser usados como fonte visual.
- Em `Produtos de venda`, a leitura do cardapio deve respeitar `category.parent`, preservar os vinculos multiplos de `product_category` e posicionar o produto na categoria folha mais especifica sem duplica-lo no ancestral.
- Categorias, produtos configuraveis, grupos comerciais e natureza operacional de custo sao dimensoes diferentes. A interface pode simplificar os nomes, mas nao deve fundir esses contratos.
- Preparos mencionados em produtos podem ser sugeridos como vinculos pendentes, mas nunca devem ser persistidos automaticamente sem quantidade e confirmacao do usuario.
- A arvore tecnica auditavel da `MenuCostsPage` e um modelo local somente leitura que consolida composicao fixa, preparos aninhados, embalagens, produtos vinculados, grupos, opcoes e sugestoes sem reclassificar ou persistir registros automaticamente.
- A aba `Composicao` deve renderizar uma unica lista de pecas tecnicas. Rascunho e ERP sao estados de origem da mesma peca, nunca fichas paralelas; cada linha combina tipo, cadastro, custo ativo herdado, quantidade da ficha e custo calculado.
- Na composicao, custos pertencem exclusivamente ao cadastro de `Ingredientes` ou `Preparos`. A quantidade pertence ao vinculo com o produto e pode ser editada sem criar custo local paralelo.
- O papel tecnico exibido pela engenharia pode ser corrigido localmente por empresa sem alterar o `type` oficial do produto no ERP. Essa classificacao deve mover o item entre Composicao, Preparos, Embalagens e Revenda, preservando o ID e o tipo original para auditoria.
- Vinculos de componentes devem resolver nome, codigo e unidade pelo ID original do produto, inclusive quando o carregamento de ingredientes ou embalagens tiver deduplicado varios IDs em um cadastro mestre.
- Quando o componente trouxer somente o ID, a `MenuCostsPage` deve hidratar sua identidade pelo store `products`: nome fica na identificacao, ID/SKU fica na coluna de codigo e nenhum custo pode ser inferido desse cadastro isolado.
- Cada no tecnico deve preservar o vinculo ERP, papel operacional, quantidade, unidade, custo, caminho na arvore, estado de auditoria e pendencias. Descricao comercial e PWA antigo podem gerar sugestoes, nunca confirmacoes silenciosas.
- Rascunhos tecnicos locais devem ficar isolados por empresa em storage injetado e nunca escrever na API automaticamente.
- Composicao fixa local aceita somente ingredientes e preparos. Embalagens, revenda e grupos comerciais usam colecoes e vinculos separados.
- Componentes de receita pertencem ao preparo e usam um vinculo proprio, sem reutilizar a composicao fixa do produto de venda.
- Opcoes de grupos comerciais podem referenciar produto de venda, ingrediente, preparo, embalagem ou revenda, preservando explicitamente o tipo de cada alvo.
- A leitura combinada deve coletar ERP e rascunhos locais sem sobrescrever o registro oficial. Vinculos de tipo duvidoso ficam explicitamente nao resolvidos para revisao.
- A migracao temporaria do PWA antigo e exclusiva da empresa Gyros, idempotente e limitada a entidades tecnicas, receitas, composicao fixa e embalagens. Grupos e adicionais continuam vindo apenas do ERP atual.
- Dados migrados do PWA devem aparecer como rascunho local e nunca participar do custo oficial antes de cadastro ou vinculo confirmado no ERP.
- A rota `/menu-costs-page/fornecedores` é a tela oficial de fornecedores da engenharia.
- Essa tela carrega os dados do `people` com `link.linkType=provider` somente quando exibida e deve unificar fornecedores duplicados sem criar novo cadastro.
- A normalizacao e unificacao de fornecedores deve ficar em `ui-people`; o lookup de ultimas compras deve ficar em `ui-products`; `ui-manager` deve apenas orquestrar a rota e a apresentacao.
- Telefone e e-mail de fornecedor devem ser materializados dentro de `contacts`, nunca como campos diretos do fornecedor.
- Nesta fase, fornecedores nao devem escrever em `products` ou `components`; o fluxo e apenas de leitura, dedupe e enriquecimento do import.
- A rota `/menu-costs-page/ingredientes` é a tela oficial de ingredientes da engenharia.
- Essa tela e a sua listagem real vivem em `ui-products`, que carrega o recorte de `products` do tipo `feedstock` quando a rota ganha foco.
- O cadastro de ingredientes deve sinalizar duplicidade por codigo ou nome antes de gravar, para nao criar feedstock repetido.
- A escrita continua restrita a insumos; nada de produto de venda ou componente nessa rota.
- A rota `/menu-costs-page/revenda` é a tela oficial de revenda da engenharia.
- Essa tela usa a classificacao operacional local da `MenuCostsPage` para concentrar bebidas prontas de revenda, inclusive quando o ERP ainda as traz como `feedstock`.
- A classificacao local deve ficar em `src/react/pages/MenuCostsPage/domain` e nao deve alterar o tipo gravado no banco.
- `manufactured`, `component`, `package`, `preparation`, `custom` e `service` nao entram no recorte de revenda.
- A rota `/menu-costs-page/compras-e-evidencias` é a tela oficial de compras e evidencias da engenharia.
- Essa tela carrega apenas pedidos do ERP com `orderType=purchase`, usando `orders` para a listagem e `order_file`/`files` para evidencias e anexos.
- A experiencia especifica do mapa de compras da engenharia deve ficar neste modulo; `ui-orders` deve fornecer apenas componentes e utilitarios canonicos de pedido/anexo quando necessario.
- O seed JSON nao deve ser usado como fonte dessa tela.
- A aba `Motor de custo` da `MenuCostsPage` e a leitura explicativa/editavel da regra atual de precificacao da engenharia.
- `Motor de custo` deve ler e gravar o contrato oficial em `configs` da empresa selecionada, pela chave `menu-costs-cost-engine-rules`, mantendo `settings.costEngineRules` apenas como compatibilidade/cache local da rota.
- As regras devem explicar e simular custo tecnico, markup, margem, taxas, comissao, repasse, arredondamento, CMV e rateio fixo gerencial sem alterar produto, pedido, catalogo ou canais globais fora da engenharia.
