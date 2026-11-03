const express = require('express');
const cors = require('cors');
const rotas = require('./src/rotas');

const app = express();

app.use(cors()); // permite que o frontend (React) em outra porta consuma a API
app.use(express.json({ limit: '3mb' })); // 3 MB: a imagem do produto viaja em base64

// Rota de teste (herdada do "Olá, Mundo!" da Etapa 1)
app.get('/', (req, res) => {
  res.send('Olá, Mundo! API de Controle de Estoque no ar.');
});

app.use(rotas);

// Rota inexistente
app.use((req, res) => {
  res.status(404).json({ mensagem: 'Rota não encontrada.' });
});

// Tratamento central de erros
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ mensagem: 'JSON inválido no corpo da requisição.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ mensagem: 'Requisição grande demais (verifique o tamanho da imagem).' });
  }
  console.error(err);
  res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

// Porta 3001: a 3000 fica livre para o React (npm start) usar
const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}/`);
  });
}

module.exports = app; // exportado para os testes automatizados
