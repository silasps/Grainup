import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://xefpmolwcxxfckdvnncz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORIES = [
  { name: "Compra",              slug: "compra",           position: 1 },
  { name: "Pagamento",           slug: "pagamento",        position: 2 },
  { name: "Entrega",             slug: "entrega",          position: 3 },
  { name: "Trocas e devoluções", slug: "trocas-devolucoes",position: 4 },
  { name: "Afiliados",           slug: "afiliados",        position: 5 },
  { name: "Conta e login",       slug: "conta-login",      position: 6 },
  { name: "Privacidade",         slug: "privacidade",      position: 7 },
];

const FAQS_BY_SLUG = {
  compra: [
    { question: "Como faço um pedido?", answer: "Navegue pelo catálogo, adicione os livros desejados ao carrinho e clique em \"Finalizar compra\". Você pode criar uma conta ou comprar como visitante. O processo leva menos de 2 minutos.", position: 1, is_featured: false },
    { question: "Posso comprar sem criar uma conta?", answer: "Sim! Você pode finalizar a compra sem cadastro. No entanto, ter uma conta facilita o acompanhamento dos seus pedidos e o histórico de compras.", position: 2, is_featured: false },
    { question: "Como sei se meu pedido foi confirmado?", answer: "Você receberá um e-mail de confirmação assim que o pagamento for aprovado. Se não receber em até 30 minutos, verifique a pasta de spam ou entre em contato pelo WhatsApp (41) 9914-35610.", position: 3, is_featured: true },
    { question: "Vocês vendem livros digitais (e-books)?", answer: "No momento trabalhamos apenas com livros físicos. Estamos avaliando a oferta de conteúdo digital no futuro.", position: 4, is_featured: false },
  ],
  pagamento: [
    { question: "Quais formas de pagamento são aceitas?", answer: "Aceitamos cartão de crédito (Visa, Mastercard, Elo e outros), boleto bancário e Pix. O Pix é compensado na hora, agilizando o envio do pedido.", position: 1, is_featured: true },
    { question: "Posso parcelar minha compra?", answer: "Sim, aceitamos parcelamento no cartão de crédito. As condições variam conforme o valor do pedido e são exibidas no checkout antes de você confirmar a compra.", position: 2, is_featured: false },
    { question: "O site é seguro para compras?", answer: "Sim. Todas as transações são processadas com criptografia SSL e nosso gateway de pagamento é certificado. Não armazenamos dados do seu cartão.", position: 3, is_featured: false },
    { question: "Quanto tempo leva para meu pagamento ser confirmado?", answer: "Pix: confirmação imediata. Cartão de crédito: até alguns minutos. Boleto bancário: até 2 dias úteis após o pagamento. O pedido só é separado após a confirmação.", position: 4, is_featured: false },
  ],
  entrega: [
    { question: "Vocês entregam em todo o Brasil?", answer: "Sim, entregamos para todo o território nacional. Utilizamos transportadoras parceiras para garantir segurança e rastreamento.", position: 1, is_featured: true },
    { question: "Qual é o prazo de entrega?", answer: "O prazo varia conforme a região e a modalidade de frete escolhida. Em geral, capitais e regiões Sul/Sudeste recebem em 3–7 dias úteis. Regiões mais remotas podem levar de 7–15 dias úteis após a postagem.", position: 2, is_featured: true },
    { question: "Como calculo o frete antes de finalizar a compra?", answer: "Na página do carrinho há um campo \"Calcular frete\" onde você informa seu CEP e vê as opções e valores disponíveis antes de pagar.", position: 3, is_featured: false },
    { question: "Existe frete grátis?", answer: "Sim! Oferecemos frete grátis para compras acima de determinado valor. O limite atual e as condições são exibidos no carrinho e na página de promoções.", position: 4, is_featured: false },
    { question: "Como rastrear meu pedido?", answer: "Após o envio, você receberá um e-mail com o código de rastreamento. Também é possível acompanhar pelo painel \"Minha Conta\" > \"Meus Pedidos\".", position: 5, is_featured: false },
  ],
  "trocas-devolucoes": [
    { question: "Posso devolver um produto?", answer: "Sim. Você tem até 7 dias corridos após o recebimento para solicitar a devolução, conforme o Código de Defesa do Consumidor. O produto deve estar em perfeito estado e com a embalagem original.", position: 1, is_featured: true },
    { question: "Meu livro chegou com defeito ou diferente do pedido. O que faço?", answer: "Entre em contato pelo WhatsApp (41) 9914-35610 ou pelo e-mail contato@grainupeditora.com.br com foto do problema. Resolveremos com envio de um novo exemplar sem custo adicional.", position: 2, is_featured: true },
    { question: "Como solicitar o reembolso?", answer: "Após a aprovação da devolução, o reembolso é feito pelo mesmo meio de pagamento utilizado. Cartão de crédito: até 2 faturas. Pix/boleto: até 5 dias úteis na conta informada.", position: 3, is_featured: false },
    { question: "Quem paga o frete da devolução?", answer: "Se o motivo for defeito ou erro nosso, arcamos com o frete de retorno. Em caso de desistência (arrependimento), o custo do retorno é do cliente.", position: 4, is_featured: false },
  ],
  afiliados: [
    { question: "Como funciona o programa de afiliados?", answer: "Você se cadastra gratuitamente, recebe um link exclusivo e ganha comissão a cada venda realizada através dele. Você pode divulgar nas redes sociais, blog, grupos de WhatsApp ou onde preferir.", position: 1, is_featured: true },
    { question: "Qual é o valor da comissão?", answer: "A comissão é de até 10% sobre o valor de cada livro vendido pelo seu link. O percentual exato por produto é visível no seu painel de afiliado.", position: 2, is_featured: true },
    { question: "Como e quando recebo minhas comissões?", answer: "As comissões são liberadas após a confirmação da entrega e o prazo de devolução. O pagamento é feito mensalmente via Pix, na chave cadastrada no seu perfil.", position: 3, is_featured: false },
    { question: "Como me inscrevo no programa?", answer: "Acesse a página de Afiliados no site e preencha o formulário de inscrição. Após aprovação, você já recebe seu link e acesso ao painel.", position: 4, is_featured: false },
  ],
  "conta-login": [
    { question: "Como crio uma conta?", answer: "Clique em \"Entrar\" no topo do site e depois em \"Criar conta\". Preencha nome, e-mail e senha. Você também pode criar uma conta automaticamente ao finalizar sua primeira compra.", position: 1, is_featured: false },
    { question: "Esqueci minha senha. O que faço?", answer: "Na tela de login, clique em \"Esqueci minha senha\" e informe seu e-mail. Você receberá um link para redefinir a senha em instantes.", position: 2, is_featured: false },
    { question: "Como altero meu endereço de entrega?", answer: "Acesse \"Minha Conta\" > \"Meus Dados\" e atualize o endereço antes de finalizar um novo pedido. Pedidos já realizados não podem ter o endereço alterado.", position: 3, is_featured: false },
    { question: "Como acompanho meus pedidos?", answer: "Faça login e acesse \"Minha Conta\" > \"Meus Pedidos\". Lá você vê o status de cada pedido e o código de rastreamento quando disponível.", position: 4, is_featured: false },
  ],
  privacidade: [
    { question: "Como vocês protegem meus dados?", answer: "Seguimos a Lei Geral de Proteção de Dados (LGPD). Seus dados são armazenados em servidores seguros e usados apenas para processar pedidos e melhorar sua experiência.", position: 1, is_featured: false },
    { question: "Vocês compartilham meus dados com terceiros?", answer: "Seus dados são compartilhados apenas com parceiros essenciais para a operação (transportadoras e gateway de pagamento), sempre com cláusulas de confidencialidade.", position: 2, is_featured: false },
    { question: "Como solicito a exclusão dos meus dados?", answer: "Envie um e-mail para contato@grainupeditora.com.br com o assunto \"Exclusão de dados\". Processamos a solicitação em até 15 dias úteis, conforme a LGPD.", position: 3, is_featured: false },
  ],
};

async function main() {
  // Upsert categories
  const { data: existingCats } = await supabase.from("faq_categories").select("id, slug");
  const existingMap = Object.fromEntries((existingCats ?? []).map((c) => [c.slug, c.id]));

  for (const cat of CATEGORIES) {
    if (!existingMap[cat.slug]) {
      const { data } = await supabase.from("faq_categories").insert(cat).select("id, slug").single();
      if (data) existingMap[data.slug] = data.id;
      console.log("Criada categoria:", cat.name);
    } else {
      console.log("Categoria já existe:", cat.name);
    }
  }

  // Insert FAQs (skip if already have FAQs)
  const { count } = await supabase.from("faqs").select("*", { count: "exact", head: true });
  if (count && count > 0) {
    console.log(`Já existem ${count} FAQs. Pulando inserção.`);
    return;
  }

  for (const [slug, items] of Object.entries(FAQS_BY_SLUG)) {
    const categoryId = existingMap[slug];
    if (!categoryId) { console.warn("Categoria não encontrada:", slug); continue; }
    const rows = items.map((item) => ({ ...item, category_id: categoryId, is_active: true }));
    const { error } = await supabase.from("faqs").insert(rows);
    if (error) console.error("Erro ao inserir FAQs de", slug, error.message);
    else console.log(`Inseridas ${rows.length} FAQs em "${slug}"`);
  }

  console.log("Concluído!");
}

main().catch(console.error);
