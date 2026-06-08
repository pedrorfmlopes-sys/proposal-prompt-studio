import { useEffect, useMemo, useState } from "react";
import { getDatabaseSummary } from "../services/dashboardService";
import { calculateFinalUnitPrice } from "../services/priceCalculationService";
import type { DashboardSummary } from "../types";

const initialSummary: DashboardSummary = {
  databaseInitialized: false,
  settingsCount: 0,
  brandsCount: 0,
  layoutsCount: 0,
  pricingRulesCount: 0,
};

export function App() {
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [statusText, setStatusText] = useState("A inicializar base local...");

  const calculation = useMemo(
    () =>
      calculateFinalUnitPrice({
        originalPrice: 52.33,
        ruleType: "divide",
        factor: 0.85,
        roundingMode: "ceil_2_decimals",
      }),
    [],
  );

  useEffect(() => {
    getDatabaseSummary()
      .then((nextSummary) => {
        setSummary(nextSummary);
        setStatusText(
          nextSummary.usingPreviewData
            ? "Pre-visualizacao web com dados seeded esperados."
            : nextSummary.databaseInitialized
              ? "Base local inicializada."
              : "Base local ainda nao inicializada.",
        );
      })
      .catch((error: unknown) => {
        setStatusText(
          error instanceof Error
            ? `Erro ao ler a base local: ${error.message}`
            : "Erro ao ler a base local.",
        );
      });
  }, []);

  return (
    <main className="shell">
      <section className="dashboard">
        <header className="dashboardHeader">
          <p className="eyebrow">Local-first desktop app</p>
          <h1>Proposal Prompt Studio</h1>
          <p>{statusText}</p>
        </header>

        <dl className="metrics" aria-label="Dados carregados">
          <div>
            <dt>Marcas carregadas</dt>
            <dd>{summary.brandsCount}</dd>
          </div>
          <div>
            <dt>Layouts carregados</dt>
            <dd>{summary.layoutsCount}</dd>
          </div>
          <div>
            <dt>Regras comerciais</dt>
            <dd>{summary.pricingRulesCount}</dd>
          </div>
        </dl>

        <section className="calculationPanel" aria-label="Teste de calculo">
          <h2>Teste de calculo</h2>
          <p>
            52,33 EUR / 0,85, com arredondamento comercial para cima ={" "}
            <strong>{calculation.finalUnitPrice.toFixed(2)} EUR</strong>
          </p>
        </section>
      </section>
    </main>
  );
}
