# Referência da Plataforma Bling v3

> **REGRA:** Antes de qualquer alteração no código que toque no Bling, consulte este arquivo E verifique se há atualizações na API em https://developer.bling.com.br/referencia. A Bling tem histórico de mudanças de nomenclatura que causam erros silenciosos.

---

## Autenticação

- **Tipo:** OAuth2 (Authorization Code Flow)
- **Token URL:** `https://www.bling.com.br/Api/v3/oauth/token`
- **Credenciais:** `Basic base64(BLING_CLIENT_ID:BLING_CLIENT_SECRET)`
- **Armazenamento:** tokens salvos na tabela `bling_tokens` do Supabase (id=1)
- **Expiração:** access_token expira em ~6h; refresh_token renovado automaticamente em `lib/bling/auth.ts`
- **Reconexão:** se refresh falhar, acessar `/admin/config` → Reconectar Bling

---

## Env Vars

| Variável | Descrição |
|---|---|
| `BLING_CLIENT_ID` | ID do app OAuth2 no portal Bling |
| `BLING_CLIENT_SECRET` | Secret do app OAuth2 |
| `BLING_REDIRECT_URI` | Deve ser `https://editorajocum.com.br/api/bling/callback` em produção |
| `BLING_WEBHOOK_SECRET` | Valida requisições do webhook Bling |
| `BLING_PAYMENT_FORM_PIX` | ID da forma de pagamento PIX no Bling (fixo, evita descoberta via API) |
| `BLING_CONDICAO_PAGAMENTO_ID` | ID da condição de pagamento padrão |
| `BLING_COMPANY_UF` | UF da empresa emissora (PR) — usado para determinar CFOP |
| `BLING_NATUREZA_OPERACAO_ID` | ID da natureza de operação padrão (Venda de mercadorias) |
| `BLING_CATEGORIA_LIVROS_ID` | ID da categoria de produtos "Livros" |
| `BLING_TRANSPORTADORA_CORREIOS_ID` | ID do contato AGENCIA DE CORREIOS FRANQUEADA SAO LOURENCO (ID: 10262380010) |

---

## Fluxo de Pedido + NF-e

```
Pagamento confirmado
  → pushOrderToBling(orderId)           [lib/bling/sync.ts]
      → findOrCreateBlingContact()       cria/atualiza contato do cliente
      → getBlingProductBySku()           vincula produto existente ou usa código livre
      → POST /pedidos/vendas             cria pedido (salva bling_order_id no Supabase)
      → POST /pedidos/vendas/{id}/gerar-nfe   Bling gera NF-e a partir do pedido
      → POST /nfe/{id}/enviar            transmite ao SEFAZ
      → GET /nfe/{id}                    busca chave de acesso e link DANFE
      → salva invoice_number + invoice_url no pedido
```

**Importante:** `gerar-nfe` herda do pedido: itens, contato, fretePorConta, transportador, etiqueta. Mas **NÃO herda `transporte.frete` (valor monetário)**. Por isso usamos `POST /nfe` diretamente com frete explícito. O pedido continua sendo criado antes para vincular a NF-e via `pedido: { id }`.

> **Confirmado em 2026-07-23:** GET /nfe/{id} retorna `frete: null` em NF-es geradas via `gerar-nfe` mesmo quando o pedido tem `frete: 18.08`. Valor só aparece quando enviado explicitamente via `POST /nfe`.

---

## Transporte — Campos Críticos

### fretePorConta (SEFAZ modalidadeFrete)

| Valor | Significado | Efeito na NF-e |
|---|---|---|
| `0` | Remetente/CIF | frete aparece como `vFrete` no XML SEFAZ |
| `1` | Destinatário/FOB | Bling zera o `vFrete` na NF-e |
| `2` | Terceiros | frete aparece como `vOutro` |
| `9` | Sem frete | sem informação de transporte |

**Usar `0` (CIF) para vendas da Editora Jocum** — o frete é pago pelo remetente e deve aparecer na NF-e.

### volumes[]

```typescript
{
  id: 0,              // sempre 0 para criação
  servico: "PAC",     // "PAC" | "SEDEX" | "SEDEX 10"
  especie: "Volumes", // aparece no DANFE em "Espécie" — neutro, válido para caixa ou envelope
  quantidade: 1,
  codigoRastreamento?: string,  // código de rastreio Correios
}
```

### contato (transportadora)

O campo correto no Bling v3 é `transporte.contato`, **NÃO** `transporte.transportadora` (esse campo não existe).
O ID é o ID interno do contato no Bling (visível na URL: `/contatos.php#edit/{id}`).

---

## PUT Seguro (safePatch)

Quando alterar um produto via PUT, remover sempre antes de enviar:
```
delete product.id
delete product.estoque
delete product.imagens
delete product.dataCriacao
delete product.dataAlteracao
```
Esses campos são somente-leitura e causam erro se enviados.

**Nunca** usar PUT parcial no Bling — ele substitui o objeto inteiro, apagando campos não enviados (incidente `grupoProduto`/CFOP em 2026-07-14).

---

## NF-e — Diferenças Pedido vs NF-e

| Campo | Pedido | NF-e direta (createBlingNfe) |
|---|---|---|
| Vencimento parcela | `dataVencimento` | `data` |
| Forma pagamento | `formaPagamento` (array) | `formaPagamento` (singular) |
| Tipo | não existe | `tipo: 1` (NF-e saída) |
| Finalidade | não existe | `finalidade: 1` (normal) |
| Indicador presença | não existe | `indicadorPresenca: 2` (operação não presencial) |

---

## Endpoints Úteis para Debug

```
GET  /api/bling/diagnostics               lista formas de pagamento disponíveis
GET  /api/admin/bling-debug?id=<id>       busca pedido por ID no Bling
GET  /api/admin/bling-debug?id=<id>&tipo=nfe   busca NF-e por ID
```

---

## Webhooks Recebidos

| Evento Bling | Handler | Ação |
|---|---|---|
| `estoque` / `produto` | `/api/bling-webhook` | Atualiza `books.stock` |
| `notafiscal` | `/api/bling-webhook` | Salva `invoice_number` + `invoice_url` |

---

## CFOP

| Situação | CFOP |
|---|---|
| Venda intra-estadual (PR→PR) | 5.101 |
| Venda inter-estadual | 6.107 |

O CFOP é definido pela natureza de operação configurada no Bling, não pelo código. O campo `BLING_COMPANY_UF=PR` é usado no sync para comparar com o UF do destinatário e definir o CFOP correto.
