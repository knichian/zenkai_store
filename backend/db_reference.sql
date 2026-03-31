-- 1. Criação das Entidades Independentes

CREATE TABLE Categoria (
    ID_Categoria INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Descricao TEXT
);

CREATE TABLE Cliente (
    ID_Cliente INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(150) NOT NULL,
    Email VARCHAR(150) UNIQUE NOT NULL,
    Senha VARCHAR(255) NOT NULL,
    Telefone VARCHAR(20),
    Endereco TEXT,
    Data_Cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Tipo_Cliente ENUM('PF', 'PJ') NOT NULL -- Indicador do tipo de subclasse
);

-- 2. Subclasses de Cliente

CREATE TABLE Pessoa_Fisica (
    ID_Cliente INT PRIMARY KEY,
    CPF VARCHAR(14) UNIQUE NOT NULL,
    Data_Nascimento DATE,
    FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente) ON DELETE CASCADE
);

CREATE TABLE Pessoa_Juridica (
    ID_Cliente INT PRIMARY KEY,
    CNPJ VARCHAR(18) UNIQUE NOT NULL,
    Razao_Social VARCHAR(150) NOT NULL,
    Inscricao_Estadual VARCHAR(50),
    FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente) ON DELETE CASCADE
);

-- 3. Entidades Dependentes

CREATE TABLE Produto (
    ID_Produto INT AUTO_INCREMENT PRIMARY KEY,
    ID_Categoria INT NOT NULL,
    Nome VARCHAR(150) NOT NULL,
    Descricao TEXT,
    Preco_Atual DECIMAL(10, 2) NOT NULL,
    Quantidade_Estoque INT NOT NULL DEFAULT 0,
    FOREIGN KEY (ID_Categoria) REFERENCES Categoria(ID_Categoria)
);

CREATE TABLE Pedido (
    ID_Pedido INT AUTO_INCREMENT PRIMARY KEY,
    ID_Cliente INT NOT NULL,
    Data_Pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
    Status_Pedido VARCHAR(50) NOT NULL,
    Valor_Total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente)
);

-- 4. Entidade Associativa (N:M)

CREATE TABLE ItensPedido (
    ID_Pedido INT NOT NULL,
    ID_Produto INT NOT NULL,
    Quantidade INT NOT NULL,
    Preco_Unitario DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (ID_Pedido, ID_Produto), -- Chave primária composta
    FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido) ON DELETE CASCADE,
    FOREIGN KEY (ID_Produto) REFERENCES Produto(ID_Produto)
);

-- 5. Superclasse Pagamento

CREATE TABLE Pagamento (
    ID_Pagamento INT AUTO_INCREMENT PRIMARY KEY,
    ID_Pedido INT NOT NULL,
    Data_Hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    Valor DECIMAL(10, 2) NOT NULL,
    Status VARCHAR(50) NOT NULL,
    Tipo_Pagamento ENUM('CARTAO', 'PIX', 'BOLETO') NOT NULL, -- Indicador da subclasse
    FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido)
);

-- 6. Subclasses de Pagamento

CREATE TABLE Pagamento_Cartao (
    ID_Pagamento INT PRIMARY KEY,
    Numero_Cartao VARCHAR(20) NOT NULL, -- Lembre-se de salvar apenas os 4 últimos dígitos por segurança na prática
    Nome_Titular VARCHAR(100) NOT NULL,
    Parcelas INT NOT NULL DEFAULT 1,
    FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE
);

CREATE TABLE Pagamento_Pix (
    ID_Pagamento INT PRIMARY KEY,
    Chave_Pix VARCHAR(100) NOT NULL,
    Codigo_Transacao VARCHAR(100) UNIQUE NOT NULL,
    FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE
);

CREATE TABLE Pagamento_Boleto (
    ID_Pagamento INT PRIMARY KEY,
    Codigo_Barras VARCHAR(100) UNIQUE NOT NULL,
    Data_Vencimento DATE NOT NULL,
    FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE
);