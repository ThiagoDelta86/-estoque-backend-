const path = require('path');
const Database = require('better-sqlite3');

// SQLite: o banco é um arquivo (estoque.db) criado automaticamente na raiz do backend.
const caminho = process.env.DB_PATH || path.join(__dirname, '..', 'estoque.db');
const db = new Database(caminho);

db.exec('PRAGMA foreign_keys = ON'); // necessário para o ON DELETE CASCADE funcionar

db.exec(`
  CREATE TABLE IF NOT EXISTS fornecedores (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nome             TEXT NOT NULL,
    cnpj             TEXT NOT NULL UNIQUE,
    endereco         TEXT NOT NULL,
    telefone         TEXT NOT NULL,
    email            TEXT NOT NULL,
    contatoPrincipal TEXT NOT NULL,
    criadoEm         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS produtos (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    nome              TEXT NOT NULL,
    codigoBarras      TEXT UNIQUE,
    descricao         TEXT NOT NULL,
    preco             REAL CHECK (preco IS NULL OR preco >= 0),
    quantidadeEstoque INTEGER NOT NULL DEFAULT 0 CHECK (quantidadeEstoque >= 0),
    categoria         TEXT NOT NULL,
    dataValidade      TEXT,
    imagem            TEXT,
    criadoEm          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Relação muitos-para-muitos entre produtos e fornecedores
  CREATE TABLE IF NOT EXISTS associacoes (
    produtoId    INTEGER NOT NULL REFERENCES produtos(id)     ON DELETE CASCADE,
    fornecedorId INTEGER NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
    criadoEm     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (produtoId, fornecedorId)
  );
`);

module.exports = db;
