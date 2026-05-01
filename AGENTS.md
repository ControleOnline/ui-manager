## Escopo
- `ui-manager` e o modulo administrativo do app para configuracoes operacionais, devices, integracoes e visoes amplas da empresa.
- As telas React em `src/react/pages` sao a referencia ativa deste modulo.

## Devices
- `DeviceDetailPage` e `PrinterDeviceDetailPage` sao os donos das configuracoes por device no `MANAGER`.
- Toda regra booleana ou normalizacao de `configs` de device deve nascer ou ser reutilizada de `@controleonline/ui-common/src/react/config/deviceConfigBootstrap`.
- Persistencia de configuracao de device deve continuar passando pelo store `device_config`, sem criar chamadas paralelas fora desse fluxo.
- A chave `pos-delivery-enabled` pertence a configuracao do device no `MANAGER` e controla se o detalhe operacional do pedido daquele equipamento mostra cliente, endereco e observacoes de entrega.

## Limites
- `ui-manager` configura a operacao, mas nao deve duplicar a UI operacional de `ui-orders`.
- `OrderHistoryPage` do `MANAGER` nao deve abrir `OrderDetails` com `kds=true`. Esse param pertence apenas a origens reais de `PPC`/KDS.
- Quando a configuracao alterar comportamento do `POS`, documente a regra tambem no `AGENTS.md` do modulo dono do fluxo operacional.
