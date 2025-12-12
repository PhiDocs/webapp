# Roteiro de Evolução do Projeto - Safety Docs AI

Este documento descreve o plano de evolução do projeto, as decisões arquiteturais tomadas e o guia passo a passo para a implementação de novas funcionalidades.

## Visão Geral

O objetivo é transformar a ferramenta de geração de documentos em uma plataforma completa com múltiplos usuários, empresas, histórico e gerenciamento centralizado.

## Decisões de Arquitetura

Após análise, tomamos as seguintes decisões-chave para garantir que o projeto seja escalável, manutenível e rápido de desenvolver.

### 1. Escolha do Banco de Dados: Firebase (Firestore) vs. SQL

- **Decisão:** Utilizaremos o **Firebase (Firestore)** como nosso banco de dados principal.
- **Justificativa:**
    - **Velocidade de Desenvolvimento:** O Firebase é um Backend-as-a-Service (BaaS) que já integra Autenticação e Banco de Dados. Isso nos permite construir as funcionalidades diretamente, sem a necessidade de criar e manter uma API backend separada, que seria obrigatória com um banco SQL.
    - **Funcionalidades em Tempo Real:** O Firestore facilita a implementação de interfaces que se atualizam em tempo real (ex: um painel que mostra novos dados sem recarregar a página), o que seria complexo com SQL.
    - **Escalabilidade e Manutenção:** Como uma solução "serverless", o Firebase escala automaticamente e elimina a necessidade de gerenciarmos servidores de banco de dados.
    - **Segurança Integrada:** As regras de segurança são declarativas e aplicadas diretamente no banco de dados, simplificando o controle de acesso.

### 2. Padrão de Design: Camada de Repositório (Repository Pattern)

- **Decisão:** Iremos abstrair todo o acesso ao banco de dados através de uma camada de "Repositórios".
- **Justificativa:**
    - **Flexibilidade:** A lógica de negócio da aplicação (ex: Server Actions) não saberá que está usando o Firebase. Ela apenas chamará métodos de um repositório (ex: `userRepository.create()`). Isso nos dá a liberdade de, no futuro, trocar o Firebase por um banco SQL (ou qualquer outro) apenas reescrevendo a camada de repositório, sem impactar o resto da aplicação.
    - **Organização e Testabilidade:** Separa claramente as responsabilidades no código e facilita a criação de testes automatizados.

## Roteiro de Implementação (Passo a Passo)

A implementação será dividida em fases para garantir um desenvolvimento incremental e controlado.

### Fase 1: Estrutura de Backend e Autenticação (Fundação)

1.  **Configurar o Backend com Firebase:**
    - Inicializar o projeto Firebase (Authentication e Firestore).
    - Criar a estrutura de dados inicial em `docs/backend.json` para definir `Usuários`, `Empresas` e `Obras`.
    - Implementar a primeira camada de repositório para acesso aos dados.

2.  **Criar o Sistema de Login/Cadastro:**
    - Desenvolver as páginas de Login e Cadastro.
    - Integrar com o Firebase Authentication.
    - Criar o fluxo para novos usuários se registrarem.

3.  **Implementar Permissões e Proteção de Rotas:**
    - Criar a lógica para diferenciar usuários `admin` e `user` (usando Custom Claims do Firebase).
    - Proteger as páginas da aplicação para que apenas usuários logados possam acessá-las.
    - Proteger áreas específicas para que apenas administradores possam acessá-las.

### Fase 2: O Painel do Administrador (Gerenciamento Central)

4.  **Desenvolver o Gerenciamento de Empresas e Funcionários:**
    - Criar a interface do painel do admin.
    - Implementar as funcionalidades de CRUD (Criar, Ler, Atualizar, Deletar) para Empresas e seus respectivos Funcionários.

5.  **Adicionar o Gerenciamento de Obras:**
    - Na área do admin, permitir o CRUD de Obras, sempre associando uma obra a uma empresa.

6.  **Implementar a Gestão de Cargos e Terceirizadas:**
    - Criar uma área para o admin pré-cadastrar cargos e nomes de empresas terceirizadas.
    - O objetivo é que esses dados possam ser reutilizados em dropdowns nos formulários, padronizando a entrada de dados.

7.  **Criar Página de Configurações:**
    - Permitir que o admin configure a URL do webhook do n8n diretamente pela interface, salvando-a no banco de dados.

### Fase 3: Integração e Histórico

8.  **Conectar Formulários ao Banco de Dados:**
    - Modificar o fluxo de geração de documentos (APR/PT). Ao serem criados, eles serão salvos no Firestore, vinculados a uma Obra e à Empresa do usuário logado.

9.  **Ajustar os Formulários com Dados do Admin:**
    - Atualizar os formulários para que os campos de "Responsáveis" e "Equipe" possam ser preenchidos selecionando funcionários já cadastrados na obra.

### Fase 4: Funcionalidades Avançadas

10. **Criar um Dashboard de Métricas:**
    - Desenvolver uma tela no painel do admin para exibir estatísticas de uso, como o número de documentos gerados por obra ou por período, para monitoramento de custos com a IA.
