FACULDADE GRAN (https://faculdade.grancursosonline.com.br/)

Projeto Disciplina Projeto Integrador

## Backend - Controle de Estoque

API REST em Node.js + Express com banco SQLite (arquivo `estoque.db`, criado sozinho na primeira execução).

```bash
npm install
npm start        # http://localhost:3001
npm test         # 14 testes automatizados (banco em memória)
```

### Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET / POST | `/produtos` | Lista (`?busca=`) / cadastra produto |
| GET / PUT / DELETE | `/produtos/:id` | Detalhes (com imagem) / atualiza / remove |
| GET / POST | `/fornecedores` | Lista (`?busca=`) / cadastra fornecedor |
| GET / PUT / DELETE | `/fornecedores/:id` | Detalhes / atualiza / remove |
| GET | `/associacoes` | Todas as associações |
| GET | `/produtos/:produtoId/fornecedores` | Fornecedores de um produto |
| POST | `/produtos/:produtoId/fornecedores` | Associa (`{ "fornecedorId": 1 }`) |
| DELETE | `/produtos/:produtoId/fornecedores/:fornecedorId` | Desassocia |
| GET | `/fornecedores/:fornecedorId/produtos` | Produtos de um fornecedor |

Erros de validação voltam como `400 { mensagem, erros: { campo: "texto" } }`; duplicidades como `409`.

Coleção pronta para o Insomnia: `insomnia/colecao-estoque.json`.
