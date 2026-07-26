export const ADMIN_FLOWCHARTS = [
  {
    id: 'sales-production',
    title: 'Venda / produção',
    summary: 'Entrada do pedido, operação do POS, produção, entrega e caixa.',
    mermaid: `flowchart TD
  manager["ON MANAGER<br/>APP_TYPE=MANAGER"] --> setup["Configura empresa,<br/>usuários,<br/>devices e permissões"]
  pos["ON POS<br/>APP_TYPE=POS"] --> posProfile{"Perfil deste POS"}
  setup --> posProfile

  shop["SHOP<br/>APP_TYPE=SHOP"] --> customer["Compra do cliente"]
  customer --> operational["Pedidos operacionais"]

  posProfile --> totem["Totem"]
  totem --> selfService["Autoatendimento<br/>+ checkout"]
  selfService --> operational

  posProfile --> waiter["Garçom"]
  waiter --> salonOrders["Pedidos salão<br/>+ emissor clean"]
  salonOrders --> operational

  posProfile --> counter["Balcão"]
  counter --> pdvTracking["PDV + acompanhamento"]
  pdvTracking --> operational

  posProfile --> posGeneral["POS Geral"]
  posGeneral --> pdvOrders["PDV + Meus Pedidos<br/>Pedidos salão + Caixa"]
  pdvOrders --> operational
  posProfile --> cashier["Caixa"]

  customer --> ppc["ON PPC<br/>APP_TYPE=PPC"]
  ppc --> displayType{"Tipo de display"}
  displayType --> tv["TV de pedidos"]
  displayType --> kds["KDS/Cozinha"]

  operational --> status["Em análise → Em produção → Pronto"]
  displayType --> status

  status --> courierQueue["Fila e operação<br/>do entregador"]
  delivery["ON DELIVERY<br/>APP_TYPE=DELIVERY"] --> courierQueue
  status --> productionByProduct["Produção por produto"]
  status --> cashConsult["Caixa + consulta"]
  cashier --> cashConsult`,
    checkpoints: [
      'Manager configura empresa, usuários, devices e permissões.',
      'POS separa perfis de atendimento: totem, garçom, balcão, geral e caixa.',
      'Shop e POS alimentam pedidos operacionais.',
      'PPC lê os pedidos por tipo de display e controla a produção.',
      'Delivery acompanha fila do entregador; caixa consulta e fecha a operação.',
    ],
  },
];

