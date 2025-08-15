# 📊 API de Alinhamento Financeiro – Processo Seletivo Anka Tech

Este projeto é uma **API REST** desenvolvida em **Node.js**, **Prisma** e **Zod**, que gerencia o alinhamento de clientes a um planejamento financeiro, incluindo funcionalidades como cadastro de clientes, movimentações financeiras, projeções patrimoniais, histórico de simulações e perfis de seguro.  

O projeto foi desenvolvido como parte do **processo seletivo da [Anka Tech](https://www.betteredge.com.br/)**, uma empresa que desenvolve software voltado para a área do mercado financeiro.

---

## 1️⃣ Sobre o Projeto

O objetivo desta aplicação é fornecer um backend e frontend validado para apoiar um sistema de gestão financeira dos clientes, permitindo:

- **Cadastro e gerenciamento de clientes**  
- **CRUD de eventos financeiros** (depósitos, retiradas, contribuições, despesas)  
- **Projeções patrimoniais** com e sem eventos  
- **Histórico de simulações** para análise futura  
- **Perfis de seguro** (vida, invalidez) e distribuição de cobertura/premiums  

A API é **100% tipada e validada** com Zod, garantindo consistência dos dados.  

---

## 2️⃣ Backend

A arquitetura é modular e separada em:  

- **Routes** → Definição das rotas e middlewares (auth, validações)  
- **Controllers** → Camada que processa as requisições HTTP  
- **Services** → Lógica de negócio e integração com o banco via Prisma  
- **Schemas (Zod)** → Validação e tipagem de entradas/saídas  
- **Tests** → Testes E2E para garantir integridade das funcionalidades  

### ⚙️ Tecnologias principais

- **Node.js** + **TypeScript**
- **Prisma ORM**
- **Zod** (validação)
- **Fastify** (framework HTTP)
- **PostgreSQL** (via Docker)
- **Swagger** (documentação)
- **Autenticação** (JWT)


### 🚀 Como rodar o backend

1. **Clonar o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd <pasta-do-projeto>

2. **.env**
    - Troque o nome do arquivo .env-exemple apenas para .env

3. **Docker**
   ```bash
   docker compose up -d

3. **Executar as seeders**
   ```bash
   docker compose exec backend npm run db:seed

5 . **Url**
    - A documentação da API estará disponível em http://localhost:8080/api-docs#/

## ⚠️ Observação sobre testes

- Ambiente de testes e desenvolvimento usam o mesmo banco

- Para rodar os testes, o banco deve estar vazio

- Alguns testes podem falhar na primeira execução devido ao estado do banco,
sendo necessário rodar mais de uma vez

1. **Execução dos testes**
   ```bash
    docker compose exec backend npm test

## 3️⃣ Frontend
O frontend ainda não foi concluído no tempo solicitado no momento.

O plano era integrá-lo com este backend para exibir e manipular as informações de clientes, eventos, projeções e seguros, consumindo os endpoints já implementados, e seguir **fielmente o [Figma](https://www.figma.com/design/i2Ml8dgRQvDsLemtRJ5Jqw/TH---Gr%C3%A1ficos-RN?node-id=168-54&t=A7GUE3s7TLja5tl3-1)** disponibilizado, ele será implementado para fazer parte do portfólio.

### ⚙️ Tecnologias principais a serem usadas

- **Next.js 14 (App Router) + TypeScript**
- **UI: ShadCN/UI (dark‑mode default)**
- **State/Data: TanStack Query (auto‑invalidar após mutações)**
- **Forms: React‑Hook‑Form + Zod v4** (validação)
- **Axios para chamadas REST** (framework HTTP)
- **Bootstrap** (css)