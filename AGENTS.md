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
