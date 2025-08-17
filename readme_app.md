# Projeto: Gestão de Oportunidades

Este projeto define **tools** , usada por um agente, para criação e listagem de oportunidades de negócio, utilizando [**@deco/workers-runtime**](https://www.npmjs.com/package/@deco/workers-runtime) e **Zod** para validação.

## 🚀 Descrição

O código principal implementa dois tools:

- **CREATE\_OPPORTUNITY** → Cria uma nova oportunidade a partir de dados de um lead e persiste no banco de dados do workspace.
- **LIST\_OPPORTUNITIES** → Lista as oportunidades já armazenadas no banco de dados.

## 📂 Estrutura

```
main.ts      # Código principal que define os tools de oportunidades
```

## 🛠 Tecnologias Utilizadas

- **TypeScript**
- **@deco/workers-runtime**
- **Zod** (validação de schema)
- **Banco de dados interno (via DECO\_CHAT\_WORKSPACE\_API)**

## ▶️ Como Rodar

### 1. Instale dependências

```bash
npm install
```

ou, se usar Deno:

```bash
deno task install
```

### 2. Execute o projeto

Node.js:

```bash
npm run dev
```

Deno:

```bash
deno run -A main.ts
```

## 📌 Exemplos de Uso

### Criar oportunidade

Entrada:

```json
{
  "empresa": "Tech Ltda",
  "pessoa": "João Silva",
  "telefone": "+55 11 99999-8888",
  "email": "joao@tech.com",
  "interesse": "Serviço de consultoria"
}
```

Saída:

```json
{
  "id": "uuid-gerado"
}
```

### Listar oportunidades

Entrada:

```json
{
  "limit": 10
}
```

Saída:

```json
{
  "items": [
    {
      "id": "123",
      "empresa": "Tech Ltda",
      "pessoa": "João Silva",
      "telefone": "+55 11 99999-8888",
      "email": "joao@tech.com",
      "interesse": "Serviço de consultoria",
      "created_at": "2025-08-17T10:00:00.000Z"
    }
  ]
}
```

## 📄 Licença

Este projeto está sob licença MIT.

