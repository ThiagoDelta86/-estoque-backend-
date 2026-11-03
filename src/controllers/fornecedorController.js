const db = require('../database');
const { validarFornecedor } = require('../validacoes');

const MSG_CNPJ_DUPLICADO = 'Fornecedor com esse CNPJ já está cadastrado!';
const MSG_INVALIDO = 'Há campos inválidos. Corrija-os e tente novamente.';
const MSG_NAO_ENCONTRADO = 'Fornecedor não encontrado.';

const obter = (id) => (Number.isInteger(Number(id))
  ? db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(Number(id))
  : undefined);

// GET /fornecedores?busca=texto
function listar(req, res) {
  const busca = `%${String(req.query.busca ?? '').trim()}%`;
  const itens = db
    .prepare('SELECT * FROM fornecedores WHERE nome LIKE ? OR cnpj LIKE ? ORDER BY nome COLLATE NOCASE')
    .all(busca, busca);
  res.json(itens);
}

// GET /fornecedores/:id
function buscar(req, res) {
  const fornecedor = obter(req.params.id);
  if (!fornecedor) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
  res.json(fornecedor);
}

// POST /fornecedores  (cenários 1, 2 e 3 do "Cadastro de Fornecedor")
function criar(req, res) {
  const { erros, dados } = validarFornecedor(req.body);
  if (Object.keys(erros).length) return res.status(400).json({ mensagem: MSG_INVALIDO, erros });

  if (db.prepare('SELECT 1 FROM fornecedores WHERE cnpj = ?').get(dados.cnpj)) {
    return res.status(409).json({ mensagem: MSG_CNPJ_DUPLICADO, erros: { cnpj: MSG_CNPJ_DUPLICADO } });
  }

  const info = db
    .prepare('INSERT INTO fornecedores (nome, cnpj, endereco, telefone, email, contatoPrincipal) VALUES (?, ?, ?, ?, ?, ?)')
    .run(dados.nome, dados.cnpj, dados.endereco, dados.telefone, dados.email, dados.contatoPrincipal);

  res.status(201).json({
    mensagem: 'Fornecedor cadastrado com sucesso!',
    fornecedor: obter(info.lastInsertRowid),
  });
}

// PUT /fornecedores/:id
function atualizar(req, res) {
  if (!obter(req.params.id)) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

  const { erros, dados } = validarFornecedor(req.body);
  if (Object.keys(erros).length) return res.status(400).json({ mensagem: MSG_INVALIDO, erros });

  if (db.prepare('SELECT 1 FROM fornecedores WHERE cnpj = ? AND id <> ?').get(dados.cnpj, Number(req.params.id))) {
    return res.status(409).json({ mensagem: MSG_CNPJ_DUPLICADO, erros: { cnpj: MSG_CNPJ_DUPLICADO } });
  }

  db.prepare('UPDATE fornecedores SET nome = ?, cnpj = ?, endereco = ?, telefone = ?, email = ?, contatoPrincipal = ? WHERE id = ?')
    .run(dados.nome, dados.cnpj, dados.endereco, dados.telefone, dados.email, dados.contatoPrincipal, Number(req.params.id));

  res.json({ mensagem: 'Fornecedor atualizado com sucesso!', fornecedor: obter(req.params.id) });
}

// DELETE /fornecedores/:id  (as associações dele são removidas em cascata)
function remover(req, res) {
  if (!obter(req.params.id)) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
  db.prepare('DELETE FROM fornecedores WHERE id = ?').run(Number(req.params.id));
  res.json({ mensagem: 'Fornecedor removido com sucesso!' });
}

module.exports = { listar, buscar, criar, atualizar, remover };
