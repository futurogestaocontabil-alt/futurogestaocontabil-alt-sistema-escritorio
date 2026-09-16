import { useState } from 'react';
import { Building2, Eye, FileText } from 'lucide-react';
import { Badge, Card } from './ui';
import { useApp } from '../hooks/useApp';
import { CAMPOS_ESCRITORIO, MODELO_CONTRATO, MODELO_PROPOSTA, pendenciasDoModelo, preencherModelo } from '../services/domain/modelosDocumento';

const texto = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export default function EscritorioDocumentos() {
  const { state, actor, execute, busy, notice } = useApp();
  const [previa, setPrevia] = useState<'proposta' | 'contrato' | null>(null);
  const socio = actor.papel === 'socio';
  const escritorio = state.configuracoes.find(item => item.id === 'escritorio');
  const dados = Object.fromEntries(Object.entries(escritorio ?? {}).filter(([, valor]) => typeof valor === 'string')) as Record<string, string>;
  const faltando = CAMPOS_ESCRITORIO.filter(campo => campo.obrigatorio && !texto(dados[campo.chave]));
  const modelo = previa === 'contrato' ? MODELO_CONTRATO : MODELO_PROPOSTA;

  return <>
    <Card>
      <div className="card-heading">
        <div><span className="heading-icon"><Building2 size={19}/></span><h3>Dados do escritório para documentos</h3></div>
        <Badge tone={faltando.length ? 'warning' : 'success'}>{faltando.length ? `${faltando.length} campo obrigatório vazio` : 'Completo'}</Badge>
      </div>
      <p className="wf-help-block">
        Proposta e contrato são montados com estes dados. Eles ficam guardados no sistema, nunca no código nem no repositório, porque incluem CPF e dados de assinatura.
        Enquanto faltar campo obrigatório, a geração do contrato fica bloqueada e o sistema mostra o que falta.
      </p>

      {socio ? <form onSubmit={async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const atualizado = Object.fromEntries(CAMPOS_ESCRITORIO.map(campo => [campo.chave, String(form.get(campo.chave) ?? '')]));
        try {
          await execute({ type: 'save', collection: 'configuracoes', id: 'escritorio', data: { tipo: 'escritorio', nome: 'Dados do escritório para documentos', ...atualizado } });
          notice('Dados do escritório salvos.');
        } catch (causa) { notice(causa instanceof Error ? causa.message : 'Não foi possível salvar.'); }
      }}>
        <div className="form-grid">
          {CAMPOS_ESCRITORIO.filter(campo => campo.chave !== 'escritorioConfidencialidade' && campo.chave !== 'escritorioRodape').map(campo =>
            <label className="field" key={campo.chave}>
              <span>{campo.rotulo}{campo.obrigatorio ? ' *' : ''}</span>
              <input name={campo.chave} defaultValue={dados[campo.chave] ?? ''} autoComplete="off"/>
            </label>)}
          <label className="field field-wrap"><span>Texto de confidencialidade</span>
            <textarea name="escritorioConfidencialidade" rows={3} defaultValue={dados.escritorioConfidencialidade ?? ''}/>
            <small>Entra na cláusula 17 do contrato.</small></label>
          <label className="field field-wrap"><span>Rodapé padrão</span>
            <textarea name="escritorioRodape" rows={2} defaultValue={dados.escritorioRodape ?? ''}/></label>
        </div>
        <button className="button button-primary" disabled={busy}>Salvar dados do escritório</button>
      </form> : <p className="wf-muted">Somente o sócio altera os dados usados em contrato.</p>}

      {faltando.length ? <div className="wf-note" style={{ marginTop: 16 }}>
        <strong>Falta preencher:</strong> {faltando.map(campo => campo.rotulo).join('; ')}.
      </div> : null}
    </Card>

    <Card>
      <div className="card-heading">
        <div><span className="heading-icon gold"><FileText size={19}/></span><h3>Modelos de documento</h3></div>
      </div>
      <p className="wf-help-block">
        A estrutura e a redação vêm dos modelos oficiais do escritório. Alterar cláusula cria nova versão e exige aprovação do sócio.
        Contrato já gerado ou assinado guarda a versão que usou e não muda.
      </p>
      <table className="wf-table"><thead><tr><th>Modelo</th><th>Versão</th><th>Seções</th><th>Campos</th><th/></tr></thead><tbody>
        {[MODELO_PROPOSTA, MODELO_CONTRATO].map(item => <tr key={item.id}>
          <td><strong>{item.nome}</strong><small>{item.tipo === 'proposta' ? 'Documento comercial' : 'Documento jurídico'}</small></td>
          <td>{item.versao}</td>
          <td>{item.secoes.length}</td>
          <td>{item.campos.length}</td>
          <td><button className="button button-secondary" onClick={() => setPrevia(item.tipo)}><Eye size={14}/>Pré-visualizar</button></td>
        </tr>)}
      </tbody></table>
    </Card>

    {previa ? <div className="wf-dialog wf-dialog-wide" role="dialog" aria-modal="true" aria-label={`Pré-visualização de ${modelo.nome}`}>
      <header className="wf-dialog-header">
        <div><span className="wf-eyebrow">PRÉ-VISUALIZAÇÃO</span><h2>{modelo.nome}</h2></div>
        <button type="button" className="wf-icon-button" onClick={() => setPrevia(null)} aria-label="Fechar">×</button>
      </header>
      <div className="wf-dialog-body">
        {pendenciasDoModelo(modelo, dados).length ? <div className="wf-note" style={{ marginBottom: 18 }}>
          <strong>Esta é uma prévia com marcadores.</strong> Os campos do cliente e da proposta só são preenchidos na geração real. O que aparece entre colchetes ainda não tem valor.
        </div> : null}
        {preencherModelo(modelo.secoes, dados).map(secao => <section key={secao.titulo} style={{ marginBottom: 22 }}>
          <h3 className="wf-section-title">{secao.titulo}</h3>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, color: '#3c5962', margin: 0 }}>{secao.corpo}</p>
        </section>)}
      </div>
      <div className="wf-actions" style={{ padding: '0 28px 22px' }}>
        <button type="button" className="button button-secondary" onClick={() => window.print()}>Imprimir ou salvar em PDF</button>
        <button type="button" className="button button-primary" onClick={() => setPrevia(null)}>Fechar</button>
      </div>
    </div> : null}
  </>;
}
