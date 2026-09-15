export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface Entity { id: string; createdAt: string; updatedAt: string; [key: string]: JsonValue }
export const COLLECTIONS = ['clientes','tarefas','processos','leads','propostas','faturas','despesas','servicos','documentos','licencas','equipe','sistemas','integracoes','metas','cargos','avaliacoes','conversas','irpf','atividades','configuracoes','planosContabeis','contasContabeis'] as const;
export type CollectionName = typeof COLLECTIONS[number];
export type AppState = { [K in CollectionName]: Entity[] } & { meta: { version: 1; revision: number; organizacaoId: string } };
export interface Actor { id: string; nome: string; papel?: string; departamentos?: string[]; email?: string; role?: string; department?: string; memberId?: string }
export interface Command { type: 'save' | 'delete' | 'advanceProcess' | 'toggleStep' | 'completeTask' | 'generateRecurring' | 'convertLead' | 'messageToTask' | 'generateInvoices'; collection?: CollectionName; id?: string; data?: Record<string, JsonValue> }
export interface Step { [key: string]: JsonValue; id: string; descricao: string; obrigatorio: boolean; concluido: boolean; natureza: string }
export interface Stage { [key: string]: JsonValue; id: string; nome: string; itens: Step[] }
export interface RecurrenceRecommendation { [key: string]: JsonValue; modeloId: string; nome: string; departamento: string; periodicidade: string; exigeProtocolo: boolean; confirmacaoNecessaria: boolean }
