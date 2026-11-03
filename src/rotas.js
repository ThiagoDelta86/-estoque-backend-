const { Router } = require('express');
const produtos = require('./controllers/produtoController');
const fornecedores = require('./controllers/fornecedorController');
const associacoes = require('./controllers/associacaoController');

const rotas = Router();

// Produtos (CRUD)
rotas.get('/produtos', produtos.listar);
rotas.get('/produtos/:id', produtos.buscar);
rotas.post('/produtos', produtos.criar);
rotas.put('/produtos/:id', produtos.atualizar);
rotas.delete('/produtos/:id', produtos.remover);

// Fornecedores (CRUD)
rotas.get('/fornecedores', fornecedores.listar);
rotas.get('/fornecedores/:id', fornecedores.buscar);
rotas.post('/fornecedores', fornecedores.criar);
rotas.put('/fornecedores/:id', fornecedores.atualizar);
rotas.delete('/fornecedores/:id', fornecedores.remover);

// Associação produto <-> fornecedor (muitos para muitos)
rotas.get('/associacoes', associacoes.listar);
rotas.get('/produtos/:produtoId/fornecedores', associacoes.fornecedoresDoProduto);
rotas.post('/produtos/:produtoId/fornecedores', associacoes.associar);
rotas.delete('/produtos/:produtoId/fornecedores/:fornecedorId', associacoes.desassociar);
rotas.get('/fornecedores/:fornecedorId/produtos', associacoes.produtosDoFornecedor);

module.exports = rotas;
