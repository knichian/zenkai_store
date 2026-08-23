import { useState, useEffect, useRef } from 'react';
import { Package, Search, ShoppingCart, LogOut, Plus, Trash2, UploadCloud, CheckCircle2, X, Users, Banknote, CreditCard, QrCode, Printer, BarChart3, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function PdvVendedor() {
  const [produtos, setProdutos] = useState([]);
  const [venda, setVenda] = useState([]);
  const [aba, setAba] = useState('venda'); // venda, estoque, dashboard
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  
  const [prodSelecionado, setProdSelecionado] = useState(null);
  
  // MODAIS E FLUXO DE CAIXA
  const [modalPagamento, setModalPagamento] = useState(false);
  const [reciboData, setReciboData] = useState(null);

  // ESTADOS DO CHECKOUT
  const [clienteBusca, setClienteBusca] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  
  const [descontoTipo, setDescontoTipo] = useState('R$'); 
  const [descontoValor, setDescontoValor] = useState('');
  
  const [metodoPgto, setMetodoPgto] = useState('DINHEIRO'); 
  const [valorRecebido, setValorRecebido] = useState('');
  const [parcelas, setParcelas] = useState(1);

  // ESTADOS DO NOVO CLIENTE
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({ nome: '', email: '', telefone: '' });

  // ESTADO DO DASHBOARD
  const [dashData, setDashData] = useState(null);

  const nav = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', categoria: '', img: null });
  const [grade, setGrade] = useState([{ tamanho: '', qtd: '' }]);

  const loadDados = async () => {
    try { setProdutos(await api.getProdutos()); } catch (e) { console.error(e); }
  };

  const loadDashboard = async () => {
    try { setDashData(await api.getDashboard()); } catch (e) { console.error(e); }
  };

  useEffect(() => { loadDados(); }, []);

  // Recarrega o Dashboard sempre que o usuário clicar na aba dele
  useEffect(() => {
    if (aba === 'dashboard') loadDashboard();
  }, [aba]);

  useEffect(() => {
    if (clienteBusca.length >= 3) {
      api.buscarClientes(clienteBusca).then(setClientesEncontrados);
    } else {
      setClientesEncontrados([]);
    }
  }, [clienteBusca]);

  // CÁLCULOS FINANCEIROS & TRAVA DE DESCONTO DE 50%
  const subtotal = venda.reduce((a, i) => a + (i.preco * i.qtd), 0);
  
  let descontoCalculado = descontoTipo === 'R$' ? Number(descontoValor || 0) : subtotal * (Number(descontoValor || 0) / 100);
  let limiteExcedido = false;

  // Lógica da trava
  const maxDescontoPermitido = subtotal * 0.5;
  if (descontoCalculado > maxDescontoPermitido) {
    descontoCalculado = maxDescontoPermitido;
    limiteExcedido = true;
  }

  const totalComDesconto = Math.max(0, subtotal - descontoCalculado);
  const troco = metodoPgto === 'DINHEIRO' ? Math.max(0, Number(valorRecebido || 0) - totalComDesconto) : 0;

  const processarPagamento = async () => {
    if (metodoPgto === 'DINHEIRO' && Number(valorRecebido || 0) < totalComDesconto) {
      alert('O valor recebido é menor que o total a pagar!');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        total: subtotal,
        desconto: descontoCalculado, // Envia o desconto já limitado
        cliente_id: clienteSelecionado ? clienteSelecionado.id : null,
        itens: venda.map(i => ({ produto_id: i.id, tamanho: i.tamanho, quantidade: i.qtd, preco_unitario: i.preco })),
        pagamento: {
          metodo: metodoPgto,
          valor_recebido: metodoPgto === 'DINHEIRO' ? Number(valorRecebido) : totalComDesconto,
          parcelas: metodoPgto === 'CARTAO' ? parcelas : 1
        }
      };

      await api.checkout(payload);
      
      setReciboData({
        itens: [...venda], subtotal, desconto: descontoCalculado, total: totalComDesconto,
        metodo: metodoPgto, valorPago: metodoPgto === 'DINHEIRO' ? Number(valorRecebido) : totalComDesconto,
        troco, cliente: clienteSelecionado ? clienteSelecionado.nome : 'Consumidor Final',
        data: new Date().toLocaleString('pt-BR')
      });

      setVenda([]);
      setModalPagamento(false);
      resetCheckoutStates();
      loadDados();
    } catch (e) {
      alert('Erro ao processar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetCheckoutStates = () => {
    setClienteBusca(''); setClienteSelecionado(null);
    setDescontoValor(''); setValorRecebido('');
    setParcelas(1); setMetodoPgto('DINHEIRO');
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(form).forEach(k => { if (form[k]) fd.append(k === 'img' ? 'imagem' : k, form[k]); });
      
      const tamanhosObj = {};
      let totalEstoque = 0;
      grade.forEach(g => {
        if (g.tamanho && g.qtd) {
          tamanhosObj[g.tamanho] = parseInt(g.qtd);
          totalEstoque += parseInt(g.qtd);
        }
      });

      if (totalEstoque === 0) throw new Error("Adicione pelo menos um tamanho com estoque válido.");

      fd.append('tamanhos', JSON.stringify(tamanhosObj));
      fd.append('estoque', totalEstoque);

      await api.criarProduto(fd);
      setForm({ nome: '', descricao: '', preco: '', categoria: '', img: null });
      setGrade([{ tamanho: '', qtd: '' }]);
      if (fileRef.current) fileRef.current.value = "";
      alert('Produto injetado no DB!');
      loadDados();
    } catch (e) { alert(e.message); } 
    finally { setLoading(false); }
  };

  const excluirDb = async (id) => {
    if(!window.confirm('Excluir do banco de dados definitivamente?')) return;
    try { await api.excluirProduto(id); loadDados(); } catch(e) { alert(e.message); }
  };

  const addGrade = () => setGrade([...grade, { tamanho: '', qtd: '' }]);
  const updateGrade = (index, campo, valor) => {
    const novaGrade = [...grade];
    novaGrade[index][campo] = valor;
    setGrade(novaGrade);
  };
  const removeGrade = (index) => setGrade(grade.filter((_, i) => i !== index));

  const confirmarTamanhoVenda = (p, tamanho) => {
    const idCarrinho = `${p.id}-${tamanho}`;
    const ex = venda.find(i => i.idCarrinho === idCarrinho);
    
    if (ex) {
      setVenda(venda.map(i => i.idCarrinho === idCarrinho ? {...i, qtd: i.qtd + 1} : i));
    } else {
      setVenda([...venda, {...p, idCarrinho, tamanho, qtd: 1}]);
    }
    setProdSelecionado(null);
  };

  const upQtd = (idCarrinho, delta) => setVenda(venda.map(i => i.idCarrinho === idCarrinho ? {...i, qtd: Math.max(1, i.qtd + delta)} : i));

  return (
    <div className="h-screen flex bg-[#0f1115] text-white font-sans overflow-hidden">
      <aside className="w-20 lg:w-64 border-r border-white/10 bg-[#161920] flex flex-col p-4 z-10">
        <h1 className="hidden lg:block text-2xl font-black mb-10 pl-2">
          ZEN<span className="text-[#39ff14]">KAI</span> <span className="text-[10px] text-gray-500 uppercase tracking-widest align-top">PDV</span>
        </h1>
        <nav className="flex-1 space-y-2">
          {[{id: 'venda', icon: <ShoppingCart size={22}/>}, {id: 'estoque', icon: <Package size={22}/>}, {id: 'dashboard', icon: <BarChart3 size={22}/>}].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} className={`w-full flex items-center justify-center lg:justify-start gap-4 p-4 rounded-xl font-bold transition-all ${aba === a.id ? 'bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              {a.icon}
              <span className="hidden lg:block capitalize">{a.id}</span>
            </button>
          ))}
        </nav>
        <button onClick={() => { api.logout(); nav('/'); }} className="w-full flex justify-center lg:justify-start items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
          <LogOut size={22} /> <span className="hidden lg:block font-bold">Sair</span>
        </button>
      </aside>

      <main className="flex-1 flex flex-col p-8 overflow-hidden bg-[#0f1115] relative">
        
        {aba === 'dashboard' && (
          <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
            <h2 className="text-2xl font-black mb-8 text-[#39ff14] flex items-center gap-3"><TrendingUp/> DASHBOARD DE VENDAS</h2>
            
            {!dashData ? (
              <div className="flex-1 flex items-center justify-center text-[#39ff14] animate-pulse font-mono">CARREGANDO MÉTRICAS...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-[#161920] border border-white/10 p-6 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Faturamento Hoje</p>
                    <p className="text-3xl font-black text-white font-mono">R$ {dashData.faturamento_hoje.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#161920] border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#39ff14] opacity-5 rounded-bl-full"></div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Faturamento no Mês</p>
                    <p className="text-3xl font-black text-[#39ff14] font-mono">R$ {dashData.faturamento_mes.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#161920] border border-white/10 p-6 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ticket Médio (Mês)</p>
                    <p className="text-3xl font-black text-white font-mono">R$ {dashData.ticket_medio.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-[#161920] border border-white/10 p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 border-b border-white/10 pb-4">Receita por Forma de Pagamento (Mês)</h3>
                    <div className="space-y-4">
                      {['PIX', 'CARTAO', 'DINHEIRO'].map(tipo => {
                        const valor = dashData.pagamentos[tipo] || 0;
                        const porcentagem = dashData.faturamento_mes > 0 ? (valor / dashData.faturamento_mes) * 100 : 0;
                        return (
                          <div key={tipo}>
                            <div className="flex justify-between text-sm mb-1 font-bold">
                              <span>{tipo}</span> <span className="font-mono">R$ {valor.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-black rounded-full h-2">
                              <div className="bg-[#39ff14] h-2 rounded-full" style={{ width: `${porcentagem}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#161920] border border-white/10 p-6 rounded-2xl">
                     <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 border-b border-white/10 pb-4">Top 5 Produtos mais Vendidos</h3>
                     <div className="space-y-3">
                       {dashData.top_produtos.map((p, idx) => (
                         <div key={idx} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                           <span className="font-bold text-sm text-gray-200"><span className="text-[#39ff14] mr-2">#{idx+1}</span> {p.nome}</span>
                           <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white">{p.qtd} UNID.</span>
                         </div>
                       ))}
                       {dashData.top_produtos.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Nenhuma venda registrada.</p>}
                     </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {aba === 'venda' && (
          <div className="h-full flex flex-col">
             <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Buscar produto..." value={busca} onChange={e=>setBusca(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-[#161920] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-[#39ff14] transition-all shadow-inner text-lg font-mono" />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => setProdSelecionado(p)} disabled={p.estoque === 0} className="bg-[#161920] border border-white/5 p-5 rounded-2xl text-left hover:border-[#39ff14] hover:bg-[#39ff14]/5 transition-all flex flex-col disabled:opacity-30 disabled:cursor-not-allowed">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{p.categoria}</span>
                    <h3 className="font-bold text-base mb-2 flex-1">{p.nome}</h3>
                    <div className="flex justify-between items-end w-full">
                       <span className="text-xs px-2 py-1 bg-black rounded border border-white/5 text-gray-400 font-mono">ESTOQUE TOTAL: {p.estoque}</span>
                       <span className="text-[#39ff14] font-mono font-bold">R$ {p.preco.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {aba === 'estoque' && (
          <div className="h-full flex flex-col pb-4">
            <h2 className="text-2xl font-black mb-6 text-[#39ff14] flex items-center gap-3"><Package/> GERENCIADOR</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-160px)]">
              {/* FORM DE CADASTRO */}
              <div className="bg-[#161920] p-6 rounded-3xl border border-white/10 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleCadastro} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Nome</label>
                    <input required className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Descrição</label>
                    <textarea className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none resize-none h-20 text-sm" value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} placeholder="Detalhes do produto..."/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Preço (R$)</label>
                      <input required type="number" step="0.01" className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none font-mono text-[#39ff14]" value={form.preco} onChange={e=>setForm({...form, preco: e.target.value})}/>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Categoria</label>
                      <input required className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none" value={form.categoria} onChange={e=>setForm({...form, categoria: e.target.value})}/>
                    </div>
                  </div>
                  
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-400 uppercase">Grade de Tamanhos</label>
                      <button type="button" onClick={addGrade} className="text-[#39ff14] hover:text-white flex items-center gap-1 text-xs font-bold"><Plus size={14}/> ADICIONAR</button>
                    </div>
                    {grade.map((g, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input required placeholder="Tam" className="flex-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none font-mono text-sm" value={g.tamanho} onChange={e => updateGrade(index, 'tamanho', e.target.value)}/>
                        <input required type="number" placeholder="Qtd" className="w-24 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none font-mono text-sm" value={g.qtd} onChange={e => updateGrade(index, 'qtd', e.target.value)}/>
                        {grade.length > 1 && (
                          <button type="button" onClick={() => removeGrade(index)} className="p-3 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"><Trash2 size={18}/></button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[#39ff14] cursor-pointer">
                     <input type="file" ref={fileRef} onChange={e=>setForm({...form, img: e.target.files[0]})} className="hidden" id="up"/>
                     <label htmlFor="up" className="cursor-pointer flex flex-col items-center"><UploadCloud size={24} className="text-gray-500 mb-2"/> <span className="text-sm text-[#39ff14] font-bold">{form.img ? form.img.name : 'Anexar Imagem'}</span></label>
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-[#39ff14] text-black font-black py-4 rounded-xl hover:bg-white transition-all disabled:opacity-50">{loading ? 'SALVANDO...' : 'SALVAR PRODUTO'}</button>
                </form>
              </div>

              {/* LISTA DB */}
              <div className="bg-[#161920] p-6 rounded-3xl border border-white/10 overflow-y-auto custom-scrollbar">
                 <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 border-b border-white/10 pb-4">Produtos Registrados</h3>
                 <div className="space-y-3">
                   {produtos.map(p => (
                     <div key={p.id} className="flex justify-between items-center p-3 bg-black/40 border border-white/5 rounded-xl">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-black rounded border border-white/10 overflow-hidden"><img src={p.imagem || 'https://via.placeholder.com/40'} className="w-full h-full object-cover"/></div>
                          <div>
                            <p className="font-bold text-sm">{p.nome}</p>
                            <p className="text-[10px] text-gray-500 font-mono">QTD: {p.estoque} | R$ {p.preco.toFixed(2)}</p>
                          </div>
                       </div>
                       <button onClick={()=>excluirDb(p.id)} className="text-red-500 p-2 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><Trash2 size={16}/></button>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CARRINHO PDV */}
      {aba === 'venda' && (
        <section className="w-96 bg-[#161920] border-l border-white/10 flex flex-col shadow-2xl z-20">
          <div className="h-20 flex items-center px-6 bg-[#0f1115] border-b border-white/10">
             <h2 className="font-black text-lg flex items-center gap-3"><ShoppingCart className="text-[#39ff14]"/> PDV CHECKOUT</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {venda.map(i => (
              <div key={i.idCarrinho} className="bg-black/40 p-4 rounded-xl border border-white/5 relative">
                <button onClick={() => setVenda(venda.filter(x=>x.idCarrinho!==i.idCarrinho))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full z-10 hover:scale-110"><Trash2 size={12}/></button>
                <div className="mb-3">
                  <p className="font-bold text-sm leading-tight pr-4">{i.nome}</p>
                  <p className="text-xs text-gray-400 mt-1">Tamanho: <span className="text-white font-bold">{i.tamanho}</span></p>
                  <p className="text-[#39ff14] font-mono mt-1 text-sm">R$ {i.preco.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between bg-black rounded-lg p-1 border border-white/10">
                  <button onClick={()=>upQtd(i.idCarrinho, -1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">-</button>
                  <span className="font-bold text-sm w-8 text-center">{i.qtd}</span>
                  <button onClick={()=>upQtd(i.idCarrinho, 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-[#0f1115] border-t border-white/10">
             <div className="flex justify-between items-end mb-6">
                <span className="text-gray-500 text-xs font-bold uppercase">Subtotal</span>
                <span className="text-3xl font-black text-white font-mono">R$ {subtotal.toFixed(2)}</span>
             </div>
             <button disabled={venda.length===0} onClick={() => setModalPagamento(true)} className="w-full bg-[#39ff14] text-black font-black py-4 rounded-xl hover:bg-white transition-all disabled:opacity-30 flex justify-center items-center gap-2">
                <CheckCircle2 size={20}/> IR PARA PAGAMENTO
             </button>
          </div>
        </section>
      )}

      {/* MODAL 1: SELEÇÃO DE TAMANHO EXPRESS */}
      {prodSelecionado && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#161920] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg leading-tight">{prodSelecionado.nome}</h3>
                <p className="text-[#39ff14] font-mono mt-1">R$ {prodSelecionado.preco.toFixed(2)}</p>
              </div>
              <button onClick={() => setProdSelecionado(null)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full"><X size={16}/></button>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Selecione o Tamanho</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(prodSelecionado.tamanhos).map(([tam, qtd]) => (
                <button 
                  key={tam} disabled={qtd === 0} onClick={() => confirmarTamanhoVenda(prodSelecionado, tam)}
                  className="py-3 rounded-xl border border-white/10 font-mono font-bold hover:border-[#39ff14] hover:text-[#39ff14] transition-all disabled:opacity-20 disabled:cursor-not-allowed bg-black/50"
                >{tam}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TERMINAL DE PAGAMENTO COMPLETO */}
      {modalPagamento && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#161920] border border-[#39ff14]/30 p-8 rounded-3xl w-full max-w-4xl flex shadow-[0_0_50px_rgba(57,255,20,0.1)] h-[600px] overflow-hidden relative">
            
            <div className="flex-1 border-r border-white/10 pr-8 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><Users className="text-[#39ff14]"/> IDENTIFICAÇÃO</h2>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2 block">
                  <label className="text-xs font-bold text-gray-400 uppercase">Vincular Cliente (CPF / Nome / Tel)</label>
                  {!clienteSelecionado && (
                    <button onClick={() => setModalNovoCliente(true)} className="text-[#39ff14] text-xs font-bold hover:text-white flex items-center gap-1">
                      <Plus size={14}/> NOVO
                    </button>
                  )}
                </div>
                {!clienteSelecionado ? (
                  <div className="relative">
                    <input type="text" placeholder="Buscar no banco..." value={clienteBusca} onChange={(e)=>setClienteBusca(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl focus:outline-none focus:border-[#39ff14]" />
                    {clientesEncontrados.length > 0 && (
                      <div className="absolute top-full mt-2 w-full bg-[#0f1115] border border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl">
                        {clientesEncontrados.map(c => (
                          <div key={c.id} onClick={() => { setClienteSelecionado(c); setClienteBusca(''); setClientesEncontrados([]); }} className="p-4 hover:bg-[#39ff14]/10 cursor-pointer border-b border-white/5 last:border-0">
                            <p className="font-bold text-sm text-white">{c.nome}</p>
                            <p className="text-xs text-gray-500 mt-1">{c.email} | {c.telefone || 'Sem telefone'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-[#39ff14]/10 border border-[#39ff14]/30 p-4 rounded-xl">
                    <div>
                      <p className="font-bold text-[#39ff14]">{clienteSelecionado.nome}</p>
                      <p className="text-xs text-gray-400 mt-1">Cliente Vinculado</p>
                    </div>
                    <button onClick={() => setClienteSelecionado(null)} className="text-red-400 hover:text-red-500"><X size={20}/></button>
                  </div>
                )}
                {!clienteSelecionado && <p className="text-xs text-gray-500 mt-3">* Se não selecionar, a venda será para <b>Consumidor Final</b>.</p>}
              </div>

              <div className="mt-auto bg-black/50 p-6 rounded-2xl border border-white/5 relative">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Desconto de Balcão (Máx 50%)</h3>
                <div className="flex gap-2">
                  <select value={descontoTipo} onChange={(e)=>setDescontoTipo(e.target.value)} className="bg-[#161920] border border-white/10 rounded-xl px-4 focus:outline-none focus:border-[#39ff14]">
                    <option value="R$">R$</option>
                    <option value="%">%</option>
                  </select>
                  <input type="number" placeholder="0.00" value={descontoValor} onChange={(e)=>setDescontoValor(e.target.value)} className="flex-1 bg-[#161920] border border-white/10 p-4 rounded-xl focus:outline-none focus:border-[#39ff14] font-mono text-lg" />
                </div>
                {/* AVISO DE TRAVA DE DESCONTO */}
                {limiteExcedido && (
                  <p className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1">
                     Limite operacional excedido. Desconto ajustado para 50% do total.
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 pl-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><Banknote className="text-[#39ff14]"/> PAGAMENTO</h2>
                <button onClick={() => setModalPagamento(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {['DINHEIRO', 'CARTAO', 'PIX'].map(m => (
                  <button key={m} onClick={() => setMetodoPgto(m)} className={`py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-2 border transition-all ${metodoPgto === m ? 'bg-[#39ff14] text-black border-[#39ff14]' : 'bg-black/50 text-gray-400 border-white/10 hover:border-white/30'}`}>
                    {m === 'DINHEIRO' && <Banknote size={20}/>}
                    {m === 'CARTAO' && <CreditCard size={20}/>}
                    {m === 'PIX' && <QrCode size={20}/>}
                    <span className="text-xs uppercase">{m}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-4">
                {metodoPgto === 'DINHEIRO' && (
                  <div>
                     <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Valor Recebido (R$)</label>
                     <input type="number" value={valorRecebido} onChange={(e)=>setValorRecebido(e.target.value)} className="w-full bg-black border border-[#39ff14]/30 p-4 rounded-xl focus:outline-none focus:border-[#39ff14] font-mono text-2xl text-[#39ff14]" placeholder="0.00" />
                     {troco > 0 && <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl"><p className="text-sm text-orange-400 uppercase font-bold text-center">Troco a devolver: <span className="text-2xl block font-mono text-white mt-1">R$ {troco.toFixed(2)}</span></p></div>}
                  </div>
                )}
                {metodoPgto === 'CARTAO' && (
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Número de Parcelas</label>
                    <select value={parcelas} onChange={(e)=>setParcelas(Number(e.target.value))} className="w-full bg-black border border-white/10 p-4 rounded-xl focus:outline-none focus:border-[#39ff14] text-lg font-bold">
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                         <option key={n} value={n}>{n}x de R$ {(totalComDesconto/n).toFixed(2)} {n===1 ? '(À Vista)' : '(Sem Juros)'}</option>
                      ))}
                    </select>
                  </div>
                )}
                {metodoPgto === 'PIX' && (
                  <div className="flex flex-col items-center justify-center p-6 bg-black rounded-xl border border-[#39ff14]/30">
                    <QrCode size={64} className="text-[#39ff14] mb-4 opacity-50"/>
                    <p className="text-sm text-gray-400 text-center">Aguardando confirmação no terminal PIX da loja.</p>
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-white/10 pt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Subtotal</span>
                  <span className="font-mono text-white">R$ {subtotal.toFixed(2)}</span>
                </div>
                {descontoCalculado > 0 && (
                  <div className="flex justify-between items-center mb-4 text-red-400">
                    <span className="text-sm">Desconto Aplicado</span>
                    <span className="font-mono">- R$ {descontoCalculado.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end mb-6">
                  <span className="text-gray-200 text-sm font-bold uppercase tracking-widest">Total da Venda</span>
                  <span className="text-4xl font-black text-[#39ff14] font-mono">R$ {totalComDesconto.toFixed(2)}</span>
                </div>
                <button disabled={loading} onClick={processarPagamento} className="w-full bg-[#39ff14] text-black font-black py-5 rounded-xl hover:bg-white transition-all disabled:opacity-50 text-lg flex justify-center items-center gap-2">
                  {loading ? 'PROCESSANDO...' : 'FINALIZAR VENDA'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: RECIBO TÉRMICO NÃO-FISCAL */}
      {reciboData && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#fcfcfc] text-black p-8 rounded shadow-2xl w-full max-w-sm font-mono text-sm relative">
            <button onClick={() => setReciboData(null)} className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full hover:scale-110 shadow-lg"><X size={16}/></button>
            <div className="text-center mb-6 border-b-2 border-dashed border-black/20 pb-6">
               <h1 className="text-2xl font-black tracking-tighter">ZEN<span className="text-gray-400">KAI</span></h1>
               <p className="text-xs uppercase tracking-widest mt-1">Recibo Não Fiscal</p>
               <p className="text-xs mt-2">{reciboData.data}</p>
            </div>
            
            <p className="font-bold text-xs mb-4">Cliente: <span className="font-normal">{reciboData.cliente}</span></p>

            <div className="space-y-3 mb-6 border-b-2 border-dashed border-black/20 pb-6">
              <div className="flex justify-between text-xs font-bold border-b border-black/10 pb-1 mb-2"><span>QTD x ITEM</span><span>TOTAL</span></div>
              {reciboData.itens.map(i => (
                <div key={i.idCarrinho} className="flex justify-between items-start text-xs">
                  <span className="w-2/3">{i.qtd}x {i.nome} (Tam: {i.tamanho})</span>
                  <span>R$ {(i.preco * i.qtd).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 mb-6 border-b-2 border-dashed border-black/20 pb-6 text-xs">
              <div className="flex justify-between"><span>Subtotal</span><span>R$ {reciboData.subtotal.toFixed(2)}</span></div>
              {reciboData.desconto > 0 && <div className="flex justify-between text-red-600"><span>Desconto</span><span>- R$ {reciboData.desconto.toFixed(2)}</span></div>}
              <div className="flex justify-between font-black text-lg mt-2 pt-2 border-t border-black/10"><span>TOTAL</span><span>R$ {reciboData.total.toFixed(2)}</span></div>
            </div>

            <div className="text-xs space-y-1 mb-6">
              <div className="flex justify-between"><span>Pago via {reciboData.metodo}</span><span>R$ {reciboData.valorPago.toFixed(2)}</span></div>
              {reciboData.troco > 0 && <div className="flex justify-between font-bold"><span>Troco</span><span>R$ {reciboData.troco.toFixed(2)}</span></div>}
            </div>

            <div className="text-center">
              <button onClick={() => window.print()} className="w-full bg-black text-white font-bold py-3 rounded hover:bg-gray-800 flex items-center justify-center gap-2 mb-3">
                 <Printer size={16}/> Imprimir Via
              </button>
              <p className="text-[10px] text-gray-500 uppercase">Obrigado pela preferência!</p>
            </div>
          </div>
        </div>
      )}

      
      {modalNovoCliente && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#161920] border border-[#39ff14]/30 p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setModalNovoCliente(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X size={20}/></button>
            <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6"><Users className="text-[#39ff14]"/> NOVO CLIENTE</h2>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                await api.cadastrarCliente({ ...formCliente, senha: '123456', role: 'CLIENTE' });
                alert('Cliente cadastrado com sucesso!');
                setClienteBusca(formCliente.nome);
                setModalNovoCliente(false);
                setFormCliente({ nome: '', email: '', telefone: '' });
              } catch (err) {
                alert(err.message);
              } finally {
                setLoading(false);
              }
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                <input required type="text" value={formCliente.nome} onChange={e=>setFormCliente({...formCliente, nome: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Email (Para login online)</label>
                <input required type="email" value={formCliente.email} onChange={e=>setFormCliente({...formCliente, email: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Telefone / WhatsApp</label>
                <input required type="text" value={formCliente.telefone} onChange={e=>setFormCliente({...formCliente, telefone: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none text-white font-mono" />
              </div>
              <p className="text-xs text-gray-500">* A senha temporária do cliente será <b>123456</b>.</p>
              
              <button disabled={loading} type="submit" className="w-full bg-[#39ff14] text-black font-black py-4 rounded-xl hover:bg-white transition-all mt-4 disabled:opacity-50">
                {loading ? 'SALVANDO...' : 'CADASTRAR CLIENTE'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}