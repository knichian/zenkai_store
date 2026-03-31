
### organização de privilegios
  - 3 niveis de privilegio:
    - admin (alto)
      - requisição de "Bearer"
      - requisição de atributo "role" como "admin"
    - cliente (medio)
      - requisição de "Bearer"
      - sem requição de atributo "role" como valor especifico
    - visitante (baixo)
      - sem requisição de "Bearer"
      - ser requisição de role especifico

--- 

### coisas que a API precisa enviar
- admin:
  - (herdar itens do cliente)
- cliente:
  - (herdar itens do visitante)
  - enviar header "Bearer"
- visitate:
  - informações para card de produto
  - informações para pagina de produto
  - informações para galeria de produtos
  - barra de pesquisa de produto
  - navbar (?)

--- 

### coisas que a API precisa receber
  - admin: 
    - requisição de contas esperando para serem ativadas
    - requisição de privilegios atuais de contas
    - ativação de novas contas
    - elevação de privilegios para contas existentes
    - cadastra produtos (?)
    - capacidade de upload de imagens
  - cliente:
    - 
  - visitante: 
    - informações para cadastro de contas

--- 

### features planejadas

- sistema de controle de vendas:
  - promoções 
- sistema de controle de estoque/abastecimento:
- sistema logistica de entrega:
- sistema de analise de informações:
  - ( vendas/custos/faturamento/lucro/etc... )

--- 

### disordered brainstorm
  - sistema de login
    - cliente
      - sistema de personalização/personificação (?)
    - admin
      - alterações de estoque
      - 
    - visitantes
      - novidades
  - sistema de cadastro
  - galeria de produtos para visitantes
  - promoções

--- 

### pensar mais depois

- sistema logistica de entrega (!)
- sistema de controle de estoque (!)
