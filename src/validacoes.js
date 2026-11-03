// Validações usadas pelos controllers.
// Cada função devolve { erros, dados }: "erros" tem uma mensagem por campo inválido
// e "dados" traz os valores já limpos/normalizados, prontos para ir ao banco.

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const apenasDigitos = (v) => String(v ?? '').replace(/\D/g, '');
const normalizarCnpj = (v) => String(v ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const vazio = (v) => v === undefined || v === null || String(v).trim() === '';

// CNPJ com dígitos verificadores. Aceita também o CNPJ alfanumérico (a partir de 2026):
// cada caractere vale (código ASCII - 48), o que para números dá o próprio dígito.
function cnpjValido(valor) {
  const cnpj = normalizarCnpj(valor);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
  if (/^(.)\1{13}$/.test(cnpj)) return false; // 00000000000000, 11111111111111...

  const digito = (base) => {
    const pesos = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...base].reduce((acc, c, i) => acc + (c.charCodeAt(0) - 48) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = digito(cnpj.slice(0, 12));
  const d2 = digito(cnpj.slice(0, 12) + d1);
  return cnpj.slice(12) === `${d1}${d2}`;
}

// DDD (2 dígitos) + 8 dígitos (fixo) ou + 9 dígitos começando em 9 (celular)
const telefoneValido = (digitos) => /^[1-9][1-9]9?\d{8}$/.test(digitos);
const emailValido = (email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const LIMITE_IMAGEM = 2200000; // ~1,5 MB de arquivo (o base64 ocupa ~37% a mais)

function validarFornecedor(corpo = {}) {
  const erros = {};
  const nome = texto(corpo.nome);
  const cnpj = normalizarCnpj(corpo.cnpj);
  const endereco = texto(corpo.endereco);
  const telefone = apenasDigitos(corpo.telefone);
  const email = texto(corpo.email).toLowerCase();
  const contatoPrincipal = texto(corpo.contatoPrincipal);

  if (!nome) erros.nome = 'Informe o nome da empresa.';
  else if (nome.length < 2 || nome.length > 120) erros.nome = 'O nome deve ter entre 2 e 120 caracteres.';

  if (!cnpj) erros.cnpj = 'Informe o CNPJ.';
  else if (!cnpjValido(cnpj)) erros.cnpj = 'CNPJ inválido.';

  if (!endereco) erros.endereco = 'Informe o endereço completo da empresa.';
  else if (endereco.length < 5 || endereco.length > 255) erros.endereco = 'O endereço deve ter entre 5 e 255 caracteres.';

  if (!telefone) erros.telefone = 'Informe o telefone.';
  else if (!telefoneValido(telefone)) erros.telefone = 'Telefone inválido. Use DDD + número, ex.: (11) 3456-7890.';

  if (!email) erros.email = 'Informe o e-mail.';
  else if (!emailValido(email)) erros.email = 'E-mail inválido.';

  if (!contatoPrincipal) erros.contatoPrincipal = 'Informe o nome do contato principal.';
  else if (contatoPrincipal.length < 2 || contatoPrincipal.length > 120) erros.contatoPrincipal = 'O contato deve ter entre 2 e 120 caracteres.';

  return { erros, dados: { nome, cnpj, endereco, telefone, email, contatoPrincipal } };
}

function validarProduto(corpo = {}) {
  const erros = {};
  const nome = texto(corpo.nome);
  const descricao = texto(corpo.descricao);
  const categoria = texto(corpo.categoria);
  const codigoBarras = String(corpo.codigoBarras ?? '').trim();
  const dataValidade = texto(corpo.dataValidade);

  if (!nome) erros.nome = 'Informe o nome do produto.';
  else if (nome.length < 2 || nome.length > 120) erros.nome = 'O nome deve ter entre 2 e 120 caracteres.';

  if (codigoBarras && !/^\d{8,14}$/.test(codigoBarras)) erros.codigoBarras = 'O código de barras deve ter somente números (de 8 a 14 dígitos).';

  if (!descricao) erros.descricao = 'Informe uma descrição breve do produto.';
  else if (descricao.length > 500) erros.descricao = 'A descrição deve ter no máximo 500 caracteres.';

  let quantidadeEstoque = 0;
  if (!vazio(corpo.quantidadeEstoque)) {
    quantidadeEstoque = Number(corpo.quantidadeEstoque);
    if (!Number.isInteger(quantidadeEstoque) || quantidadeEstoque < 0) erros.quantidadeEstoque = 'A quantidade deve ser um número inteiro maior ou igual a zero.';
  }

  let preco = null;
  if (!vazio(corpo.preco)) {
    preco = Number(String(corpo.preco).replace(',', '.'));
    if (!Number.isFinite(preco) || preco < 0) erros.preco = 'O preço deve ser um número maior ou igual a zero.';
    else preco = Math.round(preco * 100) / 100;
  }

  if (!categoria) erros.categoria = 'Selecione ou informe a categoria.';
  else if (categoria.length > 60) erros.categoria = 'A categoria deve ter no máximo 60 caracteres.';

  if (dataValidade && !dataValida(dataValidade)) erros.dataValidade = 'Data de validade inválida.';

  let imagem = null;
  if (!vazio(corpo.imagem)) {
    imagem = String(corpo.imagem);
    if (imagem.length > LIMITE_IMAGEM || !/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(imagem)) {
      erros.imagem = 'A imagem deve ser PNG, JPG, GIF ou WEBP de até 1,5 MB.';
    }
  }

  return {
    erros,
    dados: {
      nome,
      codigoBarras: codigoBarras || null,
      descricao,
      preco,
      quantidadeEstoque,
      categoria,
      dataValidade: dataValidade || null,
      imagem,
    },
  };
}

module.exports = { validarFornecedor, validarProduto, cnpjValido };
