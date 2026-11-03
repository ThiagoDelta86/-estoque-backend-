const db = require('../database');

const existe = (tabela, id) => Number.isInteger(Number(id))
  && Boolean(db.prepare(`SELECT 1 FROM ${tabela} WHERE id = ?`).get(Number(id)));

const fornecedoresDe = (produtoId) => db
  .prepare(`SELECT f.id, f.nome, f.cnpj FROM fornecedores f
            JOIN associacoes a ON a.fornecedorId = f.id
            WHERE a.produtoId = ? ORDER BY f.nome COLLATE NOCASE`)
  .all(Number(produtoId));

// GET /produtos/:produtoId/fornecedores  -> fornecedores associados a um produto
function fornecedoresDoProduto(req, res) {
  if (!existe('produtos', req.params.produtoId)) return res.status(404).json({ mensagem: 'Produto não encontrado.' });
  res.json(fornecedoresDe(req.params.produtoId));
}

// GET /fornecedores/:fornecedorId/produtos  -> produtos fornecidos por um fornecedor
function produtosDoFornecedor(req, res) {
  if (!existe('fornecedores', req.params.fornecedorId)) return res.status(404).json({ mensagem: 'Fornecedor não encontrado.' });
  const itens = db
    .prepare(`SELECT p.id, p.nome, p.codigoBarras, p.categoria FROM produtos p
              JOIN associacoes a ON a.produtoId = p.id
              WHERE a.fornecedorId = ? ORDER BY p.nome COLLATE NOCASE`)
    .all(Number(req.params.fornecedorId));
  res.json(itens);
}

// GET /associacoes  -> todas as associações
function listar(req, res) {
  const itens = db
    .prepare(`SELECT a.produtoId, p.nome AS produtoNome, a.fornecedorId, f.nome AS fornecedorNome
              FROM associacoes a
              JOIN produtos p ON p.id = a.produtoId
              JOIN fornecedores f ON f.id = a.fornecedorId
              ORDER BY p.nome COLLATE NOCASE, f.nome COLLATE NOCASE`)
    .all();
  res.json(itens);
}

// POST /produtos/:produtoId/fornecedores   body: { "fornecedorId": 1 }
function associar(req, res) {
  const { produtoId } = req.params;
  const fornecedorId = req.body?.fornecedorId;

  if (fornecedorId === undefined || fornecedorId === null || fornecedorId === '') {
    return res.status(400).json({ mensagem: 'Selecione um fornecedor.', erros: { fornecedorId: 'Selecione um fornecedor.' } });
  }
  if (!existe('produtos', produtoId)) return res.status(404).json({ mensagem: 'Produto não encontrado.' });
  if (!existe('fornecedores', fornecedorId)) return res.status(404).json({ mensagem: 'Fornecedor não encontrado.' });

  if (db.prepare('SELECT 1 FROM associacoes WHERE produtoId = ? AND fornecedorId = ?').get(Number(produtoId), Number(fornecedorId))) {
    return res.status(409).json({ mensagem: 'Fornecedor já está associado a este produto!' });
  }

  db.prepare('INSERT INTO associacoes (produtoId, fornecedorId) VALUES (?, ?)').run(Number(produtoId), Number(fornecedorId));
  res.status(201).json({
    mensagem: 'Fornecedor associado com sucesso ao produto!',
    fornecedores: fornecedoresDe(produtoId),
  });
}

// DELETE /produtos/:produtoId/fornecedores/:fornecedorId
function desassociar(req, res) {
  const { produtoId, fornecedorId } = req.params;
  const info = Number.isInteger(Number(produtoId)) && Number.isInteger(Number(fornecedorId))
    ? db.prepare('DELETE FROM associacoes WHERE produtoId = ? AND fornecedorId = ?').run(Number(produtoId), Number(fornecedorId))
    : { changes: 0 };

  if (!info.changes) return res.status(404).json({ mensagem: 'Este fornecedor não está associado ao produto.' });
  res.json({ mensagem: 'Fornecedor desassociado com sucesso!' });
}

module.exports = { fornecedoresDoProduto, produtosDoFornecedor, listar, associar, desassociar };
