import { useCallback, useEffect, useMemo, useState } from "react";
import { getActiveBrands } from "../services/brandService";
import { getDatabaseSummary } from "../services/dashboardService";
import { getActiveLayouts } from "../services/layoutService";
import { calculateLineTotal } from "../services/lineTotalService";
import {
  calculateProposalItem,
  type DraftProposalItem,
  toCreateProposalItemInput,
} from "../services/proposalItemService";
import { suggestNextProposalNumber } from "../services/proposalNumberService";
import {
  calculateProposalTotal,
  createProposal,
  getProposalById,
  getProposals,
} from "../services/proposalService";
import { getActivePricingRules } from "../services/pricingRuleService";
import { getAllSettings } from "../services/settingsService";
import type {
  AppSetting,
  Brand,
  CreateProposalItemInput,
  DashboardSummary,
  Layout,
  PricingRule,
  ProposalDetail,
  ProposalSummary,
} from "../types";

type View = "dashboard" | "new" | "list" | "detail";

const IVA_NOTE = "Aos valores apresentados acresce IVA a taxa legal em vigor.";

const initialSummary: DashboardSummary = {
  databaseInitialized: false,
  settingsCount: 0,
  brandsCount: 0,
  layoutsCount: 0,
  pricingRulesCount: 0,
};

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ProposalDetail | null>(null);
  const [statusText, setStatusText] = useState("A inicializar base local...");

  const refreshProposals = useCallback(() => {
    getProposals().then(setProposals).catch((error) => {
      setStatusText(error instanceof Error ? error.message : "Erro ao ler propostas.");
    });
  }, []);

  useEffect(() => {
    Promise.all([
      getDatabaseSummary(),
      getAllSettings(),
      getActiveBrands(),
      getActiveLayouts(),
      getActivePricingRules(),
      getProposals(),
    ])
      .then(([nextSummary, nextSettings, nextBrands, nextLayouts, nextRules, nextProposals]) => {
        setSummary(nextSummary);
        setSettings(nextSettings);
        setBrands(nextBrands);
        setLayouts(nextLayouts);
        setPricingRules(nextRules);
        setProposals(nextProposals);
        setStatusText(
          nextSummary.usingPreviewData
            ? "Pre-visualizacao web. A gravacao SQLite e a criacao real de pastas acontecem no Tauri."
            : "Base local inicializada.",
        );
      })
      .catch((error: unknown) => {
        setStatusText(error instanceof Error ? error.message : "Erro ao inicializar.");
      });
  }, []);

  const openDetail = useCallback((id: number) => {
    getProposalById(id).then((proposal) => {
      setSelectedProposal(proposal);
      setView("detail");
    });
  }, []);

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Navegacao principal">
        <button onClick={() => setView("dashboard")}>Dashboard</button>
        <button onClick={() => setView("new")}>Nova proposta</button>
        <button
          onClick={() => {
            refreshProposals();
            setView("list");
          }}
        >
          Propostas guardadas
        </button>
      </nav>

      {view === "dashboard" && (
        <DashboardView
          summary={summary}
          statusText={statusText}
          onNew={() => setView("new")}
          onList={() => {
            refreshProposals();
            setView("list");
          }}
        />
      )}

      {view === "new" && (
        <NewProposalView
          settings={settings}
          brands={brands}
          layouts={layouts}
          pricingRules={pricingRules}
          onCreated={(proposal) => {
            setSelectedProposal(proposal);
            refreshProposals();
            setView("detail");
          }}
        />
      )}

      {view === "list" && <ProposalListView proposals={proposals} onOpen={openDetail} />}

      {view === "detail" && selectedProposal && (
        <ProposalDetailView proposal={selectedProposal} />
      )}
    </main>
  );
}

function DashboardView({
  summary,
  statusText,
  onNew,
  onList,
}: {
  summary: DashboardSummary;
  statusText: string;
  onNew: () => void;
  onList: () => void;
}) {
  const calculation = useMemo(
    () =>
      calculateLineTotal(
        61.57,
        220,
      ),
    [],
  );

  return (
    <section className="dashboard">
      <header className="dashboardHeader">
        <p className="eyebrow">Local-first desktop app</p>
        <h1>Proposal Prompt Studio</h1>
        <p>{statusText}</p>
      </header>

      <dl className="metrics" aria-label="Dados carregados">
        <Metric label="Marcas carregadas" value={summary.brandsCount} />
        <Metric label="Layouts carregados" value={summary.layoutsCount} />
        <Metric label="Regras comerciais" value={summary.pricingRulesCount} />
      </dl>

      <section className="calculationPanel" aria-label="Teste de calculo">
        <h2>Teste de calculo</h2>
        <p>
          52,33 EUR / 0,85, com arredondamento comercial para cima ={" "}
          <strong>61.57 EUR</strong>
        </p>
        <p>61,57 EUR x 220 = {calculation.toFixed(2)} EUR</p>
      </section>

      <div className="actions">
        <button onClick={onNew}>Nova proposta</button>
        <button onClick={onList}>Propostas guardadas</button>
      </div>
    </section>
  );
}

function NewProposalView({
  settings,
  brands,
  layouts,
  pricingRules,
  onCreated,
}: {
  settings: AppSetting[];
  brands: Brand[];
  layouts: Layout[];
  pricingRules: PricingRule[];
  onCreated: (proposal: ProposalDetail) => void;
}) {
  const defaultRule = pricingRules.find((rule) => rule.code === "divide_by_0_85") ?? pricingRules[0];
  const defaultLayout = layouts.find((layout) => layout.isDefault) ?? layouts[0];
  const localWorkspacePath =
    settings.find((setting) => setting.key === "local_workspace_path")?.value ??
    "C:/ProposalPromptStudio";

  const [proposalNumber, setProposalNumber] = useState(() => suggestNextProposalNumber(settings));
  const [client, setClient] = useState("Hotelaria Lisboa");
  const [project, setProject] = useState("Projeto Hotelaria Lisboa");
  const [location, setLocation] = useState("Lisboa");
  const [proposalType, setProposalType] = useState("technical");
  const [layoutId, setLayoutId] = useState(defaultLayout?.id ?? 0);
  const [pricingRuleId, setPricingRuleId] = useState(defaultRule?.id ?? 0);
  const [validity, setValidity] = useState("30 dias");
  const [conditions, setConditions] = useState(IVA_NOTE);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftProposalItem[]>([]);
  const [message, setMessage] = useState("");
  const [draftItem, setDraftItem] = useState({
    brandId: brands[0]?.id ?? 0,
    optionGroup: "",
    reference: "F3121WLX8CR",
    description: "Artigo de teste",
    finish: "Cromado",
    quantity: 220,
    originalUnitPrice: 52.33,
    notes: "",
  });

  useEffect(() => {
    if (settings.length) setProposalNumber(suggestNextProposalNumber(settings));
  }, [settings]);

  const selectedRule = pricingRules.find((rule) => rule.id === pricingRuleId) ?? defaultRule;
  const subtotal = calculateProposalTotal(items);

  function addItem() {
    if (!selectedRule) return;
    const brand = brands.find((item) => item.id === draftItem.brandId);
    const item = calculateProposalItem(
      {
        brandId: brand?.id ?? null,
        brandNameSnapshot: brand?.displayName ?? brand?.name ?? "",
        optionGroup: draftItem.optionGroup,
        reference: draftItem.reference,
        description: draftItem.description,
        finish: draftItem.finish,
        quantity: Number(draftItem.quantity),
        originalUnitPrice: Number(draftItem.originalUnitPrice),
        pricingRuleId: selectedRule.id,
        pricingRuleCode: selectedRule.code,
        pricingRuleName: selectedRule.name,
        calculationFactor: selectedRule.factor,
        notes: draftItem.notes,
      },
      selectedRule,
    );
    setItems((current) => [...current, item]);
    setMessage("Linha adicionada e validada.");
  }

  function saveProposal() {
    const createItems: CreateProposalItemInput[] = items.map((item, index) =>
      toCreateProposalItemInput(item, index + 1),
    );
    createProposal({
      proposalNumber,
      title: `${client} - ${project}`,
      clientNameSnapshot: client,
      projectName: project,
      projectLocation: location,
      proposalDate: new Date().toISOString().slice(0, 10),
      language: "pt-PT",
      currency: "EUR",
      vatMode: "sem_iva",
      validityText: validity,
      commercialConditions: conditions,
      proposalType,
      layoutId,
      pricingRuleId,
      localWorkspacePath,
      totalAmount: calculateProposalTotal(createItems),
      notes,
      items: createItems,
    })
      .then(onCreated)
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Erro ao gravar proposta.");
      });
  }

  return (
    <section className="workspace">
      <header>
        <p className="eyebrow">Workflow</p>
        <h1>Nova proposta</h1>
      </header>

      <div className="formGrid">
        <label>Número da proposta<input value={proposalNumber} onChange={(event) => setProposalNumber(event.target.value)} /></label>
        <label>Cliente<input value={client} onChange={(event) => setClient(event.target.value)} /></label>
        <label>Projeto<input value={project} onChange={(event) => setProject(event.target.value)} /></label>
        <label>Local<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
        <label>Tipo de proposta<input value={proposalType} onChange={(event) => setProposalType(event.target.value)} /></label>
        <label>Layout<select value={layoutId} onChange={(event) => setLayoutId(Number(event.target.value))}>{layouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.name}</option>)}</select></label>
        <label>Regra comercial<select value={pricingRuleId} onChange={(event) => setPricingRuleId(Number(event.target.value))}>{pricingRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></label>
        <label>Validade<input value={validity} onChange={(event) => setValidity(event.target.value)} /></label>
      </div>

      <label className="wideLabel">Condições comerciais<textarea value={conditions} onChange={(event) => setConditions(event.target.value)} /></label>
      <label className="wideLabel">Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>

      <section className="sectionBand">
        <h2>Artigos</h2>
        <div className="formGrid">
          <label>Marca<select value={draftItem.brandId} onChange={(event) => setDraftItem({ ...draftItem, brandId: Number(event.target.value) })}>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.displayName ?? brand.name}</option>)}</select></label>
          <label>Grupo/opção<input value={draftItem.optionGroup} onChange={(event) => setDraftItem({ ...draftItem, optionGroup: event.target.value })} /></label>
          <label>Referência<input value={draftItem.reference} onChange={(event) => setDraftItem({ ...draftItem, reference: event.target.value })} /></label>
          <label>Descrição<input value={draftItem.description} onChange={(event) => setDraftItem({ ...draftItem, description: event.target.value })} /></label>
          <label>Acabamento<input value={draftItem.finish} onChange={(event) => setDraftItem({ ...draftItem, finish: event.target.value })} /></label>
          <label>Quantidade<input type="number" value={draftItem.quantity} onChange={(event) => setDraftItem({ ...draftItem, quantity: Number(event.target.value) })} /></label>
          <label>Preço original<input type="number" step="0.01" value={draftItem.originalUnitPrice} onChange={(event) => setDraftItem({ ...draftItem, originalUnitPrice: Number(event.target.value) })} /></label>
          <label>Observações<input value={draftItem.notes} onChange={(event) => setDraftItem({ ...draftItem, notes: event.target.value })} /></label>
        </div>
        <button onClick={addItem}>Adicionar linha</button>
      </section>

      <ItemsTable items={items} />
      <div className="reviewBar">
        <strong>Total: {subtotal.toFixed(2)} EUR</strong>
        <button onClick={saveProposal}>Guardar proposta</button>
      </div>
      {message && <p className="statusNote">{message}</p>}
    </section>
  );
}

function ProposalListView({
  proposals,
  onOpen,
}: {
  proposals: ProposalSummary[];
  onOpen: (id: number) => void;
}) {
  return (
    <section className="workspace">
      <header><p className="eyebrow">Arquivo local</p><h1>Propostas guardadas</h1></header>
      <table>
        <thead><tr><th>Número</th><th>Cliente</th><th>Projeto</th><th>Data</th><th>Estado</th><th>Total</th><th>Ações</th></tr></thead>
        <tbody>
          {proposals.map((proposal) => (
            <tr key={proposal.id}>
              <td>{proposal.proposalNumber}</td>
              <td>{proposal.clientNameSnapshot}</td>
              <td>{proposal.projectName}</td>
              <td>{proposal.proposalDate}</td>
              <td>{proposal.status}</td>
              <td>{proposal.totalAmount.toFixed(2)} EUR</td>
              <td><button onClick={() => onOpen(proposal.id)}>Abrir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ProposalDetailView({ proposal }: { proposal: ProposalDetail }) {
  return (
    <section className="workspace">
      <header><p className="eyebrow">Detalhe</p><h1>{proposal.proposalNumber}</h1></header>
      <dl className="detailGrid">
        <Metric label="Cliente" value={proposal.clientNameSnapshot ?? "-"} />
        <Metric label="Projeto" value={proposal.projectName ?? "-"} />
        <Metric label="Estado" value={proposal.status} />
        <Metric label="Total" value={`${proposal.totalAmount.toFixed(2)} EUR`} />
      </dl>
      <p><strong>Layout:</strong> {proposal.layoutName ?? proposal.layoutId ?? "-"}</p>
      <p><strong>Regra comercial:</strong> {proposal.pricingRuleName ?? proposal.pricingRuleId ?? "-"}</p>
      <p><strong>Pasta local:</strong> {proposal.localFolderPath ?? "-"}</p>
      <ItemsTable items={proposal.items} />
    </section>
  );
}

function ItemsTable({ items }: { items: Array<DraftProposalItem | { reference: string; description: string | null; quantity: number; finalUnitPrice: number; lineTotal: number; notes?: string | null }> }) {
  return (
    <table>
      <thead><tr><th>Referência</th><th>Descrição</th><th>Qtd.</th><th>Preço final</th><th>Total</th><th>Obs.</th></tr></thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.reference}-${index}`}>
            <td>{item.reference}</td>
            <td>{item.description}</td>
            <td>{item.quantity}</td>
            <td>{item.finalUnitPrice.toFixed(2)} EUR</td>
            <td>{item.lineTotal.toFixed(2)} EUR</td>
            <td>{item.notes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
