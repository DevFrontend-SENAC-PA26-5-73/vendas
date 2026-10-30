# Dossiê de auditoria técnica — Vendas

**Data:** 30/10/2026
**Escopo:** aplicação front-end neste workspace e contrato da API enviado como contexto. O código-fonte do backend não está neste repositório; conclusões sobre ele se limitam aos exemplos de resposta fornecidos.

## Nota

**5/10 — protótipo funcional, ainda não pronto para operação de produção.** A nota permanece porque os bloqueios de backend, os requisitos ausentes e a falta de testes automatizados continuam relevantes, mesmo após as correções de interface descritas abaixo.

O projeto tem telas úteis para clientes, produtos, cargos, atendimento e estoque; usa TypeScript, validações de formulário e apresenta estados de carregamento/erro em alguns fluxos. Build e lint passam. A nota cai principalmente pelo risco de gravação parcial de vendas, inconsistências entre totais exibidos e dados persistidos, cobertura incompleta dos requisitos, ausência de testes automatizados e lacunas de segurança e operação.

| Dimensão | Nota | Observação |
|---|---:|---|
| Funcionalidade frente aos requisitos | 5/10 | Cadastro e estoque têm base; vendas, relatórios e outros requisitos são parciais ou ausentes. |
| Confiabilidade e consistência | 3/10 | Venda é composta por várias requisições independentes; não há garantia de atomicidade. |
| Manutenibilidade | 6/10 | Componentes separados e tipos compartilhados existem, mas as chamadas HTTP e modelos se repetem. |
| Segurança e privacidade | 3/10 | Não há autenticação/autorização no front-end; configuração de exemplo usa HTTP e há dados pessoais. |
| Validação automatizada | 2/10 | Build/lint disponíveis, sem script ou arquivos de teste encontrados. |

## Achados prioritários

### P0 — Bloqueiam uma operação confiável

1. **Venda pode ficar parcialmente gravada.** Em [Atendimento.tsx](src/components/Atendimento/Atendimento.tsx), o cliente grava a venda e, depois, faz chamadas separadas para cada item, saída de estoque e parcela. Se qualquer requisição falhar, ainda não há transação ou compensação no backend. O front-end agora bloqueia reenvio e mantém o aviso na sessão até a reconciliação ser confirmada; isso reduz duplicações acidentais, mas não torna as gravações atômicas.
2. **Totais podem divergir entre itens e venda.** O atendimento calcula desconto e frete e usa o total ajustado para pagamentos, mas o corpo de `/vendas` não os envia. O dashboard agora prioriza os pagamentos quando disponíveis; os itens continuam registrados pelo preço cheio, então outras consultas/relatórios baseados em itens ainda podem divergir. Ver [Atendimento.tsx](src/components/Atendimento/Atendimento.tsx) e [Dashboard.tsx](src/components/Dashboard/Dashboard.tsx).
3. **Contrato da API não está validado para o fluxo crítico.** Nos exemplos enviados, a criação de venda retorna `404` para transportadora, a criação de item de venda retorna `500` e a criação de funcionário também retorna `500`. São respostas observadas no ambiente/documentação fornecidos, não uma inspeção do backend; ainda assim, impedem considerar o fluxo pronto até que sejam reproduzidas e resolvidas.

### P1 — Necessários para completar os requisitos

4. **Fornecedores e transportadoras seguem sem fluxo funcional.** Funcionário agora pode ser aberto pelo menu. Fornecedores ainda mostra “Esta tela ainda não foi criada” em [App.tsx](src/App.tsx). Atendimento exige uma transportadora, mas o contrato fornecido não documenta rota para listá-la.
5. **Métricas indisponíveis no dashboard.** Corrigido no front-end: despesas, lucro, variações e origens ausentes agora são mostrados como indisponíveis, sem inventar zeros; o gráfico identifica pagamentos históricos em vez de chamá-los previsão. Previsão real ainda depende de dados e regra do backend. Ver [Dashboard.tsx](src/components/Dashboard/Dashboard.tsx).
6. **Frete, desconto, emissão e dados de endereço não fecham o ciclo.** O frete é digitado manualmente, não considera peso/endereço e não é persistido pela venda; o comprovante impresso não é NF-e/NFS-e. O CEP serve apenas para consulta do ViaCEP e bairro/CEP não fazem parte do payload de cliente. Ver [Clientes.tsx](src/components/Clientes/Clientes.tsx) e [Atendimento.tsx](src/components/Atendimento/Atendimento.tsx).
7. **Layout responsivo do shell.** Corrigido no front-end: em telas estreitas, a navegação vira uma faixa horizontal e o conteúdo ocupa a largura disponível. Validar visualmente em dispositivos reais ainda faz parte da etapa de testes.
8. **Bundle de produção elevado.** Corrigido nesta rodada: telas são carregadas sob demanda, o gráfico usa CSS e as dependências ApexCharts/Recharts foram removidas. O chunk de entrada ficou em aproximadamente 230 kB, sem alerta de chunk acima de 500 kB.

### P2 — Qualidade e sustentação

9. **Integração HTTP fragmentada.** [lib/api.ts](src/lib/api.ts) oferece cliente e erro comuns, mas clientes, produtos, inventário, cargos, funcionários e dashboard ainda combinam `fetch`/Axios, tratamento de erro e parsing próprios. Isso gera mensagens e comportamentos diferentes, além de facilitar divergência na configuração da API.
10. **Não há suíte de testes automatizados.** Não foram encontrados arquivos de teste nem script `test` em `package.json`. Build e lint não validam regras de preço, CPF, parcelas, estoque ou falha parcial de venda.
11. **Código interno e código de barras estão conceitualmente misturados.** Produtos cria 13 dígitos aleatórios no front-end e os salva em `codigo_barra`; não calcula dígito verificador EAN-13, e unicidade é conferida apenas na lista carregada pelo navegador. Definir se o campo é código interno ou GTIN/barcode e fazer a unicidade ser garantida pelo backend.
12. **Dados são carregados integralmente.** Listas são baixadas e filtradas no navegador; não há paginação. O custo cresce com o volume e o dashboard faz três consultas separadas. A aplicação também não define metas de tempo de resposta ou monitoramento.
13. **Segurança e LGPD dependem de trabalho ainda não demonstrado.** Há CPF, contato, endereço e e-mail. O front-end não implementa sessão/perfis; o exemplo de configuração usa HTTP para um IP privado. Exigir autenticação/autorização e HTTPS no ambiente real, além de definir controles de acesso, retenção, auditoria e tratamento de incidentes no backend e na operação. Não enviar ou armazenar dados de cartão no front-end.

## Cobertura dos requisitos enviados

| Requisito | Situação observada | O que falta |
|---|---|---|
| Cadastro de clientes | Parcialmente atendido | CRUD e validação existem; persistir CEP/bairro se forem obrigatórios e confirmar compatibilidade do DTO. |
| Controle de estoque | Parcialmente atendido | Entrada manual e saída ligada a venda existem; fluxo explícito de devolução e consistência transacional faltam. |
| Vendas por funcionário | Parcialmente atendido | Atendimento associa funcionário; tela de funcionário não está no menu e o POST falhou no exemplo fornecido. |
| Relatório de vendas | Parcialmente atendido | Dashboard mostra vendas recentes; faltam relatório operacional completo, filtros e exportação conforme necessidade. |
| Tabela de preços | Não atendido | Só existe um preço por produto; definir atacado, varejo e revenda. |
| Cadastro de itens | Parcialmente atendido | CRUD de produtos existe; confirmar suporte a serviços e regra definitiva de identificador. |
| Condições de pagamento | Parcialmente atendido | Formas e parcelas aparecem no atendimento; validar persistência, vencimentos, status e total no backend. |
| Emissão fiscal | Não atendido | Integrar provedor/serviço fiscal e definir requisitos legais; impressão atual é apenas comprovante. |
| Comissão de vendedores | Não atendido | Definir regra, base de cálculo, estornos e endpoint/relatório. |
| Dashboard | Parcialmente atendido | Totais básicos e estoque baixo existem; previsão, despesas, lucro, desempenho e origem precisam de dados reais. |
| Frete e peso | Parcialmente atendido | Frete é campo manual; faltam peso, cálculo por destino/transportadora e persistência. |
| Requisitos não funcionais | Não comprovados | Medir desempenho/disponibilidade, aplicar controles LGPD, testar navegadores e definir recuperação/backup. |

## Plano recomendado

### Etapa 1 — Estabilizar contrato e venda (prioridade imediata)

- Reproduzir e corrigir os erros reportados nos exemplos da API: `/vendas`, `/itemvenda` e `/funcionarios`; documentar pré-condições e dados de teste válidos.
- Definir DTOs e respostas oficiais para produtos, clientes, funcionários, transportadoras, vendas, itens, pagamentos e movimentações. Incluir a rota de transportadoras ou remover a dependência de IDs não selecionáveis.
- Implementar no backend uma operação transacional de fechamento de venda que valide estoque e persista venda, itens, pagamentos, frete e desconto de uma vez. Torná-la idempotente para impedir duplicação em repetição.
- Tornar o backend a fonte de verdade para preço final, arredondamento, estoque e totais; alinhar atendimento, comprovante e dashboard à mesma regra.
- O front-end agora bloqueia reenvio após falha e exige confirmação para liberar outro pedido; ainda é necessário implementar transação/idempotência no backend e consulta/reconciliação confiável do estado.

### Etapa 2 — Completar o fluxo operacional

- A navegação de Funcionários foi adicionada; decidir escopo e implementar Fornecedores.
- Implementar devolução com vínculo à venda/item e regras de reposição/estorno.
- Definir tabelas de preço e suporte a serviços, se confirmados no escopo.
- Definir cálculo de frete com peso, endereço e transportadora; persistir os valores e a memória de cálculo.
- Criar relatório de vendas e comissões com filtros, permissões e critérios aprovados.
- Integrar emissão fiscal somente após definir provedor, ambiente de homologação, dados fiscais e responsabilidades legais.

### Etapa 3 — Segurança, dados e desempenho

- Implantar HTTPS, autenticação e autorização por perfil no backend; restringir CORS ao domínio da aplicação em produção.
- Definir política LGPD para acesso, retenção, correção/exclusão e auditoria de dados pessoais.
- Adotar paginação/filtros na API; o carregamento sob demanda e a remoção das dependências de gráficos sem uso já foram aplicados.
- Definir timeouts, cancelamento e padrão único de erros/requisições no front-end.
- Especificar e testar backup, restauração, disponibilidade e metas de resposta.

### Etapa 4 — Qualidade e entrega

- Criar testes unitários para validações, moeda/parcelas, identificação de códigos e cálculos de estoque.
- Criar testes de integração para cadastro, venda completa, falhas intermediárias, devolução e permissões.
- Automatizar build, lint e testes em CI; habilitar verificações TypeScript mais estritas gradualmente.
- Validar fluxos em Chrome, Firefox e Edge, incluindo celular/tablet e leitor de tela/teclado.
- Completar o documento de requisitos: regras de negócio, escopo, status/versão dos requisitos, usuários, sistema operacional, armazenamento, instalação, configuração e recuperação.
- Substituir o README de template por documentação de execução e operação do sistema.

## Verificações executadas

- `npm run build`: passou; TypeScript e Vite concluíram. Vite alertou sobre chunk acima de 500 kB.
- `npm run lint`: passou sem erros.
- `get_errors`: nenhum erro reportado no workspace.
- Testes automatizados: não há arquivos/script de teste encontrados.

## Alterações realizadas após a auditoria

- Adicionado acesso à tela de Funcionários e navegação horizontal para telas estreitas.
- Rotas carregadas sob demanda; gráfico do dashboard substituído por barras CSS e removidas as dependências de gráficos sem uso.
- Dashboard deixou de representar despesas, lucro e origem ausentes como zero; pagamentos persistidos têm prioridade no total exibido por venda.
- Após falha no fechamento, o atendimento mantém bloqueio de novo envio em `sessionStorage` até a pessoa confirmar que reconciliou o registro. Isso é uma proteção de interface, não substitui transação ou idempotência da API.
- O chunk principal passou de aproximadamente 1,29 MB para cerca de 230 kB; o dashboard passou de aproximadamente 931 kB para cerca de 12 kB.

## Limites e preservação do workspace

Este relatório avalia o front-end e usa os resultados da API somente como evidência contextual fornecida. Não substitui auditoria do backend, teste de segurança, revisão jurídica ou validação com usuários. Antes desta auditoria, o workspace já continha alterações em `src/components/Clientes/Clientes.tsx` e o arquivo não rastreado `src/lib/mascaras.ts`; ambos foram preservados.