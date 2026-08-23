import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, UserCircle, User } from 'lucide-react';
import { api } from '../services/api';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('cliente');
  
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setLoading(true);

    if (isLogin) {
      // --- MODO LOGIN ---
      try {
        const resposta = await api.login(email, senha);
        const userRole = localStorage.getItem('role') || resposta.role;
        
        if (userRole === 'CLIENTE') {
          navigate('/loja');
        } else if (userRole === 'ADMIN') {
          navigate('/pdv');
        } else {
          abaAtiva === 'cliente' ? navigate('/loja') : navigate('/pdv');
        }
      } catch (err) {
        // Mensagem de erro padronizada exigida
        setErro('Conta ou senha incorretas.');
      } finally {
        setLoading(false);
      }
    } else {
      // --- MODO CADASTRO ---
      try {
        //cadastro SEMPRE força a criação de um CLIENTE
        const response = await fetch('http://127.0.0.1:8000/zenkai/api/cadastro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome,
            email: email,
            senha: senha,
            role: 'CLIENTE', // Fixo como cliente
            tipo_cliente: 'PF'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Erro ao cadastrar');
        }

        setSucesso('Conta criada com sucesso! Faça seu login.');
        setIsLogin(true);
        setSenha('');
      } catch (err) {
        setErro(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zenkai-bg">
      <div className="w-full max-w-md bg-zenkai-surface border border-zenkai-border rounded-xl p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tighter text-white">
            ZEN<span className="text-zenkai-neonBlue">KAI</span>
          </h1>
          <p className="text-zenkai-textMuted mt-2 text-sm">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta no sistema'}
          </p>
        </div>

        {/* Toggle de Abas */}
        <div className="flex p-1 bg-black/50 rounded-lg mb-8 border border-zenkai-border">
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('cliente');
              setErro('');
              setSucesso('');
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              abaAtiva === 'cliente' 
                ? 'bg-zenkai-surface text-zenkai-neonBlue shadow-sm border border-zenkai-border' 
                : 'text-zenkai-textMuted hover:text-white'
            }`}
          >
            Cliente
          </button>
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('vendedor');
              setIsLogin(true); // Força sempre para login na aba vendedor
              setErro('');
              setSucesso('');
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              abaAtiva === 'vendedor' 
                ? 'bg-zenkai-surface text-zenkai-neonGreen shadow-sm border border-zenkai-border' 
                : 'text-zenkai-textMuted hover:text-white'
            }`}
          >
            Vendedor (PDV)
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {erro && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold rounded-lg text-center transition-all">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="p-3 bg-green-500/10 border border-green-500/50 text-green-500 text-sm rounded-lg text-center transition-all">
              {sucesso}
            </div>
          )}

          {!isLogin && abaAtiva === 'cliente' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-medium text-zenkai-textMuted">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zenkai-textMuted" />
                </div>
                <input
                  type="text"
                  required={!isLogin}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-zenkai-border rounded-lg focus:outline-none focus:border-zenkai-neonBlue text-white placeholder-zenkai-textMuted transition-all"
                  placeholder="Seu nome"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-zenkai-textMuted">Email ou ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {abaAtiva === 'cliente' ? <Mail className="h-5 w-5 text-zenkai-textMuted" /> : <UserCircle className="h-5 w-5 text-zenkai-textMuted" />}
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-zenkai-border rounded-lg focus:outline-none focus:border-zenkai-neonBlue text-white placeholder-zenkai-textMuted transition-all"
                placeholder={abaAtiva === 'cliente' ? "cliente@zenkai.com" : "vendedor@zenkai.com"}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zenkai-textMuted">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-zenkai-textMuted" />
              </div>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-zenkai-border rounded-lg focus:outline-none focus:border-zenkai-neonBlue text-white placeholder-zenkai-textMuted transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-black transition-all transform active:scale-95 ${
              abaAtiva === 'cliente' 
                ? 'bg-zenkai-neonBlue hover:bg-[#00c8ff] shadow-[0_0_15px_rgba(0,229,255,0.3)]' 
                : 'bg-zenkai-neonGreen hover:bg-[#2ce010] shadow-[0_0_15px_rgba(57,255,20,0.3)]'
            }`}
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar no Sistema' : 'Criar Conta')}
          </button>
        </form>

        {/* Botão de Alternância - SÓ APARECE NA ABA DE CLIENTES */}
        {abaAtiva === 'cliente' && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErro('');
                setSucesso('');
              }}
              className="text-sm text-zenkai-textMuted hover:text-white transition-colors"
            >
              {isLogin ? 'Ainda não tem conta? Cadastre-se' : 'Já tem uma conta? Faça Login'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}