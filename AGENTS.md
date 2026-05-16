## Escopo
- `ui-manager` e o modulo administrativo do app para configuracoes operacionais, devices, integracoes e visoes amplas da empresa.
- As telas React em `src/react/pages` sao a referencia ativa deste modulo.

## Devices
- `DeviceDetailPage` e `PrinterDeviceDetailPage` sao os donos das configuracoes por device no `MANAGER`.
- Toda regra booleana ou normalizacao de `configs` de device deve nascer ou ser reutilizada de `@controleonline/ui-common/src/react/config/deviceConfigBootstrap`.
- Persistencia de configuracao de device deve continuar passando pelo store `device_config`, sem criar chamadas paralelas fora desse fluxo.
- A chave `pos-delivery-enabled` pertence a configuracao do device no `MANAGER` e controla se o detalhe operacional do pedido daquele equipamento mostra cliente, endereco e observacoes de entrega.
- Na listagem de devices, o subtitulo deve usar o mesmo identificador resolvido pelo runtime compartilhado: para web, priorizar o IP publico persistido em `device.metadata.network.publicIp`; para nativo, manter o identificador salvo em `device.device`.

## Limites
- `ui-manager` configura a operacao, mas nao deve duplicar a UI operacional de `ui-orders`.
- A tela React `OrderHistoryPage` pertence ao modulo `ui-orders`. O `MANAGER` pode navegar para ela, mas nao deve manter uma copia da tela em `ui-manager`.
- `OrderHistoryPage` do `MANAGER` nao deve abrir `OrderDetails` com `kds=true`. Esse param pertence apenas a origens reais de `PPC`/KDS.
- Quando a configuracao alterar comportamento do `POS`, documente a regra tambem no `AGENTS.md` do modulo dono do fluxo operacional.
- Em `Food99IntegrationPage`, a carteira de repasse da loja precisa ser escolhida na tela de integracao a partir das carteiras da empresa ativa e persistida como `settlement_wallet_id`; nao permitir selecao fora do contexto da empresa.
- Quando `Food99IntegrationPage` precisar cadastrar uma carteira nova para repasse, usar o store `wallet` com `people: '/people/<empresa ativa>'` e selecionar imediatamente a carteira criada no formulario, sem criar fluxo paralelo ou buscar carteiras fora da empresa ativa.

## Menus
- `MenuAccessConfigPage` e a tela administrativa para configurar menus por `APP_TYPE` e vinculos humanos de `people_link.link_type`; `client`, `provider` e `franchisee` sao comerciais e nao entram como perfis de menu.
- Essa tela e exclusiva de `ROLE_SUPER` e deve persistir alteracoes pelo endpoint `menu-config`.
