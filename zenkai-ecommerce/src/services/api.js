// const BASE_URL = 'http://localhost:8000/zenkai/api';
const BASE_URL = '';

const getAuth = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

const parseProduto = (p) => ({
  ...p, 
  tamanhos: p.tamanhos ? JSON.parse(p.tamanhos) : {}
});

export const api = {
  getProdutos: async () => {
    const res = await fetch(`${BASE_URL}/produtos`);
    if (!res.ok) throw new Error('Erro ao carregar');
    const data = await res.json();
    return data.map(parseProduto);
  },

  criarProduto: async (formData) => {
    const res = await fetch(`${BASE_URL}/produtos/cadastro`, {
      method: 'POST', headers: getAuth(), body: formData
    });
    if (!res.ok) throw new Error('Falha no cadastro');
    return res.json();
  },

  excluirProduto: async (id) => {
    const res = await fetch(`${BASE_URL}/produtos/${id}`, { method: 'DELETE', headers: getAuth() });
    if (!res.ok) throw new Error('Falha ao excluir');
    return res.json();
  },

  checkout: async (pedido) => {
    const res = await fetch(`${BASE_URL}/checkout`, {
      method: 'POST',
      headers: { ...getAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido)
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erro no checkout');
    }
    return res.json();
  },

  buscarClientes: async (query) => {
    const res = await fetch(`${BASE_URL}/clientes/buscar?q=${query}`, { headers: getAuth() });
    if (!res.ok) return [];
    return res.json();
  },

  cadastrarCliente: async (cliente) => {
    const res = await fetch(`${BASE_URL}/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erro ao cadastrar cliente');
    }
    return res.json();
  },

  getDashboard: async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { headers: getAuth() });
    if (!res.ok) throw new Error('Erro ao carregar dashboard');
    return res.json();
  },

  login: async (email, senha) => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha })
    });
    if (!res.ok) throw new Error('Credenciais recusadas');
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('nome', data.nome);
    return data;
  },

  logout: () => {
    localStorage.clear();
  }
};
