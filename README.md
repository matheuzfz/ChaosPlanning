# 🎲 ChaosPlanning

> **Planning Poker caótico, gamificado e em tempo real para equipes ágeis modernas.**

ChaosPlanning é uma ferramenta interativa e dinâmica de Planning Poker projetada para tornar as sessões de estimativa ágil produtivas, visuais e divertidas. Com uma arquitetura moderna baseada em **FastAPI**, **WebSockets nativos** e **React (Vite)**, o estado do jogo é efêmero e mantido em memória, proporcionando comunicação bidirecional instantânea sem a sobrecarga de bancos de dados persistentes.

---

## 🚀 Acesso ao Ambiente de Produção (Temporário)

A aplicação já se encontra implementada e disponível para testes da equipa na AWS (EC2 via Docker Compose)!

🌐 **Link de Acesso Direto**: [http://35.175.178.176](http://35.175.178.176)

> [!NOTE]
> **Aviso sobre Conexão HTTP (Sem SSL/HTTPS)**:
> Por se tratar de uma instância temporária de desenvolvimento e validação que ainda não possui certificado SSL (HTTPS) configurado, o seu navegador poderá apresentar um alerta de site **"Não seguro"**. Pode avançar tranquilamente: o acesso é totalmente permitido e seguro para efeitos de teste.

### 🎮 Como Testar com a Equipa:
1. **Aceder à Aplicação**: Abra o link [http://35.175.178.176](http://35.175.178.176) no navegador.
2. **Criar uma Sala**: Qualquer membro da equipa pode aceder ao link e criar uma nova sala com PIN numérico de segurança.
3. **Partilhar as Credenciais**: Copie o **ID da Sala** e o **PIN** e partilhe com os colegas para que todos entrem na mesma mesa em tempo real.
4. **Realizar o Planning Poker**: Comecem a estimar histórias com cartas Fibonacci, animações de arremesso de itens e cálculo automático da moda estatística!

---

## 🚀 Funcionalidades Principais

- **Mesa de Poker em Tempo Real**: Conexão bidirecional via WebSockets com sincronização instantânea de estado entre todos os membros da equipe.
- **Distribuição Circular / Elíptica de Avatares**: Jogadores posicionados harmonicamente ao redor da mesa com trigonometria responsiva.
- **Biblioteca de Personagens & Nickname Editável**:
  - Seleção de avatares temáticos com emojis (`🐱`, `🎮`, `🖨️`, `💻`, `🧙‍♂️`, `🤖`, `👾`, `🚀`).
  - Edição inline de nickname no cabeçalho com transmissão em tempo real (`update_profile`).
- **Deck de Cartas de Baralho Reais**:
  - Escala Fibonacci estrita: `1`, `2`, `3`, `5`, `8` e `13`.
  - Design autêntico de carta com cantos arredondados, fundo off-white e números nos cantos invertidos.
  - Animação com **Framer Motion**: ao votar, a carta translada ("voa") suavemente do deck até o centro da mesa.
- **Painel do Scrum Master Aprimorado**:
  - Exibição destacada do **ID da Sala** e **Senha (PIN)**.
  - Compartilhamento seguro com link limpo (sem PIN na URL): `🔗 Junte-se ao ChaosPlanning! ...`.
  - Controles exclusivos protegidos por `master_token`: **Revelar Votos** e **Limpar Mesa**.
  - Cálculo estatístico automático da **Moda** (valor mais frequente), com suporte a empates multimodais.
- **Gamificação & Brawls**: Suporte a eventos customizados, como o arremesso de itens virtuais (`throw_item`) entre participantes.
- **Tema Claro / Escuro (Dark Mode)**:
  - Alternância fluida com persistência no `localStorage`.
  - Mesa estilo cassino com feltro verde esmeralda no tema claro e feltro chumbo/azul marinho no dark mode.

---

## 🛠️ Stack Tecnológica

### Backend
- **Python 3.11+**
- **FastAPI**: Framework web moderno, assíncrono e de alta performance.
- **WebSockets (Nativo)**: Comunicação bidirecional e eventos em tempo real.
- **Uvicorn**: Servidor ASGI rápido para Python.
- **Pydantic v2**: Validação estrita de schemas e payloads com tipagem estática (Type Hints).
- **Pytest**: Suíte completa de testes unitários para a lógica de negócio e estatística.

### Frontend
- **React 18**: Biblioteca para interfaces declarativas e componentes reativos.
- **Vite**: Build tool e servidor de desenvolvimento ultra-rápido.
- **Tailwind CSS**: Estilização utilitária com suporte a `darkMode: 'class'` e design responsivo.
- **Framer Motion**: Animações fluidas de arremesso de cartas e transições de interface.
- **React Router DOM (v6)**: Gerenciamento de rotas declarativas (`/`, `/room/:roomId`, `/master/:roomId`).
- **Lucide React**: Ícones limpos e modernos.

### CI / CD & Infraestrutura
- **Terraform**: Infraestrutura como código (IaC) para provisionamento de instâncias EC2 e Security Groups na AWS.
- **Docker & Docker Compose**: Containerização e orquestração de microsserviços (Frontend Nginx + Backend FastAPI).
- **GitHub Actions**: Pipeline automatizada com aprovação manual para ambiente de produção, testes do backend e build do frontend.

---

## 🔒 Segurança e Regras de Negócio

1. **Escala Estrita de Votos**: Apenas os valores `1, 2, 3, 5, 8 e 13` são aceitos. Votos fora dessa escala são rejeitados tanto pelo backend quanto pelo frontend.
2. **PIN Numérico de Segurança**: Salas protegidas por PIN numérico de 4 a 6 dígitos. O PIN não é exposto na URL de compartilhamento, evitando que fique salvo no histórico do navegador.
3. **Master Token Criptográfico**: Gerado de forma segura no momento da criação da sala. Apenas o portador desse token tem permissão para revelar votos ou reiniciar a rodada.
4. **Cálculo da Moda Estatística**: Ao revelar os votos, o sistema computa a frequência dos números e apresenta a moda (ou modas empatadas).
5. **Estado Efêmero em Memória**: Nenhuma informação sensível ou histórico de rodadas é salvo em disco ou banco de dados.

---

## 📦 Como Executar Localmente

### Pré-requisitos
- **Python 3.11+** instalado
- **Node.js 18+** e **npm** instalados
- **Git** instalado

---

### 1. Clonar o Repositório

```bash
git clone https://github.com/matheuzfz/ChaosPlanning.git
cd ChaosPlanning
```

---

### 2. Executar o Backend (FastAPI na porta 8000)

Abra um terminal na raiz do projeto:

```bash
# Entrar no diretório do backend
cd backend

# Criar o ambiente virtual Python
python -m venv .venv

# Ativar o ambiente virtual:
# No Windows (PowerShell):
.venv\Scripts\Activate.ps1
# No Windows (CMD):
.venv\Scripts\activate.bat
# No Linux / macOS:
source .venv/bin/activate

# Instalar as dependências
pip install -r requirements.txt

# Iniciar o servidor com recarregamento automático
uvicorn app.main:app --reload --port 8000
```

O servidor estará rodando em: **`http://localhost:8000`**
Documentação interativa Swagger: **`http://localhost:8000/docs`**

#### Rodar Testes do Backend (Pytest):
```bash
# Estando dentro da pasta backend com a venv ativada:
pytest

# Ou a partir da raiz do repositório:
pytest backend/tests
```

---

### 3. Executar o Frontend (React / Vite na porta 5173)

Abra outro terminal na raiz do projeto:

```bash
# Entrar no diretório do frontend
cd frontend

# Instalar as dependências do Node.js
npm install

# Iniciar o servidor de desenvolvimento Vite
npm run dev
```

O frontend estará acessível em: **`http://localhost:5173`**

#### Validar o Build de Produção do Frontend:
```bash
npm run build
```

---

### 4. Executar com Docker Compose (Ambiente Completo)

```bash
# Na raiz do repositório
docker-compose up --build
```

O frontend ficará disponível em **`http://localhost`** e o backend em **`http://localhost:8000`**.

---

## 🧭 Rotas da Aplicação

| Rota | Descrição |
| :--- | :--- |
| `/` | **Home**: Formulário para criar uma nova sala ou entrar com Nome, ID e PIN. |
| `/room/:roomId` | **Mesa de Votação**: Onde os jogadores visualizam a mesa, selecionam cartas no deck e veem os avatares dos colegas. |
| `/master/:roomId` | **Painel Master**: Painel do Scrum Master com credenciais em destaque, mesa em tempo real e botões para **Revelar Votos** e **Limpar Mesa**. |

---

## 🤖 Integração Contínua e Deploy (CI/CD)

A pipeline do GitHub Actions em `.github/workflows/ci.yml` unifica a validação da aplicação e o deploy de infraestrutura na AWS:
- **`app-tests`**: Executa testes de Python e build do Frontend com **Path Filtering** inteligente.
- **`terraform-plan`**: Inicializa, valida e gera o plano de execução (`tfplan`) sempre que há alterações em `infraestrutura/**`.
- **`terraform-apply`**: Executa a aplicação do Terraform em ambiente `production` após aprovação manual por revisores obrigatórios configurados no GitHub.

---

## 📄 Licença

Este projeto é distribuído sob os termos da licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.
