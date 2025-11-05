# Gerenciador de Inventário Pro

Este é um guia completo para a instalação e configuração do sistema Gerenciador de Inventário Pro em um ambiente de produção interno. A aplicação utiliza uma arquitetura full-stack com um frontend em React e um backend em Node.js (Express) que serve tanto a API quanto a interface do usuário, utilizando um banco de dados MariaDB em um servidor Ubuntu.

## Arquitetura

A aplicação é dividida em dois componentes principais dentro do mesmo repositório, mas é executada como um único serviço.

```
/var/www/Inventario/
├── inventario-api/         <-- Backend (API Node.js e servidor web)
│   ├── certs/              <-- Certificados SSL (gerados)
│   ├── node_modules/
│   ├── package.json
│   └── server.js           <-- Ponto de entrada principal
│
├── node_modules/           <-- Dependências do Frontend
├── dist/                   <-- Pasta de produção do Frontend (servida pelo backend)
├── index.html              <-- Arquivos do Frontend (React)
├── package.json
└── ... (outros arquivos do frontend)
```

**Componentes:**

1.  **Frontend (Diretório Raiz: `/var/www/Inventario`)**: Uma aplicação React (Vite + TypeScript) responsável pela interface do usuário. Seus arquivos estáticos são compilados para a pasta `dist`.
2.  **Backend (Pasta `inventario-api`)**: Um servidor Node.js/Express que serve a API em `/api/*` e todos os arquivos do frontend. Este é o único processo que precisa ser executado.

---

## Passo a Passo para Instalação

Siga estes passos para configurar e executar a aplicação.

### Passo 0: Obtendo os Arquivos da Aplicação com Git

1.  **Crie o Diretório de Trabalho (se não existir):**
    ```bash
    sudo mkdir -p /var/www
    sudo chown -R $USER:$USER /var/www
    ```

2.  **Instale o Git:**
    ```bash
    sudo apt update && sudo apt install git
    ```

3.  **Clone o Repositório da Aplicação:**
    ```bash
    cd /var/www/
    git clone https://github.com/marceloreis098/teste4.git Inventario
    ```

### Passo 1: Configuração do Banco de Dados (MariaDB)

1.  **Instale e Proteja o MariaDB Server:**
    ```bash
    sudo apt install mariadb-server
    sudo mysql_secure_installation
    ```

2.  **Crie o Banco de Dados e o Usuário:**
    Acesse o console do MariaDB (`sudo mysql -u root -p`) e execute os comandos a seguir, substituindo `'sua_senha_forte'` por uma senha segura.
    ```sql
    CREATE DATABASE inventario_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER 'inventario_user'@'localhost' IDENTIFIED BY 'sua_senha_forte';
    GRANT ALL PRIVILEGES ON inventario_pro.* TO 'inventario_user'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;
    ```
    
### Passo 2: Configuração do Firewall (UFW)

Vamos permitir o tráfego na porta padrão HTTPS (443) e SSH.

1.  **Adicione as Regras e Habilite:**
    ```bash
    sudo ufw allow ssh          # Permite acesso SSH
    sudo ufw allow 443/tcp      # Permite acesso à aplicação via HTTPS
    sudo ufw enable
    ```

### Passo 3: Redirecionamento de Porta (443 para 3001)

Para acessar a aplicação em `https://<ip-do-servidor>` sem especificar a porta, precisamos redirecionar o tráfego da porta padrão HTTPS (443) para a porta onde a aplicação está rodando (3001). Isso evita a necessidade de executar o processo Node.js com privilégios de superusuário, o que é uma boa prática de segurança.

1.  **Habilite o Redirecionamento no UFW:**
    Edite o arquivo de configuração principal do UFW.
    ```bash
    sudo nano /etc/default/ufw
    ```
    Altere a linha `DEFAULT_FORWARD_POLICY="DROP"` para `DEFAULT_FORWARD_POLICY="ACCEPT"`. Salve e feche o arquivo (Ctrl+X, Y, Enter).

2.  **Adicione as Regras de Redirecionamento:**
    Edite o arquivo de regras do UFW que é lido antes das regras principais.
    ```bash
    sudo nano /etc/ufw/before.rules
    ```
    Adicione o seguinte bloco de código no **topo do arquivo**, antes da linha `*filter`.
    ```
    # Port forwarding rule for HTTPS -> 3001
    *nat
    :PREROUTING ACCEPT [0:0]
    -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 3001
    COMMIT
    ```
    Salve e feche o arquivo.

3.  **Recarregue o Firewall para Aplicar as Mudanças:**
    ```bash
    sudo ufw disable
    sudo ufw enable
    ```
    O firewall será recarregado com as novas regras de redirecionamento.

### Passo 4: Configuração do Backend (Servidor Unificado)

1.  **Instale o Node.js e o PM2:**
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    sudo npm install -g pm2
    ```

2.  **Instale as Dependências da API:**
    ```bash
    cd /var/www/Inventario/inventario-api
    npm install
    ```

3.  **Crie o Arquivo de Variáveis de Ambiente (`.env`):**
    ```bash
    # Certifique-se de estar em /var/www/Inventario/inventario-api
    nano .env
    ```
    Adicione o seguinte conteúdo. A porta `3001` é a porta interna onde a aplicação vai rodar.
    ```
    DB_HOST=localhost
    DB_USER=inventario_user
    DB_PASSWORD=sua_senha_forte
    DB_DATABASE=inventario_pro
    API_PORT=3001
    BCRYPT_SALT_ROUNDS=10
    ```

4.  **Habilite o HTTPS:**
    Gere um certificado autoassinado para o servidor.
    ```bash
    # Certifique-se de estar em /var/www/Inventario/inventario-api
    npm run generate-certs
    ```
    Isso criará uma pasta `certs` que o servidor usará automaticamente.

### Passo 5: Configuração do Frontend

1.  **Instale as Dependências do Frontend:**
    ```bash
    # Navegue até a pasta raiz do projeto
    cd /var/www/Inventario
    npm install 
    ```

2.  **Compile a Aplicação para Produção:**
    Este passo cria a pasta `dist` que será servida pelo backend.
    ```bash
    # Certifique-se de estar em /var/www/Inventario
    npm run build
    ```

### Passo 6: Executando a Aplicação Unificada com PM2

Agora, precisamos de apenas um processo `pm2` para rodar toda a aplicação.

1.  **Inicie o Servidor com o PM2:**
    ```bash
    # Navegue para a pasta da API
    cd /var/www/Inventario/inventario-api
    
    # Inicia o servidor que serve tanto a API quanto o frontend
    npx pm2 start server.js --name inventario-app
    ```

2.  **Configure o PM2 para Iniciar com o Servidor:**
    ```bash
    npx pm2 startup
    ```
    O comando acima irá gerar um outro comando que você precisa copiar e executar.

3.  **Salve a Configuração de Processos do PM2:**
    ```bash
    npx pm2 save
    ```

4.  **Gerencie o Processo:**
    -   Ver status: `npx pm2 list`
    -   Ver logs: `npx pm2 logs inventario-app`
    -   Reiniciar: `npx pm2 restart inventario-app`

### Passo 7: Acesso à Aplicação

Abra o navegador no endereço do seu servidor. Graças ao redirecionamento de porta, não é necessário especificar a porta.

`https://<ip-do-servidor>`

**Aviso:** Como estamos usando um certificado autoassinado, seu navegador exibirá um alerta de segurança. Você precisará aceitar o risco para continuar.

A aplicação deve carregar a tela de login. Use as credenciais de administrador padrão para acessar. É altamente recomendável alterar a senha padrão no primeiro login.

---

## Atualizando a Aplicação com Git

Para atualizar a aplicação, o processo é semelhante, mas agora mais simples.

1.  **Baixar as Atualizações:**
    ```bash
    cd /var/www/Inventario
    git pull origin main
    ```

2.  **Aplicar as Mudanças:**
    ```bash
    # Instale dependências do backend (se houver)
    cd /var/www/Inventario/inventario-api
    npm install
    
    # Instale dependências e recompile o frontend
    cd /var/www/Inventario
    npm install
    npm run build
    
    # Reinicie o único processo da aplicação
    npx pm2 restart inventario-app
    ```
---

## Configuração da API do Gemini

(Esta seção permanece a mesma)

Para habilitar as funcionalidades de Inteligência Artificial do sistema, como o assistente de relatórios, é necessário configurar uma chave de API do Google Gemini.

### 1. Obtenha sua Chave de API

1.  Acesse o **Google AI Studio**: [https://aistudio.google.com/](https://aistudio.google.com/)
2.  Faça login com sua conta Google.
3.  No menu à esquerda, clique em **"Get API key"** e depois em **"Create API key"**.
4.  Copie a chave de API gerada.

### 2. Adicione a Chave ao Backend

A chave deve ser adicionada como uma variável de ambiente no servidor para garantir a segurança.

1.  Navegue até a pasta da API:
    ```bash
    cd /var/www/Inventario/inventario-api
    ```

2.  Abra o arquivo `.env` para edição:
    ```bash
    nano .env
    ```

3.  Adicione a seguinte linha ao final do arquivo, substituindo `sua-chave-api-do-gemini-aqui` pela chave que você copiou:
    ```env
    # ... (outras variáveis existentes)
    API_KEY=sua-chave-api-do-gemini-aqui
    ```

### 3. Reinicie a API

Para que a nova variável de ambiente seja carregada, reinicie o processo da aplicação usando o PM2:

```bash
npx pm2 restart inventario-app
```

Após esses passos, a integração com o Gemini estará ativa.