import {createContext,useContext} from 'react';import type {Actor,AppState,Command,Entity} from '../types/domain';
export interface AppContextValue{state:AppState;actor:Actor;busy:boolean;execute:(command:Command)=>Promise<void>;notice:(message:string)=>void;reload:()=>Promise<void>;logout:()=>Promise<void>;uploadDocument:(file:File,metadata:Record<string,string>)=>Promise<Entity>;}
export const AppContext=createContext<AppContextValue|null>(null);
export function useApp():AppContextValue{const context=useContext(AppContext);if(!context)throw new Error('A aplicação precisa de uma sessão ativa.');return context;}
