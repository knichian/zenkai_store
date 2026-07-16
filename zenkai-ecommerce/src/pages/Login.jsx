import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, UserCircle } from 'lucide-react';
import { api } from '../services/api';

export default function Login() {
  const [abaAtiva, setAbaAtiva] = useState('cliente'); // 'cliente' ou 'vendedor'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      
      const resposta = await api.login(email, senha, abaAtiva);
      
     
      console.log("Login bem sucedido:", resposta);

      // Redireciona baseado no papel (role)
      if (resposta.role === 'cliente') {
        navigate('/loja');
      } else if (resposta.role === 'vendedor') {
        navigate('/pdv');
      }
    } catch (err) {
      setErro('Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Container Principal (Estética Minimalista Técnica) */}
      <div className="w-full max-w-md bg-zenkai-surface border border-zenkai-border rounded-xl p-8 shadow-2xl">
        
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tighter">
            ZEN<span className="text-zenkai-neonBlue">KAI</span>
          </h1>
        </div>

        {/* Toggle de Abas (Cliente / Vendedor) */}
        <div className="flex p-1 bg-black/50 rounded-lg mb-8 border border-zenkai-border">
          <button
            onClick={() => setAbaAtiva('cliente')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              abaAtiva === 'cliente' 
                ? 'bg-zenkai-surface text-zenkai-neonBlue shadow-sm border border-zenkai-border' 
                : 'text-zenkai-textMuted hover:text-white'
            }`}
          >
            Cliente
          </button>
          <button
            onClick={() => setAbaAtiva('vendedor')}
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
        <form onSubmit={handleLogin} className="space-y-5">
          {erro && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-lg text-center">
              {erro}
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
                className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-zenkai-border rounded-lg focus:outline-none focus:border-zenkai-neonBlue focus:ring-1 focus:ring-zenkai-neonBlue text-white placeholder-zenkai-textMuted transition-all"
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
                className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-zenkai-border rounded-lg focus:outline-none focus:border-zenkai-neonBlue focus:ring-1 focus:ring-zenkai-neonBlue text-white placeholder-zenkai-textMuted transition-all"
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
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}