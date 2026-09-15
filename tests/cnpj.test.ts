import { describe, expect, it } from 'vitest';
import { mapOpenCnpj, normalizeCnpj, validCnpjFormat } from '../src/services/cnpj';

describe('Consulta pública de CNPJ', () => {
  it('normaliza o número e rejeita formatos incompletos', () => {
    expect(normalizeCnpj('19.131.243/0001-97')).toBe('19131243000197');
    expect(validCnpjFormat('19.131.243/0001-97')).toBe(true);
    expect(validCnpjFormat('123')).toBe(false);
  });

  it('mapeia os dados públicos sem presumir regime não confirmado', () => {
    const result = mapOpenCnpj({
      cnpj: '19131243000197', razao_social: 'EMPRESA TESTE LTDA', nome_fantasia: 'EMPRESA TESTE',
      uf: 'GO', municipio: 'GOIANIA', cep: '74000000', logradouro: 'RUA UM', numero: '10', bairro: 'CENTRO',
      cnae_principal: '6920601', cnaes_secundarios: ['6201501'], porte_empresa: 'Microempresa (ME)',
      capital_social: '10000,00', opcao_simples: 'N',
      telefones: [{ ddd: '62', numero: '999999999', is_fax: false }],
      QSA: [{ nome_socio: 'SÓCIO TESTE', qualificacao_socio: 'Sócio-Administrador' }],
    });
    expect(result.data).toMatchObject({ cnpj: '19131243000197', razaoSocial: 'EMPRESA TESTE LTDA', nome: 'EMPRESA TESTE', cidade: 'GOIANIA', uf: 'GO', porte: 'ME', capitalSocial: 10000 });
    expect(result.data.regime).toBeUndefined();
    expect(result.data.quadroSocietario).toContain('SÓCIO TESTE');
    expect(result.warning).toContain('não confirmado');
  });
});
