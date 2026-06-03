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
- A rota `/menu-costs-page/fornecedores` é a tela oficial de fornecedores da engenharia.
- Essa tela carrega os dados somente quando exibida e deve unificar fornecedores duplicados sem criar novo cadastro.
- Telefone e e-mail de fornecedor devem ser materializados dentro de `contacts`, nunca como campos diretos do fornecedor.
- Nesta fase, fornecedores nao devem escrever em `products` ou `components`; o fluxo e apenas de leitura, dedupe e enriquecimento do import.
