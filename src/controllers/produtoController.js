const db = require('../database');
const { validarProduto } = require('../validacoes');

const MSG_CODIGO_DUPLICADO = 'Produto com este código de barras já está cadastrado!';
const MSG_INVALIDO = 'Há campos inválidos. Corrija-os e tente novamente.';
const MSG_NAO_ENCONTRADO = 'Produto não encontrado.';

// A listagem não traz a imagem (base64 é pesado); só avisa se existe (temImagem).
const COLUNAS_LISTA = `id, nome, codigoBarras, descricao, preco, quantidadeEstoque, categoria,
  dataValidade, criadoEm, (imagem IS NOT NULL) AS temImagem`;

const obter = (id) => (Number.isInteger(Number(id))
  ? db.prepare('SELECT * FROM produtos WHERE id = ?').get(Number(id))
  : undefined);

// GET /produtos?busca=texto  (busca por nome ou código de barras)
function listar(req, res) {
  const busca = `%${String(req.query.busca ?? '').trim()}%`;
  const itens = db
    .prepare(`SELECT ${COLUNAS_LISTA} FROM produtos
              WHERE nome LIKE ? OR IFNULL(codigoBarras, '') LIKE ?
              ORDER BY nome COLLATE NOCASE`)
    .all(busca, busca);
  res.json(itens.map((p) => ({ ...p, temImagem: Boolean(p.temImagem) })));
}

// GET /produtos/:id  (detalhes completos, com imagem)
function buscar(req, res) {
  const produto = obter(req.params.id);
  if (!produto) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
  res.json(produto);
}

// POST /produtos  (cenários 1, 2 e 3 do "Cadastro de Produtos")
function criar(req, res) {
  const { erros, dados } = validarProduto(req.body);
  if (Object.keys(erros).length) return res.status(400).json({ mensagem: MSG_INVALIDO, erros });

  if (dados.codigoBarras && db.prepare('SELECT 1 FROM produtos WHERE codigoBarras = ?').get(dados.codigoBarras)) {
    return res.status(409).json({ mensagem: MSG_CODIGO_DUPLICADO, erros: { codigoBarras: MSG_CODIGO_DUPLICADO } });
  }

  const info = db
    .prepare(`INSERT INTO produtos (nome, codigoBarras, descricao, preco, quantidadeEstoque, categoria, dataValidade, imagem)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(dados.nome, dados.codigoBarras, dados.descricao, dados.preco, dados.quantidadeEstoque,
      dados.categoria, dados.dataValidade, dados.imagem);

  res.status(201).json({
    mensagem: 'Produto cadastrado com sucesso!',
    produto: obter(info.lastInsertRowid),
  });
}

// PUT /produtos/:id
function atualizar(req, res) {
  if (!obter(req.params.id)) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

  const { erros, dados } = validarProduto(req.body);
  if (Object.keys(erros).length) return res.status(400).json({ mensagem: MSG_INVALIDO, erros });

  if (dados.codigoBarras
    && db.prepare('SELECT 1 FROM produtos WHERE codigoBarras = ? AND id <> ?').get(dados.codigoBarras, Number(req.params.id))) {
    return res.status(409).json({ mensagem: MSG_CODIGO_DUPLICADO, erros: { codigoBarras: MSG_CODIGO_DUPLICADO } });
  }

  db.prepare(`UPDATE produtos SET nome = ?, codigoBarras = ?, descricao = ?, preco = ?, quantidadeEstoque = ?,
              categoria = ?, dataValidade = ?, imagem = ? WHERE id = ?`)
    .run(dados.nome, dados.codigoBarras, dados.descricao, dados.preco, dados.quantidadeEstoque,
      dados.categoria, dados.dataValidade, dados.imagem, Number(req.params.id));

  res.json({ mensagem: 'Produto atualizado com sucesso!', produto: obter(req.params.id) });
}

// DELETE /produtos/:id  (as associações dele são removidas em cascata)
function remover(req, res) {
  if (!obter(req.params.id)) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
  db.prepare('DELETE FROM produtos WHERE id = ?').run(Number(req.params.id));
  res.json({ mensagem: 'Produto removido com sucesso!' });
}

module.exports = { listar, buscar, criar, atualizar, remover };
