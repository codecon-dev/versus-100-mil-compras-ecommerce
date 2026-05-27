// API de análise do dataset de e-commerce (Olist) — ~100 mil pedidos.
// Lê os CSVs uma única vez no boot, calcula as 7 análises e serve do cache.
//
// Os CSVs reais usam separador VÍRGULA, 1 linha de cabeçalho e codificação ASCII/UTF-8.
// Por isso usamos csv-parser (lida com campos entre aspas que contêm vírgulas e quebras
// de linha, como os comentários de avaliação).

const PORTA = process.env.PORT || 5757;
const path = require('path');
const fs = require('fs');
const express = require('express');
const csv = require('csv-parser');

const app = express();
// API somente-leitura (apenas GET): não há corpo de requisição para interpretar.
// Sem express.json(), um corpo enviado por engano (ex.: pelo Bruno) é ignorado
// em vez de derrubar a requisição com erro de parse.

const DIR = __dirname;

// Front-end estático: serve public/index.html em "/"
app.use(express.static(path.join(DIR, 'public'))); // os CSVs ficam na raiz do projeto, ao lado deste arquivo

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
function carregarCsv(arquivo) {
  return new Promise((resolve, reject) => {
    const linhas = [];
    fs.createReadStream(path.join(DIR, arquivo))
      .on('error', reject)
      .pipe(csv())
      .on('data', (linha) => linhas.push(linha))
      .on('end', () => resolve(linhas))
      .on('error', reject);
  });
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
// timestamps no formato "2017-10-02 10:56:33" -> diferença em dias
const dias = (ini, fim) =>
  (new Date(fim.replace(' ', 'T')) - new Date(ini.replace(' ', 'T'))) / 86400000;

// Cache com o resultado de todas as análises (preenchido no boot).
const analises = {};

// ---------------------------------------------------------------------------
// Carregamento + cálculo das análises
// ---------------------------------------------------------------------------
async function carregarTudo() {
  console.log('Lendo CSVs...');
  const [customers, orders, orderItems, orderPayments, orderReviews, products, sellers, traducao] =
    await Promise.all([
      carregarCsv('customers_dataset.csv'),
      carregarCsv('orders_dataset.csv'),
      carregarCsv('order_items_dataset.csv'),
      carregarCsv('order_payments_dataset.csv'),
      carregarCsv('order_reviews_dataset.csv'),
      carregarCsv('products_dataset.csv'),
      carregarCsv('sellers_dataset.csv'),
      carregarCsv('product_category_name_translation.csv'),
    ]);

  console.log(
    `Linhas: customers=${customers.length} orders=${orders.length} items=${orderItems.length} ` +
      `payments=${orderPayments.length} reviews=${orderReviews.length} products=${products.length} sellers=${sellers.length}`
  );

  // --- Índices reutilizados por várias análises ---
  const customerById = new Map();
  for (const c of customers) customerById.set(c.customer_id, c);

  const categoriaPorProduto = new Map();
  for (const p of products) categoriaPorProduto.set(p.product_id, p.product_category_name);

  const traduzCategoria = new Map();
  for (const t of traducao) traduzCategoria.set(t.product_category_name, t.product_category_name_english);

  // total (price + frete) por pedido, a partir dos itens — usado em geografia e sazonalidade
  const totalPorPedido = new Map();
  for (const it of orderItems) {
    const t = totalPorPedido.get(it.order_id) || { price: 0, freight: 0 };
    t.price += num(it.price);
    t.freight += num(it.freight_value);
    totalPorPedido.set(it.order_id, t);
  }

  // === 1) Onde estão clientes e vendas? Estados mais rentáveis ===============
  const porEstado = {};
  const ufDe = (uf) =>
    porEstado[uf] || (porEstado[uf] = { estado: uf, clientes: 0, pedidos: 0, receita: 0, frete: 0 });

  for (const o of orders) {
    const c = customerById.get(o.customer_id);
    if (!c) continue;
    const e = ufDe(c.customer_state || 'N/D');
    e.pedidos += 1;
    const t = totalPorPedido.get(o.order_id);
    if (t) {
      e.receita += t.price;
      e.frete += t.freight;
    }
  }
  // clientes únicos (customer_unique_id) por estado
  const clienteVisto = new Set();
  for (const c of customers) {
    if (clienteVisto.has(c.customer_unique_id)) continue;
    clienteVisto.add(c.customer_unique_id);
    ufDe(c.customer_state || 'N/D').clientes += 1;
  }
  const vendedoresPorEstado = {};
  for (const s of sellers) {
    const uf = s.seller_state || 'N/D';
    vendedoresPorEstado[uf] = (vendedoresPorEstado[uf] || 0) + 1;
  }
  const estados = Object.values(porEstado)
    .map((e) => ({
      estado: e.estado,
      clientes: e.clientes,
      pedidos: e.pedidos,
      receita: round2(e.receita),
      frete: round2(e.frete),
      ticketMedio: round2(e.receita / (e.pedidos || 1)),
    }))
    .sort((a, b) => b.receita - a.receita);

  analises.geografia = {
    pergunta: 'Onde estão nossos clientes e vendas? Quais estados são mais rentáveis?',
    totalEstados: estados.length,
    topEstadosPorReceita: estados.slice(0, 5),
    porEstado: estados,
    vendedoresPorEstado,
  };

  // === 2) Quais categorias sustentam o negócio? =============================
  const cat = {};
  for (const it of orderItems) {
    const pt = categoriaPorProduto.get(it.product_id) || 'desconhecida';
    const c =
      cat[pt] ||
      (cat[pt] = {
        categoria: pt,
        categoriaEn: traduzCategoria.get(pt) || pt,
        itensVendidos: 0,
        receita: 0,
        frete: 0,
        pedidos: new Set(),
      });
    c.itensVendidos += 1;
    c.receita += num(it.price);
    c.frete += num(it.freight_value);
    c.pedidos.add(it.order_id);
  }
  const receitaTotalItens = Object.values(cat).reduce((s, c) => s + c.receita, 0);
  const categorias = Object.values(cat)
    .map((c) => ({
      categoria: c.categoria,
      categoriaEn: c.categoriaEn,
      itensVendidos: c.itensVendidos,
      pedidos: c.pedidos.size,
      receita: round2(c.receita),
      frete: round2(c.frete),
      participacaoReceitaPct: round2((c.receita / receitaTotalItens) * 100),
    }))
    .sort((a, b) => b.receita - a.receita);

  analises.categorias = {
    pergunta: 'Quais categorias de produto sustentam o negócio?',
    totalCategorias: categorias.length,
    receitaTotal: round2(receitaTotalItens),
    top10PorReceita: categorias.slice(0, 10),
    categorias,
  };

  // === 3) O cliente volta a comprar? ========================================
  const pedidosPorCliente = new Map(); // customer_unique_id -> nº de pedidos
  for (const o of orders) {
    const c = customerById.get(o.customer_id);
    if (!c) continue;
    const k = c.customer_unique_id;
    pedidosPorCliente.set(k, (pedidosPorCliente.get(k) || 0) + 1);
  }
  let recompradores = 0;
  const distribuicaoPedidos = {};
  for (const n of pedidosPorCliente.values()) {
    if (n >= 2) recompradores += 1;
    distribuicaoPedidos[n] = (distribuicaoPedidos[n] || 0) + 1;
  }
  const clientesUnicos = pedidosPorCliente.size;

  analises.recompra = {
    pergunta: 'Nosso cliente volta a comprar?',
    clientesUnicos,
    clientesComUmaCompra: clientesUnicos - recompradores,
    clientesRecorrentes: recompradores,
    taxaRecompraPct: round2((recompradores / (clientesUnicos || 1)) * 100),
    distribuicaoPedidosPorCliente: distribuicaoPedidos,
  };

  // === 4) Quanto tempo leva para um pedido chegar? ==========================
  let somaEntrega = 0,
    somaEstimado = 0,
    nEntrega = 0,
    noPrazo = 0,
    atrasado = 0;
  for (const o of orders) {
    if (o.order_status !== 'delivered') continue;
    if (!o.order_purchase_timestamp || !o.order_delivered_customer_date) continue;
    const d = dias(o.order_purchase_timestamp, o.order_delivered_customer_date);
    if (!Number.isFinite(d) || d < 0) continue;
    somaEntrega += d;
    nEntrega += 1;
    if (o.order_estimated_delivery_date) {
      const est = dias(o.order_purchase_timestamp, o.order_estimated_delivery_date);
      if (Number.isFinite(est)) somaEstimado += est;
      const atraso = dias(o.order_estimated_delivery_date, o.order_delivered_customer_date);
      if (atraso > 0) atrasado += 1;
      else noPrazo += 1;
    }
  }
  analises.entrega = {
    pergunta: 'Quanto tempo leva para um pedido chegar?',
    pedidosEntregues: nEntrega,
    tempoMedioEntregaDias: round2(somaEntrega / (nEntrega || 1)),
    prazoMedioEstimadoDias: round2(somaEstimado / (nEntrega || 1)),
    entregasNoPrazo: noPrazo,
    entregasAtrasadas: atrasado,
    taxaNoPrazoPct: round2((noPrazo / ((noPrazo + atrasado) || 1)) * 100),
  };

  // === 5) Como os clientes avaliam a experiência? ===========================
  const distNotas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let somaNotas = 0,
    nNotas = 0;
  for (const r of orderReviews) {
    const s = parseInt(r.review_score, 10);
    if (s >= 1 && s <= 5) {
      distNotas[s] += 1;
      somaNotas += s;
      nNotas += 1;
    }
  }
  analises.avaliacoes = {
    pergunta: 'Como os clientes avaliam a experiência?',
    totalAvaliacoes: nNotas,
    notaMedia: round2(somaNotas / (nNotas || 1)),
    distribuicaoNotas: distNotas,
    satisfacaoPct: round2(((distNotas[4] + distNotas[5]) / (nNotas || 1)) * 100),
    insatisfacaoPct: round2(((distNotas[1] + distNotas[2]) / (nNotas || 1)) * 100),
  };

  // === 6) Como as pessoas pagam? ============================================
  const tipos = {};
  const distParcelas = {};
  let somaParcelas = 0,
    somaValor = 0,
    nPag = 0;
  for (const p of orderPayments) {
    const t = p.payment_type || 'desconhecido';
    const e = tipos[t] || (tipos[t] = { tipo: t, transacoes: 0, valorTotal: 0 });
    e.transacoes += 1;
    e.valorTotal += num(p.payment_value);
    const inst = parseInt(p.payment_installments, 10) || 0;
    somaParcelas += inst;
    distParcelas[inst] = (distParcelas[inst] || 0) + 1;
    somaValor += num(p.payment_value);
    nPag += 1;
  }
  const tiposPagamento = Object.values(tipos)
    .map((e) => ({
      tipo: e.tipo,
      transacoes: e.transacoes,
      valorTotal: round2(e.valorTotal),
      participacaoPct: round2((e.transacoes / (nPag || 1)) * 100),
    }))
    .sort((a, b) => b.transacoes - a.transacoes);
  analises.pagamentos = {
    pergunta: 'Como as pessoas pagam?',
    totalTransacoes: nPag,
    ticketMedio: round2(somaValor / (nPag || 1)),
    parcelasMedia: round2(somaParcelas / (nPag || 1)),
    tiposPagamento,
    distribuicaoParcelas: distParcelas,
  };

  // === 7) Existe sazonalidade nas vendas? ===================================
  const meses = {}; // 'YYYY-MM' -> { pedidos, receita }
  const porMesAno = {}; // 1..12 -> { pedidos, receita } (agregado entre anos)
  for (const o of orders) {
    const ts = o.order_purchase_timestamp;
    if (!ts || ts.length < 7) continue;
    const ym = ts.slice(0, 7);
    const mesNum = parseInt(ts.slice(5, 7), 10);
    const t = totalPorPedido.get(o.order_id);
    const receita = t ? t.price : 0;

    const m = meses[ym] || (meses[ym] = { mes: ym, pedidos: 0, receita: 0 });
    m.pedidos += 1;
    m.receita += receita;

    const a = porMesAno[mesNum] || (porMesAno[mesNum] = { mes: mesNum, pedidos: 0, receita: 0 });
    a.pedidos += 1;
    a.receita += receita;
  }
  const serieMensal = Object.values(meses)
    .map((m) => ({ ...m, receita: round2(m.receita) }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
  const sazonalidadePorMes = Object.values(porMesAno)
    .map((m) => ({ ...m, receita: round2(m.receita) }))
    .sort((a, b) => a.mes - b.mes);
  analises.sazonalidade = {
    pergunta: 'Existe sazonalidade nas vendas?',
    serieMensal,
    sazonalidadePorMesDoAno: sazonalidadePorMes,
  };

  console.log('Análises calculadas.');
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------
const ROTAS = {
  '/api/geografia': '1 - Onde estão clientes e vendas? Estados mais rentáveis',
  '/api/categorias': '2 - Quais categorias sustentam o negócio?',
  '/api/recompra': '3 - O cliente volta a comprar?',
  '/api/entrega': '4 - Quanto tempo leva para um pedido chegar?',
  '/api/avaliacoes': '5 - Como os clientes avaliam a experiência?',
  '/api/pagamentos': '6 - Como as pessoas pagam?',
  '/api/sazonalidade': '7 - Existe sazonalidade nas vendas?',
  '/api/resumo': 'Resumo com todas as análises',
};

app.get('/api', (req, res) => res.json({ api: 'Análise e-commerce', rotas: ROTAS }));
app.get('/api/geografia', (req, res) => res.json(analises.geografia));
app.get('/api/categorias', (req, res) => res.json(analises.categorias));
app.get('/api/recompra', (req, res) => res.json(analises.recompra));
app.get('/api/entrega', (req, res) => res.json(analises.entrega));
app.get('/api/avaliacoes', (req, res) => res.json(analises.avaliacoes));
app.get('/api/pagamentos', (req, res) => res.json(analises.pagamentos));
app.get('/api/sazonalidade', (req, res) => res.json(analises.sazonalidade));
app.get('/api/resumo', (req, res) => res.json(analises));

// ---------------------------------------------------------------------------
// Boot: só sobe o servidor depois que os dados estão carregados
// ---------------------------------------------------------------------------
carregarTudo()
  .then(() => {
    app.listen(PORTA, () => console.log(`Servidor rodando em http://localhost:${PORTA}`));
  })
  .catch((err) => {
    console.error('Falha ao carregar os CSVs:', err);
    process.exit(1);
  });
