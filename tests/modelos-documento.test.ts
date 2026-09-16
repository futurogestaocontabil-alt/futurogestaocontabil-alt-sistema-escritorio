import { describe, expect, it } from 'vitest';
import { MODELO_CONTRATO, MODELO_PROPOSTA, MODELOS_DOCUMENTO, pendenciasDoModelo, preencherModelo } from '../src/services/domain/modelosDocumento';

describe('Modelos de proposta e contrato', () => {
 it('mantém proposta e contrato como documentos separados', () => {
  expect(MODELOS_DOCUMENTO).toHaveLength(2);
  expect(MODELO_PROPOSTA.tipo).toBe('proposta');
  expect(MODELO_CONTRATO.tipo).toBe('contrato');
  expect(MODELO_PROPOSTA.id).not.toBe(MODELO_CONTRATO.id);
 });

 it('preserva as vinte e duas cláusulas do modelo oficial, na ordem', () => {
  const titulos = MODELO_CONTRATO.secoes.map(secao => secao.titulo);
  expect(titulos).toEqual([
   '1. Identificação das partes','2. Objeto do contrato','3. Serviços contratados','4. Serviços não incluídos',
   '5. Obrigações da contratada','6. Obrigações do contratante','7. Documentos e informações que o cliente deve enviar',
   '8. Prazos de envio de documentos','9. Honorários','10. Vencimento e forma de pagamento','11. Cobrança pró-rata',
   '12. Reajuste','13. Serviços adicionais','14. Atraso e inadimplência','15. Rescisão','16. Responsabilidade profissional',
   '17. Confidencialidade','18. Proteção de dados pessoais','19. Comunicações oficiais','20. Vigência','21. Foro','22. Assinaturas',
  ]);
 });

 it('preserva a redação jurídica que veio dos modelos oficiais', () => {
  const corpo = MODELO_CONTRATO.secoes.map(secao => secao.corpo).join('\n');
  expect(corpo).toContain('multa de 2% e juros de 1% ao mês');
  expect(corpo).toContain('Índice Nacional de Preços ao Consumidor Amplo');
  expect(corpo).toContain('Lei 9.613/98');
  expect(corpo).toContain('Resolução CFC nº 1.445/13');
  expect(corpo).toContain('Lei 13.709/2018');
  expect(corpo).toContain('Lei nº 9.307/96');
  expect(corpo).toContain('Carta de Responsabilidade da Administração');
  expect(corpo).toContain('aviso prévio de {{avisoPrevioDias}} dias');
 });

 it('não carrega nenhum dado pessoal, de cliente ou do escritório', () => {
  // A conferência é por formato, não por valor. Listar os dados reais aqui
  // seria justamente vazar o que este teste existe para impedir.
  const tudo = JSON.stringify(MODELOS_DOCUMENTO);
  expect(tudo, 'CPF em formato mascarado').not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  expect(tudo, 'CNPJ em formato mascarado').not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
  expect(tudo, 'CEP em formato mascarado').not.toMatch(/\b\d{5}-\d{3}\b/);
  expect(tudo, 'sequência longa de dígitos').not.toMatch(/\d{11,}/);
  expect(tudo, 'e-mail real').not.toMatch(/[\w.+-]+@(?!empresa\.|exemplo\.)[\w-]+\.[\w.]+/);
  expect(tudo, 'número de CRC').not.toMatch(/CRC\s*n?[ºo°]?\s*\d/i);
  // Os dados do escritório e do cliente entram por campo, nunca escritos no modelo.
  for (const marcador of ['{{escritorioRazaoSocial}}','{{escritorioCnpj}}','{{contadorCrc}}','{{contadorCpf}}','{{razaoSocial}}','{{cnpj}}','{{cpfRepresentante}}']) {
   expect(tudo, `o modelo precisa usar o marcador ${marcador}`).toContain(marcador);
  }
 });

 it('mantém os dados do escritório fora do código, em configuração', () => {
  // Nenhum campo do escritório pode ter valor embutido no modelo.
  for (const campo of MODELO_CONTRATO.campos.filter(item => item.origem === 'escritorio' || item.origem === 'socio')) {
   expect(campo.chave, 'campo do escritório precisa ser preenchido em configurações').toMatch(/^(escritorio|contador)/);
  }
 });

 it('lista as pendências pelo rótulo, sem inventar valor', () => {
  expect(pendenciasDoModelo(MODELO_CONTRATO, {})).toContain('Razão social do escritório');
  expect(pendenciasDoModelo(MODELO_CONTRATO, {})).toContain('CPF do representante');
  // Campo condicional não entra na lista.
  expect(pendenciasDoModelo(MODELO_CONTRATO, {})).not.toContain('Inscrição estadual');
  expect(pendenciasDoModelo(MODELO_PROPOSTA, {})).toContain('Número da proposta');
 });

 it('substitui os campos e marca o que ficou sem valor', () => {
  const [partes] = preencherModelo([MODELO_CONTRATO.secoes[0]], { razaoSocial: 'Empresa Exemplo LTDA', cnpj: '00.000.000/0001-00' });
  expect(partes.corpo).toContain('Empresa Exemplo LTDA');
  expect(partes.corpo).toContain('00.000.000/0001-00');
  expect(partes.corpo).toContain('[escritorioRazaoSocial não informado]');
  expect(partes.corpo).not.toContain('{{');
 });

 it('marca como editáveis apenas as seções comerciais da proposta', () => {
  expect(MODELO_CONTRATO.secoes.every(secao => secao.editavel !== true)).toBe(true);
  expect(MODELO_PROPOSTA.secoes.filter(secao => secao.editavel).map(secao => secao.id))
   .toEqual(['sobre','nao-incluidos','premissas','documentos','proximos-passos']);
 });

 it('não promete economia tributária em nenhum texto', () => {
  const tudo = JSON.stringify(MODELOS_DOCUMENTO).toLowerCase();
  expect(tudo).not.toMatch(/garantia de economia|economia garantida|reduz(imos|irá) seus impostos/);
  expect(JSON.stringify(MODELO_PROPOSTA)).toContain('Não constitui cálculo de tributos nem promessa de economia tributária');
 });
});
