import type { ProposalDetail } from "../types";
import { calculateSubtotal, validateLineTotal } from "./lineTotalService";

const IVA_NOTE = "Aos valores apresentados acresce IVA a taxa legal em vigor.";

export function buildPromptTitle(proposal: ProposalDetail): string {
  return [
    "Prompt",
    proposal.proposalNumber,
    proposal.clientNameSnapshot,
    proposal.projectName,
  ]
    .filter(Boolean)
    .join(" - ");
}

export function generateStructuredPrompt(proposal: ProposalDetail): string {
  const subtotal = calculateSubtotal(proposal.items);
  const rulesText = buildRulesText(proposal);
  const itemRows = proposal.items.map((item) => {
    const ruleText = formatRule(item.calculationFactor);
    return [
      item.brandNameSnapshot ?? "",
      item.optionGroup ?? "",
      item.reference,
      item.description ?? "",
      item.finish ?? "",
      item.quantity,
      formatMoney(item.originalUnitPrice ?? 0),
      ruleText,
      formatMoney(item.finalUnitPrice),
      formatMoney(item.lineTotal),
      item.notes ?? "",
    ].join(" | ");
  });

  const lineValidations = proposal.items
    .map((item) => {
      const result = validateLineTotal(
        item.finalUnitPrice,
        item.quantity,
        item.lineTotal,
      );
      return `- ${item.reference}: ${result.isValid ? "OK" : "ERRO"} - ${formatMoney(item.finalUnitPrice)} x ${item.quantity} = ${formatMoney(result.expectedLineTotal)}`;
    })
    .join("\n");

  return `# Objetivo

Criar uma proposta comercial/técnica em português de Portugal, com estrutura clara, tabelas organizadas e valores devidamente validados.

# Contexto da proposta

- Número: ${proposal.proposalNumber}
- Título: ${proposal.title}
- Tipo: ${proposal.proposalType ?? "-"}
- Data: ${proposal.proposalDate}
- Idioma: ${proposal.language}
- Moeda: ${proposal.currency}
- Modo IVA: ${proposal.vatMode}
- Estado: ${proposal.status}

# Dados do cliente e projeto

- Cliente: ${proposal.clientNameSnapshot ?? "-"}
- Projeto: ${proposal.projectName ?? "-"}
- Local: ${proposal.projectLocation ?? "-"}
- Validade: ${proposal.validityText ?? "-"}
- Notas: ${proposal.notes ?? "-"}

# Layout a seguir

- Layout: ${proposal.layoutName ?? "-"}
- Layout ID: ${proposal.layoutId ?? "-"}
- Tipo de proposta: ${proposal.proposalType ?? "-"}

Seguir a estrutura do layout selecionado e organizar a proposta por marcas/opções quando aplicável.

# Condições comerciais

${proposal.commercialConditions || IVA_NOTE}

# Regras de cálculo aplicadas

${rulesText}

Não confundir multiplicar por 1,15 com dividir por 0,85. A regra de divisão por 0,85 usa arredondamento comercial para cima ao cêntimo quando o roundingMode é ceil_2_decimals.

# Artigos da proposta

Marca | Grupo/Opção | Referência | Descrição | Acabamento | Quantidade | Preço original | Regra/Fator | Preço final | Total da linha | Observações
--- | --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: | ---
${itemRows.join("\n")}

# Totais e validações

- Subtotal calculado: ${formatMoney(subtotal)} ${proposal.currency}
- Total da proposta: ${formatMoney(proposal.totalAmount)} ${proposal.currency}
- Validação do total geral: ${Math.abs(subtotal - proposal.totalAmount) <= 0.01 ? "OK" : "ERRO"}

Validações por linha:

${lineValidations}

Confirmar novamente que:

- line_total = final_unit_price × quantity
- proposal_total = soma dos line_total

# Instruções de preservação de layout

- Não alterar a estrutura visual definida.
- Não redesenhar tabelas sem necessidade.
- Manter a organização por marca/opção.
- Não inventar produtos, links, imagens ou fichas técnicas.
- Não alterar preços, quantidades ou totais.

# Notas obrigatórias

- ${IVA_NOTE}
- Fichas técnicas, imagens e links devem ser confirmados por referência oficial.

# Resultado pretendido

Criar texto de proposta pronto a converter para documento comercial. Usar português de Portugal, tom profissional, claro e comercial, e incluir tabelas organizadas.

# Validações antes de terminar

1. Todos os artigos estão incluídos.
2. Todos os preços finais respeitam a regra definida.
3. Todos os totais de linha estão corretos.
4. O total geral corresponde à soma das linhas.
5. A nota de IVA está presente.
6. Não foram inventadas referências, imagens ou links.
7. O layout e estrutura foram respeitados.`;
}

function buildRulesText(proposal: ProposalDetail): string {
  const factor = proposal.pricingRuleFactor ?? proposal.items[0]?.calculationFactor ?? null;
  const roundingMode = proposal.pricingRuleRoundingMode ?? "ceil_2_decimals";
  return [
    `- Regra: ${proposal.pricingRuleName ?? "-"}`,
    `- Código: ${proposal.pricingRuleCode ?? "-"}`,
    `- ID: ${proposal.pricingRuleId ?? "-"}`,
    `- Fator: ${factor ?? "-"}`,
    `- roundingMode: ${roundingMode}`,
  ].join("\n");
}

function formatRule(factor: number | null | undefined): string {
  return factor ? `÷ ${factor}` : "-";
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}
