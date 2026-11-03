const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:'; // banco só em memória: os testes não sujam o estoque.db
const app = require('../app');

let servidor;
let base;

before(async () => {
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  if (servidor.closeAllConnections) servidor.closeAllConnections();
  servidor.close();
});

async function chamar(metodo, caminho, corpo, bruto) {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: bruto !== undefined ? bruto : corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return { status: resposta.status, corpo: await resposta.json() };
}

const fornecedorValido = {
  nome: 'Distribuidora Alfa Ltda',
  cnpj: '11.444.777/0001-61',
  endereco: 'Rua das Flores, 100, Centro, São Paulo - SP',
  telefone: '(11) 3456-7890',
  email: 'contato@alfa.com.br',
  contatoPrincipal: 'Maria Souza',
};

const produtoValido = {
  nome: 'Teclado USB',
  codigoBarras: '7891234567895',
  descricao: 'Teclado ABNT2 com fio',
  quantidadeEstoque: 25,
  preco: 89.9,
  categoria: 'Eletrônicos',
};

let fornecedorId;
let produtoId;

test('Fornecedor - 1º cenário: cadastra com sucesso', async () => {
  const r = await chamar('POST', '/fornecedores', fornecedorValido);
  assert.equal(r.status, 201);
  assert.equal(r.corpo.mensagem, 'Fornecedor cadastrado com sucesso!');
  assert.equal(r.corpo.fornecedor.cnpj, '11444777000161');
  fornecedorId = r.corpo.fornecedor.id;
});

test('Fornecedor - 2º cenário: CNPJ já existente', async () => {
  const r = await chamar('POST', '/fornecedores', { ...fornecedorValido, cnpj: '11444777000161' });
  assert.equal(r.status, 409);
  assert.equal(r.corpo.mensagem, 'Fornecedor com esse CNPJ já está cadastrado!');
  assert.ok(r.corpo.erros.cnpj);
});

test('Fornecedor - 3º cenário: informações inválidas ou em branco', async () => {
  const vazio = await chamar('POST', '/fornecedores', {});
  assert.equal(vazio.status, 400);
  for (const campo of ['nome', 'cnpj', 'endereco', 'telefone', 'email', 'contatoPrincipal']) {
    assert.ok(vazio.corpo.erros[campo], `esperava erro em ${campo}`);
  }
  const invalido = await chamar('POST', '/fornecedores', {
    ...fornecedorValido, cnpj: '11.111.111/1111-11', telefone: '123', email: 'sem-arroba',
  });
  assert.equal(invalido.status, 400);
  assert.deepEqual(Object.keys(invalido.corpo.erros).sort(), ['cnpj', 'email', 'telefone']);
});

test('Produto - 1º cenário: cadastra com sucesso', async () => {
  const r = await chamar('POST', '/produtos', produtoValido);
  assert.equal(r.status, 201);
  assert.equal(r.corpo.mensagem, 'Produto cadastrado com sucesso!');
  produtoId = r.corpo.produto.id;
});

test('Produto - 2º cenário: código de barras já existente', async () => {
  const r = await chamar('POST', '/produtos', produtoValido);
  assert.equal(r.status, 409);
  assert.equal(r.corpo.mensagem, 'Produto com este código de barras já está cadastrado!');
});

test('Produto - 3º cenário: informações inválidas ou em branco', async () => {
  const r = await chamar('POST', '/produtos', { nome: '', descricao: '', categoria: '', codigoBarras: 'abc', quantidadeEstoque: -3 });
  assert.equal(r.status, 400);
  for (const campo of ['nome', 'descricao', 'categoria', 'codigoBarras', 'quantidadeEstoque']) {
    assert.ok(r.corpo.erros[campo], `esperava erro em ${campo}`);
  }
});

test('Produto - código de barras é opcional e a lista não traz a imagem', async () => {
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const r = await chamar('POST', '/produtos', { nome: 'Caneta', descricao: 'Caneta azul', categoria: 'Papelaria', imagem: pixel });
  assert.equal(r.status, 201);
  const lista = await chamar('GET', '/produtos');
  const caneta = lista.corpo.find((p) => p.nome === 'Caneta');
  assert.equal(caneta.temImagem, true);
  assert.equal(caneta.imagem, undefined);
  const detalhe = await chamar('GET', `/produtos/${r.corpo.produto.id}`);
  assert.equal(detalhe.corpo.imagem, pixel);
  const ruim = await chamar('POST', '/produtos', { ...produtoValido, codigoBarras: '', imagem: 'data:text/html;base64,AAAA' });
  assert.ok(ruim.corpo.erros.imagem);
});

test('Associação - 1º cenário: associa com sucesso', async () => {
  const r = await chamar('POST', `/produtos/${produtoId}/fornecedores`, { fornecedorId });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.mensagem, 'Fornecedor associado com sucesso ao produto!');
  assert.equal(r.corpo.fornecedores.length, 1);
});

test('Associação - 2º cenário: fornecedor já associado', async () => {
  const r = await chamar('POST', `/produtos/${produtoId}/fornecedores`, { fornecedorId });
  assert.equal(r.status, 409);
  assert.equal(r.corpo.mensagem, 'Fornecedor já está associado a este produto!');
});

test('Associação - consultas nos dois sentidos', async () => {
  const doProduto = await chamar('GET', `/produtos/${produtoId}/fornecedores`);
  assert.deepEqual(doProduto.corpo.map((f) => f.id), [fornecedorId]);
  const doFornecedor = await chamar('GET', `/fornecedores/${fornecedorId}/produtos`);
  assert.deepEqual(doFornecedor.corpo.map((p) => p.id), [produtoId]);
  assert.equal((await chamar('GET', '/associacoes')).corpo.length, 1);
});

test('Associação - 3º cenário: desassocia com sucesso', async () => {
  const r = await chamar('DELETE', `/produtos/${produtoId}/fornecedores/${fornecedorId}`);
  assert.equal(r.status, 200);
  assert.equal(r.corpo.mensagem, 'Fornecedor desassociado com sucesso!');
  const de_novo = await chamar('DELETE', `/produtos/${produtoId}/fornecedores/${fornecedorId}`);
  assert.equal(de_novo.status, 404);
});

test('Associação - ids inexistentes e corpo vazio', async () => {
  assert.equal((await chamar('POST', `/produtos/9999/fornecedores`, { fornecedorId })).status, 404);
  assert.equal((await chamar('POST', `/produtos/${produtoId}/fornecedores`, { fornecedorId: 9999 })).status, 404);
  assert.equal((await chamar('POST', `/produtos/${produtoId}/fornecedores`, {})).status, 400);
});

test('Atualização e exclusão (CRUD) com remoção em cascata', async () => {
  const up = await chamar('PUT', `/fornecedores/${fornecedorId}`, { ...fornecedorValido, nome: 'Alfa Atualizada' });
  assert.equal(up.corpo.fornecedor.nome, 'Alfa Atualizada');

  const outro = await chamar('POST', '/fornecedores', { ...fornecedorValido, cnpj: '45.723.174/0001-10', nome: 'Beta' });
  assert.equal(outro.status, 201, JSON.stringify(outro.corpo));
  const conflito = await chamar('PUT', `/fornecedores/${outro.corpo.fornecedor.id}`, { ...fornecedorValido });
  assert.equal(conflito.status, 409);

  await chamar('POST', `/produtos/${produtoId}/fornecedores`, { fornecedorId });
  assert.equal((await chamar('DELETE', `/produtos/${produtoId}`)).status, 200);
  assert.equal((await chamar('GET', `/produtos/${produtoId}`)).status, 404);
  assert.equal((await chamar('GET', '/associacoes')).corpo.length, 0);
  assert.equal((await chamar('DELETE', `/fornecedores/${fornecedorId}`)).status, 200);
  assert.equal((await chamar('GET', '/fornecedores/abc')).status, 404);
});

test('JSON inválido e rota inexistente', async () => {
  assert.equal((await chamar('POST', '/produtos', undefined, '{quebrado')).status, 400);
  assert.equal((await chamar('GET', '/nada')).status, 404);
});
