// Popula a tabela legal_pages com conteúdo profissional.
// Uso: node scripts/seed-legal-pages.js
// Requer: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────────────────────
// CONTEÚDO DAS PÁGINAS (Markdown)
// ─────────────────────────────────────────────────────────────

const PRIVACY = `
## 1. Quem somos

A **Editora Jocum Brasil**, inscrita no CNPJ 07.112.226/0001-23, com sede na Av. Vereador Wadislau Bugalski, 3826 — Almirante Tamandaré/PR, CEP 83511-000, é a controladora dos dados pessoais tratados nesta plataforma.

Esta Política de Privacidade descreve quais dados coletamos, como os utilizamos, com quem os compartilhamos e quais são os seus direitos como titular, em conformidade com a **Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)**.

Ao navegar em nosso site ou realizar uma compra, você reconhece que leu e compreendeu esta política. Caso não concorde com seus termos, solicitamos que não utilize nossos serviços.

---

## 2. Quais dados coletamos

### 2.1 Dados fornecidos por você
- Nome completo e CPF/CNPJ (necessários para emissão de nota fiscal)
- Endereço de e-mail e número de telefone/WhatsApp
- Endereço completo para entrega (logradouro, número, complemento, CEP, cidade, estado)
- Dados de pagamento — processados com segurança pelo nosso parceiro de pagamentos; não armazenamos dados de cartão em nossos servidores
- Conteúdo que você nos envia via formulários de contato, SAC ou avaliações de produtos

### 2.2 Dados coletados automaticamente
- Endereço IP e informações de localização aproximada
- Tipo de dispositivo, sistema operacional e navegador
- Páginas visitadas, tempo de permanência e interações no site
- Dados de cookies e tecnologias similares (detalhados na Política de Cookies)

### 2.3 Dados de terceiros
Em casos de autenticação via redes sociais (ex.: Google), recebemos apenas os dados que você autoriza expressamente ao fazer o login — geralmente nome e e-mail.

---

## 3. Para que usamos seus dados

Utilizamos seus dados pessoais para as seguintes finalidades:

- **Processar pedidos:** Confirmar pagamentos, emitir notas fiscais e organizar o envio dos livros
- **Entrega e logística:** Transmitir seu endereço às transportadoras parceiras
- **Atendimento ao cliente:** Responder dúvidas, resolver problemas e processar trocas e devoluções
- **Comunicações transacionais:** Enviar confirmações de pedido e atualizações de rastreamento
- **Marketing com consentimento:** Enviar newsletters e novidades editoriais — apenas se você optar por receber
- **Segurança e prevenção a fraudes:** Detectar atividades suspeitas e proteger você e nossa plataforma
- **Obrigações legais:** Cumprir exigências fiscais, contábeis e regulatórias aplicáveis

---

## 4. Bases legais (LGPD)

Todo tratamento de dados que realizamos está fundamentado em ao menos uma das bases legais previstas no Art. 7º da LGPD:

| Base legal | Quando aplicamos |
|---|---|
| Execução de contrato | Para processar, faturar e entregar seu pedido |
| Cumprimento de obrigação legal | Emissão de nota fiscal, recolhimento de impostos |
| Legítimo interesse | Prevenção a fraudes, segurança do site e análise de uso anonimizada |
| Consentimento | Envio de e-mails de marketing — revogável a qualquer momento |

---

## 5. Com quem compartilhamos seus dados

Não vendemos seus dados pessoais. Compartilhamos somente o necessário com parceiros que nos ajudam a prestar os serviços contratados:

- **Processadores de pagamento** (ex.: Stripe, Mercado Pago) — para autorização de transações, sob padrões PCI-DSS
- **Transportadoras e Correios** — para operacionalizar a entrega no endereço informado
- **Plataformas de e-mail** — para envio de notificações transacionais e, com consentimento, marketing
- **Serviços de análise** — dados agregados e anonimizados para entender o uso do site
- **Autoridades públicas** — quando exigido por lei, ordem judicial ou regulatória

Todos os nossos fornecedores são contratualmente obrigados a manter a confidencialidade e segurança dos dados conforme a LGPD.

---

## 6. Por quanto tempo guardamos seus dados

| Tipo de dado | Prazo de retenção |
|---|---|
| Dados de pedidos e notas fiscais | 5 anos (obrigação fiscal — CTN) |
| Dados cadastrais (conta ativa) | Enquanto ativa + 1 ano após encerramento |
| Logs de acesso | 6 meses (Marco Civil da Internet — Lei 12.965/2014) |
| Dados de marketing | Até a revogação do consentimento |
| Dados de SAC | 2 anos após encerramento da solicitação (CDC) |

---

## 7. Seus direitos como titular (LGPD)

Você pode a qualquer momento:

- **Acessar** os dados que temos sobre você
- **Corrigir** dados incompletos, desatualizados ou incorretos
- **Solicitar exclusão** ou anonimização de dados desnecessários
- **Portabilidade** dos seus dados em formato estruturado
- **Revogar** seu consentimento para marketing
- **Opor-se** a tratamentos baseados em legítimo interesse
- **Saber** com quais entidades compartilhamos seus dados

Respondemos em até **15 dias úteis**. Em casos complexos, podemos prorrogar por igual período, comunicando você com antecedência.

---

## 8. Como protegemos seus dados

- Criptografia em trânsito (TLS/HTTPS) em todas as comunicações
- Criptografia em repouso para dados sensíveis
- Controles de acesso por função — apenas colaboradores autorizados
- Monitoramento contínuo de atividades suspeitas
- Dados de cartão processados pelo gateway, sem trânsito por nossos servidores

Em caso de incidente que possa gerar risco relevante, notificaremos a **Autoridade Nacional de Proteção de Dados (ANPD)** e, quando necessário, os titulares afetados.

---

## 9. Canal de privacidade e DPO

Para exercer seus direitos ou tirar dúvidas sobre seus dados, entre em contato com nosso Encarregado de Dados (DPO):

**Editora Jocum Brasil**
Av. Vereador Wadislau Bugalski, 3826 — Almirante Tamandaré/PR — CEP: 83511-000
E-mail: privacidade@editorajocum.com.br
Telefone: (41) 99143-5610

Você também pode registrar reclamações junto à **ANPD** em gov.br/anpd.

---

## 10. Atualizações desta política

Esta política pode ser atualizada periodicamente. Quando houver alterações relevantes, avisaremos por e-mail ou em destaque no site. O uso contínuo da plataforma após a publicação implica aceitação da política revisada.
`.trim();

// ─────────────────────────────────────────────────────────────

const TERMS = `
## 1. Aceitação dos termos

Ao acessar ou utilizar a plataforma da **Editora Jocum Brasil** (CNPJ 07.112.226/0001-23), com sede em Almirante Tamandaré/PR, você declara ter lido, compreendido e concordado com estes Termos de Uso. Caso não concorde, não utilize a plataforma.

Estes termos regulam a relação entre a Editora Jocum Brasil e qualquer pessoa física ou jurídica que acesse ou utilize nossos serviços de e-commerce de livros e materiais educacionais.

---

## 2. A plataforma

A Editora Jocum Brasil disponibiliza uma plataforma de comércio eletrônico para venda de livros, publicações e materiais educacionais. Nos reservamos o direito de alterar, suspender ou descontinuar qualquer funcionalidade da plataforma a qualquer momento, com aviso prévio quando possível.

---

## 3. Cadastro e conta

### 3.1 Elegibilidade
Para criar uma conta e realizar compras, você deve:
- Ser maior de 18 anos ou estar assistido/representado por responsável legal
- Fornecer informações verdadeiras, precisas e completas no cadastro
- Manter seus dados cadastrais atualizados

### 3.2 Responsabilidade pela conta
Você é responsável por manter a confidencialidade de suas credenciais de acesso. Qualquer atividade realizada em sua conta é de sua responsabilidade. Notifique-nos imediatamente em caso de uso não autorizado.

### 3.3 Suspensão e encerramento
Podemos suspender ou encerrar contas que violem estes termos, pratiquem fraude, forneçam informações falsas ou cometam qualquer ato que prejudique outros usuários ou a plataforma.

---

## 4. Pedidos e pagamentos

### 4.1 Realização do pedido
O pedido só é confirmado após a aprovação do pagamento. Reservamo-nos o direito de cancelar pedidos em casos de erro de preço, indisponibilidade de estoque ou suspeita de fraude.

### 4.2 Formas de pagamento
Aceitamos cartão de crédito, boleto bancário, Pix e demais formas disponíveis no checkout. Os dados de pagamento são processados por parceiros certificados (PCI-DSS) e não armazenamos dados de cartão em nossos servidores.

### 4.3 Nota fiscal
Emitimos nota fiscal eletrônica (NF-e) para todos os pedidos. Para isso, solicitamos CPF ou CNPJ no cadastro.

### 4.4 Preços
Os preços são exibidos em Reais (BRL) e incluem os impostos aplicáveis. O frete é calculado separadamente. Eventuais erros de precificação serão comunicados antes da confirmação do pedido.

---

## 5. Entrega

As condições de prazo, modalidades de frete e restrições de entrega estão detalhadas na **Política de Frete**. A Editora Jocum não se responsabiliza por atrasos decorrentes de endereço incorreto fornecido pelo comprador, eventos de força maior ou falhas das transportadoras parceiras.

---

## 6. Trocas e devoluções

As condições para troca e devolução de produtos estão detalhadas na **Política de Devoluções**, em conformidade com o Código de Defesa do Consumidor (Lei nº 8.078/1990).

---

## 7. Propriedade intelectual

Todo o conteúdo disponível na plataforma — incluindo textos, imagens, logotipos, layout e código — é de propriedade da Editora Jocum Brasil ou de seus parceiros e está protegido pela legislação de propriedade intelectual. É vedada a reprodução, distribuição ou uso comercial sem autorização prévia e por escrito.

Os livros adquiridos destinam-se ao uso pessoal e não podem ser reproduzidos, digitalizados, distribuídos ou revendidos sem autorização.

---

## 8. Comportamento do usuário

Você se compromete a não:
- Fornecer dados falsos ou se passar por terceiros
- Realizar atividades fraudulentas ou que prejudiquem outros usuários
- Tentar acessar áreas restritas da plataforma ou comprometer sua segurança
- Usar a plataforma para fins ilegais ou contrários à ordem pública
- Realizar scraping, coleta automatizada de dados ou engenharia reversa do sistema

---

## 9. Limitação de responsabilidade

A Editora Jocum não se responsabiliza por:
- Danos indiretos, incidentais ou consequentes decorrentes do uso da plataforma
- Falhas de conectividade de internet fora do nosso controle
- Atos de terceiros, incluindo transportadoras e processadores de pagamento
- Uso indevido da plataforma por terceiros não autororizados com acesso às suas credenciais

---

## 10. Legislação aplicável e foro

Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da Comarca de Almirante Tamandaré/PR para dirimir quaisquer controvérsias, sem prejuízo do direito do consumidor de optar pelo foro de seu domicílio.

---

## 11. Alterações

Podemos atualizar estes Termos periodicamente. Publicaremos as alterações nesta página com a data de atualização. O uso contínuo da plataforma após a publicação implica aceitação dos novos termos.

Para dúvidas: **contato@editorajocum.com.br** | (41) 99143-5610
`.trim();

// ─────────────────────────────────────────────────────────────

const RETURNS = `
## 1. Direito de arrependimento

De acordo com o **Código de Defesa do Consumidor (art. 49 da Lei 8.078/1990)**, você tem direito de se arrepender de uma compra realizada pela internet no prazo de **até 7 dias corridos** a partir do recebimento do produto, sem necessidade de justificativa.

Neste caso, devolvemos o valor integral pago, incluindo o frete de envio original.

---

## 2. Produtos com defeito ou avaria

Se o produto chegou danificado, com defeito de fabricação ou divergente do pedido, você tem direito à troca ou reembolso total. Neste caso:

- Prazo para solicitação: **até 30 dias** após o recebimento (bens não duráveis) ou **90 dias** (bens duráveis), conforme o CDC
- O custo do frete de devolução é por nossa conta
- Faremos a análise do produto em até **5 dias úteis** após o recebimento na nossa sede

---

## 3. Como solicitar a devolução ou troca

1. Acesse a página de **SAC** ou envie e-mail para **sac@editorajocum.com.br** com:
   - Número do pedido
   - Motivo da devolução (com fotos, se houver dano físico)
   - Preferência: troca por mesmo título, troca por crédito ou reembolso
2. Nossa equipe retornará em até **2 dias úteis** com as instruções de envio
3. Embale o produto adequadamente e envie com o código de rastreamento informado
4. Recebemos o produto e processamos a solicitação em até **5 dias úteis**

---

## 4. Condições do produto para devolução

Para que a devolução ou troca seja aceita, o produto deve estar:
- Sem marcas de uso, amassados, rasuras ou danos causados pelo comprador
- Com embalagem original (quando possível)
- Acompanhado da nota fiscal

> **Atenção:** Produtos danificados por mau uso, molhados, com páginas rasgadas ou marcadas (exceto defeito de fábrica) não são elegíveis para troca ou devolução.

---

## 5. Prazos de reembolso

| Forma de pagamento | Prazo para estorno |
|---|---|
| Cartão de crédito | Até 2 faturas subsequentes (conforme a operadora) |
| Pix / Transferência bancária | Até 10 dias úteis após aprovação da devolução |
| Boleto bancário | Até 10 dias úteis após aprovação da devolução |

---

## 6. Troca por outro título

Se preferir trocar por outro livro de igual ou maior valor (com complemento da diferença), basta indicar o título desejado ao abrir o chamado. Estamos sujeitos à disponibilidade em estoque.

---

## 7. Produtos não elegíveis para devolução

- Produtos digitais (e-books ou conteúdos digitais) após download ou acesso realizado
- Produtos personalizados ou sob encomenda
- Produtos adquiridos em promoção identificada como "sem troca"

---

## 8. Contato para dúvidas

**SAC Editora Jocum Brasil**
E-mail: sac@editorajocum.com.br
WhatsApp/Telefone: (41) 99143-5610
Atendimento: Segunda a sexta, das 8h às 12h e das 14h às 17h
`.trim();

// ─────────────────────────────────────────────────────────────

const SHIPPING = `
## 1. Área de entrega

Entregamos para **todo o território nacional brasileiro**, incluindo capitais, interior e regiões remotas, por meio dos Correios e transportadoras parceiras.

Não realizamos entregas internacionais no momento.

---

## 2. Cálculo do frete

O valor do frete é calculado automaticamente no checkout com base em:
- **CEP de destino**
- **Peso e dimensões** do pacote (considerando o total dos itens do pedido)
- **Modalidade escolhida** (PAC, Sedex ou transportadora privada)

Para pedidos acima de determinado valor, podemos oferecer **frete grátis** conforme campanhas vigentes. Consulte o banner na loja ou o checkout para verificar a promoção ativa.

---

## 3. Modalidades disponíveis

| Modalidade | Descrição | Prazo estimado |
|---|---|---|
| PAC (Correios) | Econômico, rastreável | 5 a 12 dias úteis |
| Sedex (Correios) | Rápido, rastreável | 1 a 5 dias úteis |
| Transportadora | Frete privado (disponível conforme região) | Variável |

> Os prazos acima são estimativas dos Correios e das transportadoras, contados a partir da **data de postagem** do pedido. Não garantimos prazos em períodos de alta demanda (ex.: Natal, Black Friday) ou eventos de força maior.

---

## 4. Prazo de postagem

Após a confirmação do pagamento, o pedido é separado e postado em até **2 dias úteis** (exceto feriados nacionais e fins de semana). Pedidos confirmados até as **14h em dias úteis** costumam ser postados no mesmo dia ou no dia seguinte.

---

## 5. Rastreamento

Após a postagem, enviaremos por e-mail o **código de rastreamento** do seu pedido. Você pode acompanhar a entrega:
- No site dos Correios: rastreamento.correios.com.br
- No site da transportadora parceira, se aplicável
- Na área "Meus Pedidos" da sua conta nesta plataforma

---

## 6. Endereço de entrega

O endereço informado no pedido é definitivo. **Não é possível alterar o endereço após a postagem.** Certifique-se de informar um endereço completo e correto antes de finalizar a compra.

Inclua:
- Número e complemento (apartamento, bloco, sala etc.)
- Ponto de referência (opcional, mas recomendado para regiões remotas)
- CEP correto — use o buscador de CEP nos Correios em caso de dúvida

---

## 7. Tentativas de entrega

Os Correios e transportadoras realizam em regra **2 a 3 tentativas** de entrega. Após as tentativas sem sucesso:
- O objeto fica disponível para retirada na agência/centro de distribuição por **7 dias corridos**
- Após esse prazo, o objeto retorna ao remetente

Se o pedido retornar por motivo de endereço incorreto ou recusa de recebimento sem solicitação de devolução prévia, cobraremos novo frete para reenvio.

---

## 8. Avarias e extravios

Se o produto chegar com avaria visível causada pelo transporte, ou se o pedido for extraviado:
- Recuse o recebimento (avaria visível na embalagem) e comunique-nos imediatamente
- Se a avaria for detectada após a abertura, registre o ocorrido com fotos e entre em contato em até **48 horas** após o recebimento

Abriremos sinistro junto aos Correios/transportadora e providenciaremos a reposição ou reembolso conforme a apuração.

---

## 9. Contato

**SAC Editora Jocum Brasil**
E-mail: sac@editorajocum.com.br
WhatsApp/Telefone: (41) 99143-5610
Atendimento: Segunda a sexta, das 8h às 12h e das 14h às 17h
`.trim();

// ─────────────────────────────────────────────────────────────

const COOKIES = `
## 1. O que são cookies

Cookies são pequenos arquivos de texto armazenados no seu navegador ou dispositivo quando você visita um site. Eles permitem que o site reconheça seu dispositivo em visitas subsequentes, lembre suas preferências e melhore sua experiência de navegação.

Além de cookies, também podemos utilizar **tecnologias similares** como web beacons, pixels de rastreamento e armazenamento local (localStorage), que funcionam de maneira análoga.

---

## 2. Como usamos cookies

A Editora Jocum Brasil utiliza cookies para:

- **Garantir o funcionamento básico** da plataforma (autenticação, carrinho, checkout)
- **Lembrar suas preferências** de navegação (idioma, região, tema)
- **Entender como o site é utilizado** — de forma agregada e anônima — para melhorá-lo continuamente
- **Exibir comunicações relevantes** para quem consentiu com cookies de marketing

---

## 3. Tipos de cookies que usamos

### Cookies essenciais (sempre ativos)
São indispensáveis para o funcionamento da plataforma. Sem eles, funcionalidades como login, carrinho e checkout não funcionam. Não podem ser desativados.

**Exemplos:**
- Sessão de autenticação (mantém você logado)
- Token de carrinho (preserva os itens adicionados)
- Preferências de segurança (proteção CSRF)

### Cookies de desempenho e análise
Coletam informações sobre como os visitantes interagem com o site — quais páginas acessam, quanto tempo ficam, de onde vieram. Todos os dados são **anônimos e agregados**, sem identificação pessoal.

**Ferramentas utilizadas:** Google Analytics (com anonimização de IP ativada)

### Cookies de funcionalidade
Permitem que o site lembre suas preferências para personalizar a experiência:
- Região e endereço padrão para cálculo de frete
- Preferências de exibição

### Cookies de marketing (somente com consentimento)
Utilizados para exibir anúncios relevantes em outros sites e medir a eficácia de campanhas. Só são ativados se você consentir explicitamente.

**Ferramentas que podem ser utilizadas:** Google Ads, Meta Pixel (Facebook/Instagram)

---

## 4. Cookies de terceiros

Alguns cookies são definidos por serviços de terceiros integrados à nossa plataforma:

| Serviço | Finalidade | Política de privacidade |
|---|---|---|
| Google Analytics | Análise de tráfego anônima | policies.google.com/privacy |
| Google Ads | Marketing (com consentimento) | policies.google.com/privacy |
| Meta Pixel | Marketing (com consentimento) | facebook.com/policy.php |
| Supabase | Autenticação e segurança | supabase.com/privacy |

Esses terceiros têm suas próprias políticas de privacidade e gerenciam os cookies de forma independente.

---

## 5. Como gerenciar seus cookies

### Pelo banner de cookies
Ao acessar o site pela primeira vez, você verá um banner onde pode aceitar, recusar ou personalizar o uso de cookies não essenciais.

### Pelas configurações do navegador
Você pode controlar ou deletar cookies diretamente nas configurações do seu navegador:

- **Chrome:** Configurações > Privacidade e segurança > Cookies
- **Firefox:** Opções > Privacidade e segurança > Cookies e dados de sites
- **Safari:** Preferências > Privacidade > Gerenciar dados de websites
- **Edge:** Configurações > Privacidade, pesquisa e serviços > Cookies

> **Atenção:** Desativar cookies essenciais compromete o funcionamento da plataforma. Não é possível realizar compras sem os cookies de sessão e carrinho.

---

## 6. Retenção dos dados de cookies

| Tipo | Duração |
|---|---|
| Cookies de sessão | Até fechar o navegador |
| Cookies de preferência | Até 1 ano |
| Cookies de análise | Até 2 anos (Google Analytics padrão) |
| Cookies de marketing | Até 90 dias |

---

## 7. Alterações nesta política

Esta Política de Cookies pode ser atualizada para refletir mudanças em nossas práticas ou em exigências legais. Publicaremos as alterações nesta página com a data de atualização.

---

## 8. Contato

Para dúvidas sobre cookies ou privacidade:

**Editora Jocum Brasil**
E-mail: privacidade@editorajocum.com.br
Telefone: (41) 99143-5610
`.trim();

// ─────────────────────────────────────────────────────────────
// SEED
// ─────────────────────────────────────────────────────────────

const PAGES = [
  {
    id: crypto.randomUUID(),
    type: "privacy",
    title: "Política de Privacidade",
    content: PRIVACY,
  },
  {
    id: crypto.randomUUID(),
    type: "terms",
    title: "Termos de Uso",
    content: TERMS,
  },
  {
    id: crypto.randomUUID(),
    type: "returns",
    title: "Política de Devoluções",
    content: RETURNS,
  },
  {
    id: crypto.randomUUID(),
    type: "shipping",
    title: "Política de Frete",
    content: SHIPPING,
  },
  {
    id: crypto.randomUUID(),
    type: "cookies",
    title: "Política de Cookies",
    content: COOKIES,
  },
];

async function seed() {
  console.log("Iniciando seed de páginas legais...\n");

  for (const page of PAGES) {
    // Verifica se já existe um registro para esse type
    const { data: existing } = await supabase
      .from("legal_pages")
      .select("id")
      .eq("type", page.type)
      .maybeSingle();

    if (existing) {
      // Atualiza o conteúdo do registro existente
      const { error } = await supabase
        .from("legal_pages")
        .update({ title: page.title, content: page.content })
        .eq("id", existing.id);

      if (error) {
        console.error(`❌ Erro ao atualizar "${page.type}":`, error.message);
      } else {
        console.log(`✅ Atualizado: ${page.title}`);
      }
    } else {
      // Insere novo registro
      const { error } = await supabase.from("legal_pages").insert(page);

      if (error) {
        console.error(`❌ Erro ao inserir "${page.type}":`, error.message);
      } else {
        console.log(`✅ Inserido: ${page.title}`);
      }
    }
  }

  console.log("\nSeed concluído.");
}

seed();
