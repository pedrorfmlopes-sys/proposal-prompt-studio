import { useCallback, useEffect, useMemo, useState } from "react";
import { getActiveBrands } from "../services/brandService";
import { getDatabaseSummary } from "../services/dashboardService";
import { getActiveLayouts } from "../services/layoutService";
import { calculateLineTotal, validateLineTotal } from "../services/lineTotalService";
import { calculateFinalUnitPrice } from "../services/priceCalculationService";
import {
  calculateProposalItem,
  type DraftProposalItem,
  toCreateProposalItemInput,
} from "../services/proposalItemService";
import { suggestNextProposalNumber } from "../services/proposalNumberService";
import {
  calculateProposalTotal,
  createProposal,
  deleteProposalItem,
  duplicateProposal,
  getProposalById,
  getProposals,
  updateProposal,
  updateProposalItem,
} from "../services/proposalService";
import { getActivePricingRules } from "../services/pricingRuleService";
import {
  copyPromptToClipboard,
  generateProposalPrompt,
  getLatestPromptRun,
  getPromptRuns,
} from "../services/promptRunService";
import { exportPromptRun } from "../services/promptExportService";
import {
  getFinalDocuments,
  removeFinalDocumentRecord,
  registerFinalDocument,
  updateFinalDocumentVersion,
} from "../services/finalDocumentService";
import {
  openFinalDocumentsFolder,
  openPath,
  openProposalFolder,
  pickFinalDocumentFile,
} from "../services/fileDialogService";
import { getAllSettings } from "../services/settingsService";
import type {
  AppSetting,
  Brand,
  CreateProposalItemInput,
  DashboardSummary,
  Layout,
  PricingRule,
  FinalDocument,
  ProposalDetail,
  ProposalItem,
  ProposalSummary,
  PromptOutputMode,
  PromptRunDetail,
  UpdateProposalInput,
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
        <ProposalDetailView
          proposal={selectedProposal}
          brands={brands}
          layouts={layouts}
          pricingRules={pricingRules}
          onChanged={(proposal) => {
            setSelectedProposal(proposal);
            refreshProposals();
          }}
          onDuplicated={(proposal) => {
            setSelectedProposal(proposal);
            refreshProposals();
            setView("detail");
          }}
        />
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
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [location, setLocation] = useState("");
  const [proposalType, setProposalType] = useState("technical");
  const [layoutId, setLayoutId] = useState(defaultLayout?.id ?? 0);
  const [pricingRuleId, setPricingRuleId] = useState(defaultRule?.id ?? 0);
  const [validity, setValidity] = useState("30 dias");
  const [conditions, setConditions] = useState(IVA_NOTE);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftProposalItem[]>([]);
  const [message, setMessage] = useState("");
  const [draftItem, setDraftItem] = useState({
    brandId: 0,
    optionGroup: "",
    reference: "",
    description: "",
    finish: "",
    quantity: 1,
    originalUnitPrice: 0,
    notes: "",
  });

  useEffect(() => {
    if (settings.length) setProposalNumber(suggestNextProposalNumber(settings));
  }, [settings]);

  useEffect(() => {
    if (!layoutId && defaultLayout) setLayoutId(defaultLayout.id);
  }, [defaultLayout, layoutId]);

  useEffect(() => {
    if (!pricingRuleId && defaultRule) setPricingRuleId(defaultRule.id);
  }, [defaultRule, pricingRuleId]);

  const selectedRule = pricingRules.find((rule) => rule.id === pricingRuleId) ?? defaultRule;
  const subtotal = calculateProposalTotal(items);

  function addItem() {
    const validationMessage = validateDraftItem();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }
    if (!selectedRule) {
      setMessage("Seleciona uma regra comercial antes de adicionar a linha.");
      return;
    }
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

  function validateDraftItem(): string {
    if (!draftItem.brandId) return "Seleciona uma marca antes de adicionar a linha.";
    if (!draftItem.reference.trim()) return "Indica a referencia do artigo.";
    if (!draftItem.description.trim()) return "Indica a descricao do artigo.";
    if (Number(draftItem.quantity) <= 0) return "A quantidade deve ser superior a zero.";
    if (Number(draftItem.originalUnitPrice) < 0) return "O preco original nao pode ser negativo.";
    if (!selectedRule) return "Seleciona uma regra comercial antes de adicionar a linha.";
    return "";
  }

  function loadFimaExample() {
    const fimaBrand = brands.find((brand) => {
      const name = `${brand.displayName ?? ""} ${brand.name}`.toLowerCase();
      return name.includes("fima");
    });
    const divideRule = pricingRules.find((rule) => rule.code === "divide_by_0_85") ?? defaultRule;
    if (!fimaBrand || !divideRule) {
      setMessage("Nao foi possivel carregar o exemplo FIMA porque faltam marca ou regra comercial.");
      return;
    }
    setPricingRuleId(divideRule.id);
    setDraftItem({
      brandId: fimaBrand.id,
      optionGroup: "",
      reference: "F3121WLX8CR",
      description: "Misturadora",
      finish: "Cromado",
      quantity: 220,
      originalUnitPrice: 52.33,
      notes: "",
    });
    setMessage("Exemplo FIMA carregado. Revê os dados antes de adicionar a linha.");
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
          <label>Marca<select value={draftItem.brandId} onChange={(event) => setDraftItem({ ...draftItem, brandId: Number(event.target.value) })}><option value={0}>Selecionar marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.displayName ?? brand.name}</option>)}</select></label>
          <label>Grupo/opção<input value={draftItem.optionGroup} onChange={(event) => setDraftItem({ ...draftItem, optionGroup: event.target.value })} /></label>
          <label>Referência<input value={draftItem.reference} onChange={(event) => setDraftItem({ ...draftItem, reference: event.target.value })} /></label>
          <label>Descrição<input value={draftItem.description} onChange={(event) => setDraftItem({ ...draftItem, description: event.target.value })} /></label>
          <label>Acabamento<input value={draftItem.finish} onChange={(event) => setDraftItem({ ...draftItem, finish: event.target.value })} /></label>
          <label>Quantidade<input type="number" value={draftItem.quantity} onChange={(event) => setDraftItem({ ...draftItem, quantity: Number(event.target.value) })} /></label>
          <label>Preço original<input type="number" step="0.01" value={draftItem.originalUnitPrice} onChange={(event) => setDraftItem({ ...draftItem, originalUnitPrice: Number(event.target.value) })} /></label>
          <label>Observações<input value={draftItem.notes} onChange={(event) => setDraftItem({ ...draftItem, notes: event.target.value })} /></label>
        </div>
        <div className="actions">
          <button onClick={addItem}>Adicionar linha</button>
          <button onClick={loadFimaExample}>Carregar exemplo FIMA</button>
        </div>
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

function ProposalDetailView({
  proposal,
  brands,
  layouts,
  pricingRules,
  onChanged,
  onDuplicated,
}: {
  proposal: ProposalDetail;
  brands: Brand[];
  layouts: Layout[];
  pricingRules: PricingRule[];
  onChanged: (proposal: ProposalDetail) => void;
  onDuplicated: (proposal: ProposalDetail) => void;
}) {
  const [promptRuns, setPromptRuns] = useState<PromptRunDetail[]>([]);
  const [visiblePrompt, setVisiblePrompt] = useState<PromptRunDetail | null>(null);
  const [finalDocuments, setFinalDocuments] = useState<FinalDocument[]>([]);
  const [finalDocumentPath, setFinalDocumentPath] = useState("");
  const [finalDocumentVersion, setFinalDocumentVersion] = useState("");
  const [editingFinalDocumentId, setEditingFinalDocumentId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [promptOutputMode, setPromptOutputMode] = useState<PromptOutputMode>("chat_text");
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState(() => proposalToForm(proposal));
  const [editingItem, setEditingItem] = useState<ProposalItem | null>(null);
  const [itemForm, setItemForm] = useState(() => proposalItemToForm(proposal.items[0] ?? null));

  useEffect(() => {
    setProposalForm(proposalToForm(proposal));
    setEditingItem(null);
    setItemForm(proposalItemToForm(null));
  }, [proposal]);

  const refreshPrompts = useCallback(() => {
    getPromptRuns(proposal.id).then(setPromptRuns);
    getLatestPromptRun(proposal.id).then(setVisiblePrompt);
  }, [proposal.id]);

  useEffect(() => {
    refreshPrompts();
  }, [refreshPrompts]);

  const refreshFinalDocuments = useCallback(() => {
    getFinalDocuments(proposal.id)
      .then(setFinalDocuments)
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Erro ao ler documentos finais.");
      });
  }, [proposal.id]);

  useEffect(() => {
    refreshFinalDocuments();
  }, [refreshFinalDocuments]);

  function saveProposalChanges() {
    const input: UpdateProposalInput = {
      title: proposalForm.title,
      clientNameSnapshot: proposalForm.clientNameSnapshot,
      projectName: proposalForm.projectName,
      projectLocation: proposalForm.projectLocation,
      proposalDate: proposalForm.proposalDate,
      language: proposalForm.language,
      currency: proposalForm.currency,
      vatMode: proposalForm.vatMode,
      validityText: proposalForm.validityText,
      commercialConditions: proposalForm.commercialConditions,
      proposalType: proposalForm.proposalType,
      layoutId: proposalForm.layoutId ? Number(proposalForm.layoutId) : null,
      pricingRuleId: proposalForm.pricingRuleId ? Number(proposalForm.pricingRuleId) : null,
      notes: proposalForm.notes,
    };
    updateProposal(proposal.id, input)
      .then((updatedProposal) => {
        setMessage("Proposta atualizada.");
        setIsEditingProposal(false);
        onChanged(updatedProposal);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel atualizar a proposta.");
      });
  }

  function startEditingItem(item: ProposalItem) {
    setEditingItem(item);
    setItemForm(proposalItemToForm(item));
    setMessage(`A editar linha ${item.reference}.`);
  }

  function saveItemChanges() {
    if (!editingItem) return;
    const rule =
      pricingRules.find((item) => item.id === Number(itemForm.calculationRuleId)) ??
      pricingRules.find((item) => item.id === proposal.pricingRuleId);
    if (!rule) {
      setMessage("Seleciona uma regra comercial valida para recalcular a linha.");
      return;
    }
    const brand = brands.find((item) => item.id === Number(itemForm.brandId));
    if (!brand) {
      setMessage("Seleciona a marca do artigo antes de guardar a linha.");
      return;
    }
    const originalUnitPrice = Number(itemForm.originalUnitPrice);
    const quantity = Number(itemForm.quantity);
    const finalUnitPrice = calculateFinalUnitPrice({
      originalPrice: originalUnitPrice,
      ruleType: rule.type,
      factor: rule.factor,
      roundingMode: rule.roundingMode,
    }).finalUnitPrice;
    const lineTotal = calculateLineTotal(finalUnitPrice, quantity);
    const validation = validateLineTotal(finalUnitPrice, quantity, lineTotal);
    if (!validation.isValid) {
      setMessage("Line total must match final unit price times quantity");
      return;
    }

    updateProposalItem(editingItem.id, {
      brandId: itemForm.brandId ? Number(itemForm.brandId) : null,
      brandNameSnapshot: brand.displayName ?? brand.name,
      optionGroup: itemForm.optionGroup,
      reference: itemForm.reference,
      description: itemForm.description,
      finish: itemForm.finish,
      quantity,
      originalUnitPrice,
      calculationRuleId: rule.id,
      calculationFactor: rule.factor,
      finalUnitPrice,
      lineTotal,
      technicalSheetUrl: itemForm.technicalSheetUrl,
      drawing2dUrl: itemForm.drawing2dUrl,
      model3dUrl: itemForm.model3dUrl,
      imagePath: itemForm.imagePath,
      notes: itemForm.notes,
      sortOrder: Number(itemForm.sortOrder),
    })
      .then((updatedProposal) => {
        setMessage("Linha atualizada.");
        setEditingItem(null);
        setItemForm(proposalItemToForm(null));
        onChanged(updatedProposal);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel atualizar a linha.");
      });
  }

  function removeItem(item: ProposalItem) {
    const confirmed = window.confirm(
      "Pretendes remover esta linha? O registo sera removido da proposta, mas nenhum ficheiro fisico sera apagado.",
    );
    if (!confirmed) return;
    deleteProposalItem(item.id)
      .then((updatedProposal) => {
        setMessage("Linha removida.");
        if (editingItem?.id === item.id) {
          setEditingItem(null);
          setItemForm(proposalItemToForm(null));
        }
        onChanged(updatedProposal);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel remover a linha.");
      });
  }

  function generatePrompt() {
    generateProposalPrompt(proposal.id, promptOutputMode)
      .then(({ promptRun }) => {
        setVisiblePrompt(promptRun);
        setMessage("Prompt gerada e guardada.");
        refreshPrompts();
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Erro ao gerar prompt.");
      });
  }

  function copyPrompt() {
    if (!visiblePrompt) return;
    copyPromptToClipboard(visiblePrompt.promptText)
      .then(() => setMessage("Prompt copiada para a area de transferencia."))
      .catch(() => setMessage("Nao foi possivel copiar a prompt."));
  }

  function exportVisiblePrompt(format: "markdown" | "text") {
    if (!visiblePrompt) return;
    exportPromptRun(visiblePrompt.id, format)
      .then((result) => {
        setMessage(`Prompt exportada para: ${result.exportedPath}`);
        setVisiblePrompt({ ...visiblePrompt, exportedPath: result.exportedPath });
        refreshPrompts();
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Erro ao exportar prompt.");
      });
  }

  function openProposalLocalFolder() {
    openProposalFolder(proposal.localFolderPath)
      .then(() => setMessage("Pasta da proposta aberta."))
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel abrir a pasta.");
      });
  }

  function openVisiblePromptExport() {
    if (!visiblePrompt?.exportedPath) return;
    openPath(visiblePrompt.exportedPath)
      .then(() => setMessage("Exportacao aberta."))
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel abrir a exportacao.");
      });
  }

  function chooseFinalDocumentFile() {
    pickFinalDocumentFile()
      .then((path) => {
        if (path) setFinalDocumentPath(path);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel escolher o ficheiro.");
      });
  }

  function openFinalDocumentsLocalFolder() {
    openFinalDocumentsFolder(proposal.localFolderPath)
      .then(() => setMessage("Pasta final-documents aberta."))
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel abrir a pasta final-documents.");
      });
  }

  function openRegisteredFinalDocument(document: FinalDocument) {
    if (!document.localPath) {
      setMessage("O documento nao tem caminho local registado.");
      return;
    }
    openPath(document.localPath)
      .then(() => setMessage("Documento final aberto."))
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "O ficheiro ja nao existe no caminho registado.");
      });
  }

  function editFinalDocumentVersion(document: FinalDocument) {
    setEditingFinalDocumentId(document.id);
    setFinalDocumentVersion(document.versionLabel ?? "");
    setMessage(`A editar etiqueta/versao de ${document.fileName}.`);
  }

  function saveFinalDocumentVersion() {
    if (!editingFinalDocumentId) {
      setMessage("Seleciona um documento final para editar a versao.");
      return;
    }
    updateFinalDocumentVersion(editingFinalDocumentId, finalDocumentVersion)
      .then(() => {
        setMessage("Etiqueta/versao atualizada.");
        setEditingFinalDocumentId(null);
        setFinalDocumentVersion("");
        refreshFinalDocuments();
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel atualizar a versao.");
      });
  }

  function removeRegisteredFinalDocument(document: FinalDocument) {
    removeFinalDocumentRecord(document.id)
      .then(() => {
        setMessage("Registo removido da app. O ficheiro fisico nao foi apagado.");
        if (editingFinalDocumentId === document.id) {
          setEditingFinalDocumentId(null);
          setFinalDocumentVersion("");
        }
        refreshFinalDocuments();
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel remover o registo.");
      });
  }

  function registerVisibleFinalDocument() {
    registerFinalDocument({
      proposalId: proposal.id,
      sourceFilePath: finalDocumentPath,
      versionLabel: finalDocumentVersion,
    })
      .then((document) => {
        setMessage(`Documento final registado: ${document.localPath ?? document.fileName}`);
        setFinalDocumentPath("");
        setFinalDocumentVersion("");
        refreshFinalDocuments();
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Erro ao registar documento final.");
      });
  }

  function duplicateVisibleProposal() {
    const confirmed = window.confirm(
      "Pretendes duplicar esta proposta? A nova proposta ficara em estado draft e nao copiara prompts nem documentos finais.",
    );
    if (!confirmed) return;

    duplicateProposal(proposal.id)
      .then((duplicatedProposal) => {
        setMessage(`Proposta duplicada com sucesso: ${duplicatedProposal.proposalNumber}`);
        onDuplicated(duplicatedProposal);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel duplicar a proposta.");
      });
  }

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
      <div className="actions">
        <button onClick={() => setIsEditingProposal(true)}>Editar proposta</button>
        <button onClick={openProposalLocalFolder}>Abrir pasta da proposta</button>
        <button onClick={duplicateVisibleProposal}>Duplicar proposta</button>
      </div>
      {isEditingProposal && (
        <section className="sectionBand">
          <h2>Editar proposta</h2>
          <div className="formGrid">
            <label>Titulo<input value={proposalForm.title} onChange={(event) => setProposalForm({ ...proposalForm, title: event.target.value })} /></label>
            <label>Cliente<input value={proposalForm.clientNameSnapshot} onChange={(event) => setProposalForm({ ...proposalForm, clientNameSnapshot: event.target.value })} /></label>
            <label>Projeto<input value={proposalForm.projectName} onChange={(event) => setProposalForm({ ...proposalForm, projectName: event.target.value })} /></label>
            <label>Local<input value={proposalForm.projectLocation} onChange={(event) => setProposalForm({ ...proposalForm, projectLocation: event.target.value })} /></label>
            <label>Data<input type="date" value={proposalForm.proposalDate} onChange={(event) => setProposalForm({ ...proposalForm, proposalDate: event.target.value })} /></label>
            <label>Idioma<input value={proposalForm.language} onChange={(event) => setProposalForm({ ...proposalForm, language: event.target.value })} /></label>
            <label>Moeda<input value={proposalForm.currency} onChange={(event) => setProposalForm({ ...proposalForm, currency: event.target.value })} /></label>
            <label>IVA<input value={proposalForm.vatMode} onChange={(event) => setProposalForm({ ...proposalForm, vatMode: event.target.value })} /></label>
            <label>Tipo<input value={proposalForm.proposalType} onChange={(event) => setProposalForm({ ...proposalForm, proposalType: event.target.value })} /></label>
            <label>Layout<select value={proposalForm.layoutId} onChange={(event) => setProposalForm({ ...proposalForm, layoutId: event.target.value })}><option value="">Sem layout</option>{layouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.name}</option>)}</select></label>
            <label>Regra comercial<select value={proposalForm.pricingRuleId} onChange={(event) => setProposalForm({ ...proposalForm, pricingRuleId: event.target.value })}><option value="">Sem regra</option>{pricingRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></label>
            <label>Validade<input value={proposalForm.validityText} onChange={(event) => setProposalForm({ ...proposalForm, validityText: event.target.value })} /></label>
          </div>
          <label className="wideLabel">Condicoes comerciais<textarea value={proposalForm.commercialConditions} onChange={(event) => setProposalForm({ ...proposalForm, commercialConditions: event.target.value })} /></label>
          <label className="wideLabel">Notas<textarea value={proposalForm.notes} onChange={(event) => setProposalForm({ ...proposalForm, notes: event.target.value })} /></label>
          <div className="actions">
            <button onClick={saveProposalChanges}>Guardar alteracoes</button>
            <button onClick={() => {
              setProposalForm(proposalToForm(proposal));
              setIsEditingProposal(false);
            }}>
              Cancelar
            </button>
          </div>
        </section>
      )}
      <section className="sectionBand">
        <h2>Artigos</h2>
        <ItemsTable items={proposal.items} onEdit={startEditingItem} onRemove={removeItem} />
        {editingItem && (
          <div className="editPanel">
            <h2>Editar linha</h2>
            <div className="formGrid">
              <label>Marca<select value={itemForm.brandId} onChange={(event) => setItemForm({ ...itemForm, brandId: event.target.value })}><option value="">Sem marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.displayName ?? brand.name}</option>)}</select></label>
              <label>Grupo/opcao<input value={itemForm.optionGroup} onChange={(event) => setItemForm({ ...itemForm, optionGroup: event.target.value })} /></label>
              <label>Referencia<input value={itemForm.reference} onChange={(event) => setItemForm({ ...itemForm, reference: event.target.value })} /></label>
              <label>Descricao<input value={itemForm.description} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })} /></label>
              <label>Acabamento<input value={itemForm.finish} onChange={(event) => setItemForm({ ...itemForm, finish: event.target.value })} /></label>
              <label>Quantidade<input type="number" step="0.01" value={itemForm.quantity} onChange={(event) => setItemForm({ ...itemForm, quantity: event.target.value })} /></label>
              <label>Preco original<input type="number" step="0.01" value={itemForm.originalUnitPrice} onChange={(event) => setItemForm({ ...itemForm, originalUnitPrice: event.target.value })} /></label>
              <label>Regra<select value={itemForm.calculationRuleId} onChange={(event) => setItemForm({ ...itemForm, calculationRuleId: event.target.value })}>{pricingRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></label>
              <label>Ficha tecnica<input value={itemForm.technicalSheetUrl} onChange={(event) => setItemForm({ ...itemForm, technicalSheetUrl: event.target.value })} /></label>
              <label>Desenho 2D<input value={itemForm.drawing2dUrl} onChange={(event) => setItemForm({ ...itemForm, drawing2dUrl: event.target.value })} /></label>
              <label>Modelo 3D<input value={itemForm.model3dUrl} onChange={(event) => setItemForm({ ...itemForm, model3dUrl: event.target.value })} /></label>
              <label>Imagem<input value={itemForm.imagePath} onChange={(event) => setItemForm({ ...itemForm, imagePath: event.target.value })} /></label>
              <label>Ordem<input type="number" value={itemForm.sortOrder} onChange={(event) => setItemForm({ ...itemForm, sortOrder: event.target.value })} /></label>
              <label>Observacoes<input value={itemForm.notes} onChange={(event) => setItemForm({ ...itemForm, notes: event.target.value })} /></label>
            </div>
            <div className="actions">
              <button onClick={saveItemChanges}>Guardar linha</button>
              <button onClick={() => {
                setEditingItem(null);
                setItemForm(proposalItemToForm(null));
              }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="sectionBand">
        <h2>Prompts geradas</h2>
        <div className="formGrid">
          <label>
            Resultado pretendido
            <select
              value={promptOutputMode}
              onChange={(event) => setPromptOutputMode(event.target.value as PromptOutputMode)}
            >
              <option value="chat_text">Texto no chat</option>
              <option value="word_docx">Documento Word</option>
              <option value="pdf_file">PDF final</option>
              <option value="word_and_pdf">Word + PDF</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <button onClick={generatePrompt}>Gerar prompt</button>
          <button onClick={() => getLatestPromptRun(proposal.id).then(setVisiblePrompt)}>
            Ver ultima prompt
          </button>
          <button onClick={copyPrompt} disabled={!visiblePrompt}>Copiar prompt</button>
          <button onClick={() => exportVisiblePrompt("markdown")} disabled={!visiblePrompt}>
            Exportar .md
          </button>
          <button onClick={() => exportVisiblePrompt("text")} disabled={!visiblePrompt}>
            Exportar .txt
          </button>
          <button onClick={openVisiblePromptExport} disabled={!visiblePrompt?.exportedPath}>
            Abrir exportacao
          </button>
        </div>
        {message && <p className="statusNote">{message}</p>}
        <ul className="promptList">
          {promptRuns.map((run) => (
            <li key={run.id}>
              <button onClick={() => setVisiblePrompt(run)}>{run.promptTitle}</button>{" "}
              <span>{run.generatedAt}</span>
              {run.exportedPath && (
                <button onClick={() => openPath(run.exportedPath ?? "").catch((error: unknown) => {
                  setMessage(error instanceof Error ? error.message : "Nao foi possivel abrir a exportacao.");
                })}>
                  Abrir exportacao
                </button>
              )}
            </li>
          ))}
        </ul>
        {visiblePrompt && (
          <label className="wideLabel">
            Prompt gerada em {visiblePrompt.generatedAt}
            <textarea readOnly className="promptText" value={visiblePrompt.promptText} />
          </label>
        )}
      </section>
      <section className="sectionBand">
        <h2>Documentos finais</h2>
        <div className="formGrid">
          <label>Caminho do ficheiro final<input value={finalDocumentPath} onChange={(event) => setFinalDocumentPath(event.target.value)} /></label>
          <label>Etiqueta/versao<input value={finalDocumentVersion} onChange={(event) => setFinalDocumentVersion(event.target.value)} /></label>
        </div>
        <div className="actions">
          <button onClick={chooseFinalDocumentFile}>Escolher ficheiro</button>
          <button onClick={registerVisibleFinalDocument}>Registar documento final</button>
          <button onClick={saveFinalDocumentVersion} disabled={!editingFinalDocumentId}>Guardar versao</button>
          <button onClick={openFinalDocumentsLocalFolder}>Abrir pasta final-documents</button>
        </div>
        {finalDocuments.length > 0 && (
          <table>
            <thead><tr><th>Nome</th><th>Tipo</th><th>Versao</th><th>Caminho local</th><th>OneDrive</th><th>Acoes</th></tr></thead>
            <tbody>
              {finalDocuments.map((document) => (
                <tr key={document.id}>
                  <td>{document.fileName}</td>
                  <td>{document.fileType}</td>
                  <td>{document.versionLabel ?? "-"}</td>
                  <td>{document.localPath ?? "-"}</td>
                  <td>{document.onedrivePath ?? "-"}</td>
                  <td>
                    <button onClick={() => openRegisteredFinalDocument(document)} disabled={!document.localPath}>Abrir</button>
                    <button onClick={() => editFinalDocumentVersion(document)}>Editar versao</button>
                    <button onClick={() => removeRegisteredFinalDocument(document)}>Remover registo</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

function ItemsTable({
  items,
  onEdit,
  onRemove,
}: {
  items: Array<DraftProposalItem | ProposalItem>;
  onEdit?: (item: ProposalItem) => void;
  onRemove?: (item: ProposalItem) => void;
}) {
  return (
    <table>
      <thead><tr><th>Referência</th><th>Descrição</th><th>Qtd.</th><th>Preço final</th><th>Total</th><th>Obs.</th>{onEdit && <th>Ações</th>}</tr></thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.reference}-${index}`}>
            <td>{item.reference}</td>
            <td>{item.description}</td>
            <td>{item.quantity}</td>
            <td>{item.finalUnitPrice.toFixed(2)} EUR</td>
            <td>{item.lineTotal.toFixed(2)} EUR</td>
            <td>{item.notes}</td>
            {onEdit && "id" in item && (
              <td>
                <button onClick={() => onEdit(item)}>Editar</button>
                <button onClick={() => onRemove?.(item)}>Remover</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function proposalToForm(proposal: ProposalDetail) {
  return {
    title: proposal.title,
    clientNameSnapshot: proposal.clientNameSnapshot ?? "",
    projectName: proposal.projectName ?? "",
    projectLocation: proposal.projectLocation ?? "",
    proposalDate: proposal.proposalDate,
    language: proposal.language,
    currency: proposal.currency,
    vatMode: proposal.vatMode,
    validityText: proposal.validityText ?? "",
    commercialConditions: proposal.commercialConditions ?? "",
    proposalType: proposal.proposalType ?? "",
    layoutId: proposal.layoutId ? String(proposal.layoutId) : "",
    pricingRuleId: proposal.pricingRuleId ? String(proposal.pricingRuleId) : "",
    notes: proposal.notes ?? "",
  };
}

function proposalItemToForm(item: ProposalItem | null) {
  return {
    brandId: item?.brandId ? String(item.brandId) : "",
    brandNameSnapshot: item?.brandNameSnapshot ?? "",
    optionGroup: item?.optionGroup ?? "",
    reference: item?.reference ?? "",
    description: item?.description ?? "",
    finish: item?.finish ?? "",
    quantity: String(item?.quantity ?? 1),
    originalUnitPrice: String(item?.originalUnitPrice ?? 0),
    calculationRuleId: item?.calculationRuleId ? String(item.calculationRuleId) : "",
    technicalSheetUrl: item?.technicalSheetUrl ?? "",
    drawing2dUrl: item?.drawing2dUrl ?? "",
    model3dUrl: item?.model3dUrl ?? "",
    imagePath: item?.imagePath ?? "",
    notes: item?.notes ?? "",
    sortOrder: String(item?.sortOrder ?? 1),
  };
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
