export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface Entity { id: string; createdAt: string; updatedAt: string; [key: string]: JsonValue }
export const COLLECTIONS = ['clientes','tarefas','processos','leads','propostas','faturas','despesas','servicos','documentos','licencas','equipe','sistemas','integracoes','metas','cargos','avaliacoes','conversas','irpf','atividades','configuracoes','planosContabeis','contasContabeis','atendimentos','simulacoes','contratos','onboardings'] as const;
export type CollectionName = typeof COLLECTIONS[number];
export type AppState = { [K in CollectionName]: Entity[] } & { meta: { version: 1; revision: number; organizacaoId: string } };
export interface Actor { id: string; nome: string; papel?: string; departamentos?: string[]; email?: string; role?: string; department?: string; memberId?: string }
export const COMMAND_TYPES = ['save','delete','advanceProcess','toggleStep','completeTask','approveTask','generateRecurring','convertLead','messageToTask','generateInvoices','openService','transferService','closeService','saveSimulation','generateContract','sendContract','registerSignature','activateClient','completeOnboardingStep'] as const;
export type CommandType = typeof COMMAND_TYPES[number];
export interface Command { type: CommandType; collection?: CollectionName; id?: string; data?: Record<string, JsonValue> }
export interface Mensagem { [key: string]: JsonValue; id: string; texto: string; autor: 'cliente' | 'equipe'; criadoEm: string; origem: string; externoId: string | null }
export interface Step { [key: string]: JsonValue; id: string; descricao: string; obrigatorio: boolean; concluido: boolean; natureza: string }
export interface Stage { [key: string]: JsonValue; id: string; nome: string; itens: Step[] }
export interface RecurrenceRecommendation { [key: string]: JsonValue; modeloId: string; nome: string; departamento: string; periodicidade: string; exigeProtocolo: boolean; confirmacaoNecessaria: boolean }
