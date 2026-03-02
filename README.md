# 🎾 Aniversário - Severo · Torneio de Beach Tennis

Sistema completo de gerenciamento de torneio de beach tennis com sorteio animado, fase de grupos e chave de playoff.

## Deploy no Railway

### 1. Criar o banco de dados
1. No Railway, crie um novo projeto
2. Adicione um serviço **PostgreSQL**
3. Copie a `DATABASE_URL` do PostgreSQL

### 2. Deploy da aplicação
1. Adicione um serviço **GitHub Repo** (ou faça push deste código)
2. Configure as variáveis de ambiente no serviço:
   ```
   DATABASE_URL=<sua DATABASE_URL do PostgreSQL>
   NODE_ENV=production
   PORT=3000
   ```
3. O Railway vai usar o `railway.toml` automaticamente para build e start

### 3. Acessar
Após o deploy, acesse a URL gerada pelo Railway. Toda a galera pode acessar pelo celular!

## Desenvolvimento local

### Pré-requisitos
- Node.js 18+
- PostgreSQL rodando localmente (ou use um Railway dev environment)

### Setup
```bash
# Backend
cd backend
cp .env.example .env
# Edite .env com sua DATABASE_URL local
npm install
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

Frontend roda em `http://localhost:5173`, backend em `http://localhost:3001`.

## Funcionalidades

### Configuração do Torneio
- **Modo 1 - Jogadores individuais**: Adicione os nomes, o sistema sorteia as duplas E os grupos automaticamente com animação
- **Modo 2 - Duplas + Grupos aleatórios**: Adicione as duplas prontas, sorteio dos grupos automaticamente
- **Modo 3 - Duplas + Grupos manuais**: Adicione as duplas e escolha o grupo de cada uma

### Fase de Grupos
- Grupos de 3 (padrão). Se não der pra fazer só com 3, usa grupos de 4 — o mínimo possível
- Round-robin dentro de cada grupo (todos contra todos)
- Classificação ao vivo: Vitórias → Saldo de games → % de games ganhos
- Top 2 de cada grupo se classificam

### Playoffs
- Chave de R16 → R8 → R4 → Final
- Times extras recebem **bye** automaticamente (melhores colocados na fase de grupos)
- Inserção de placar direto pelo celular

### Animação do Sorteio
- Animação de formação das duplas (modo individual)
- Animação de sorteio dos grupos com cards voando para os grupos

## Regras de desempate
1. Vitórias
2. Saldo de games (games ganhos − games perdidos)
3. Percentual de games ganhos (games ganhos / games jogados)
