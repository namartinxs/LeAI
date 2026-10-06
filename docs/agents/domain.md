# Domain Docs

Como as skills de engenharia devem consumir a documentação de domínio deste repositório ao explorar o código.

## Antes de explorar, leia isto

- **`CONTEXT.md`** na raiz do repo.
- **`docs/adr/`**: leia os ADRs que tocam a área em que você vai trabalhar.

Se esses arquivos não existirem, **prossiga em silêncio**. Não sinalize a ausência; não sugira criá-los de antemão. A skill `/domain-modeling` (acessada via `/grill-with-docs` e `/improve-codebase-architecture`) os cria de forma preguiçosa quando termos ou decisões são de fato resolvidos.

## Estrutura de arquivos

Repo single-context (este repo):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-....md
│   └── 0002-....md
└── apps/ libs/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (título de issue, proposta de refactor, hipótese, nome de teste), use o termo como definido em `CONTEXT.md`. Não migre para sinônimos que o glossário evita explicitamente.

Se o conceito que você precisa não estiver no glossário ainda, isso é um sinal: ou você está inventando uma linguagem que o projeto não usa (reconsidere) ou há uma lacuna real (anote para `/domain-modeling`).

## Sinalize conflitos com ADRs

Se sua saída contradiz um ADR existente, sinalize isso explicitamente em vez de sobrescrever silenciosamente:

> _Contradiz o ADR-0007 (...), mas vale reabrir porque…_
