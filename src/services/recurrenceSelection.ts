import type {JsonValue} from '../types/domain';
import {recommendRecurrences,TASK_MODELS} from './domain';
export function reconcileRecurrences(current:Record<string,JsonValue>[],previous:string[],profile:Record<string,unknown>,responsible:string,excluded:string[]=[]){
 const next=recommendRecurrences(profile);const ids=new Set(next.map(r=>r.modeloId));
 const result=current.filter(r=>!previous.includes(String(r.modeloId))||ids.has(String(r.modeloId)));
 for(const r of next){if(excluded.includes(r.modeloId)||result.some(x=>x.modeloId===r.modeloId))continue;const model=TASK_MODELS.find(m=>m.id===r.modeloId)!;result.push({modeloId:r.modeloId,periodicidade:r.periodicidade,responsavelId:responsible,diaVencimento:20,...(model.mes?{mes:model.mes}:{})});}
 return result;
}
