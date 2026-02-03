# Guia de Deploy no Netlify - TDJ Studio

Este guia descreve os passos para fazer o deploy da aplicação TDJ Studio no Netlify.

## Pré-requisitos

Antes de iniciar, certifique-se de ter as seguintes contas e serviços configurados:

1.  **Conta no Netlify**: Para hospedar a aplicação.
2.  **Banco de Dados Neon**: `DATABASE_URL` (PostgreSQL).
3.  **Google Cloud Console**: Para autenticação (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
4.  **Cloudflare R2**: Para upload de arquivos (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, etc.).
5.  **NextAuth Secret**: Uma string aleatória para criptografia de sessão.

## Variáveis de Ambiente Necessárias

No painel do Netlify (Site Settings > Environment variables), adicione as seguintes chaves:

### Banco de Dados
- `DATABASE_URL`: String de conexão do Neon (ex: `postgres://user:pass@ep-xyz.aws.neon.tech/dbname?sslmode=require`)

### Autenticação (NextAuth)
- `NEXTAUTH_URL`: A URL do seu site no Netlify (ex: `https://seu-projeto.netlify.app`). Em produção, é importante que seja a URL exata.
- `NEXTAUTH_SECRET`: String aleatória segura (pode gerar com `openssl rand -base64 32`).
- `GOOGLE_CLIENT_ID`: Do Google Cloud Console.
- `GOOGLE_CLIENT_SECRET`: Do Google Cloud Console.

### Armazenamento (Cloudflare R2)
- `R2_ACCESS_KEY_ID`: ID da chave de acesso.
- `R2_SECRET_ACCESS_KEY`: Segredo da chave de acesso.
- `R2_BUCKET_NAME`: Nome do bucket (ex: `tdjstudio`).
- `R2_ACCOUNT_ID`: ID da conta Cloudflare.
- `R2_PUBLIC_URL`: URL pública do bucket (se configurada).

## Métodos de Deploy

### Opção 1: Conexão com Git (Recomendado)

1.  Faça o push do seu código para um repositório Git (GitHub, GitLab ou Bitbucket).
2.  No Netlify, clique em "Add new site" -> "Import an existing project".
3.  Conecte ao seu provedor Git e selecione o repositório.
4.  As configurações de build devem ser detectadas automaticamente:
    - **Build command**: `npm run build`
    - **Publish directory**: `.next`
5.  Clique em "Deploy site".
6.  **Importante**: Vá em "Site configuration" > "Environment variables" e adicione todas as variáveis listadas acima.
7.  Vá em "Deploys" e clique em "Trigger deploy" para reconstruir com as variáveis corretas.

### Opção 2: Netlify CLI (Deploy Manual)

Se você tiver o Netlify CLI instalado e configurado localmente:

1.  Faça login no CLI:
    ```bash
    npx netlify login
    ```
2.  Vincule o projeto (cria um novo site ou vincula a um existente):
    ```bash
    npx netlify link
    ```
3.  Faça o deploy de produção:
    ```bash
    npx netlify deploy --build --prod
    ```
    *(O flag `--prod` publica diretamente na URL principal. Sem ele, cria um deploy de preview).*

## Solução de Problemas Comuns

-   **Erro de Conexão com Banco**: Verifique se a `DATABASE_URL` está correta e se o banco Neon permite conexões externas (geralmente sim por padrão).
-   **Erro de Auth**: Verifique se a `NEXTAUTH_URL` corresponde exatamente à URL do site e se as URIs de redirecionamento no Google Cloud Console incluem `https://seu-site.netlify.app/api/auth/callback/google`.
-   **Arquivos Estáticos 404**: O plugin `@netlify/plugin-nextjs` deve lidar com isso, mas certifique-se de que o diretório de publicação é `.next`.
