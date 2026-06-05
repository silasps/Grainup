-- Garante categorias (caso não existam)
INSERT INTO faq_categories (name, slug, position) VALUES
  ('Compra',              'compra',           1),
  ('Pagamento',           'pagamento',        2),
  ('Entrega',             'entrega',          3),
  ('Trocas e devoluções', 'trocas-devolucoes',4),
  ('Afiliados',           'afiliados',        5),
  ('Conta e login',       'conta-login',      6),
  ('Privacidade',         'privacidade',      7)
ON CONFLICT (slug) DO NOTHING;

-- FAQs por categoria
DO $$
DECLARE
  cat_compra      UUID;
  cat_pagamento   UUID;
  cat_entrega     UUID;
  cat_trocas      UUID;
  cat_afiliados   UUID;
  cat_conta       UUID;
  cat_privacidade UUID;
BEGIN
  SELECT id INTO cat_compra      FROM faq_categories WHERE slug = 'compra';
  SELECT id INTO cat_pagamento   FROM faq_categories WHERE slug = 'pagamento';
  SELECT id INTO cat_entrega     FROM faq_categories WHERE slug = 'entrega';
  SELECT id INTO cat_trocas      FROM faq_categories WHERE slug = 'trocas-devolucoes';
  SELECT id INTO cat_afiliados   FROM faq_categories WHERE slug = 'afiliados';
  SELECT id INTO cat_conta       FROM faq_categories WHERE slug = 'conta-login';
  SELECT id INTO cat_privacidade FROM faq_categories WHERE slug = 'privacidade';

  -- Compra
  INSERT INTO faqs (category_id, question, answer, position, is_active, is_featured) VALUES
    (cat_compra, 'Como faço um pedido?',
     'Navegue pelo catálogo, adicione os livros desejados ao carrinho e clique em "Finalizar compra". Você pode criar uma conta ou comprar como visitante. O processo leva menos de 2 minutos.',
     1, true, false),
    (cat_compra, 'Posso comprar sem criar uma conta?',
     'Sim! Você pode finalizar a compra sem cadastro. No entanto, ter uma conta facilita o acompanhamento dos seus pedidos e o histórico de compras.',
     2, true, false),
    (cat_compra, 'Como sei se meu pedido foi confirmado?',
     'Você receberá um e-mail de confirmação assim que o pagamento for aprovado. Se não receber em até 30 minutos, verifique a pasta de spam ou entre em contato conosco pelo WhatsApp (41) 9914-35610.',
     3, true, true),
    (cat_compra, 'Vocês vendem livros digitais (e-books)?',
     'No momento trabalhamos apenas com livros físicos. Estamos avaliando a oferta de conteúdo digital no futuro.',
     4, true, false);

  -- Pagamento
  INSERT INTO faqs (category_id, question, answer, position, is_active, is_featured) VALUES
    (cat_pagamento, 'Quais formas de pagamento são aceitas?',
     'Aceitamos cartão de crédito (Visa, Mastercard, Elo e outros), boleto bancário e Pix. O Pix é compensado na hora, agilizando o envio do pedido.',
     1, true, true),
    (cat_pagamento, 'Posso parcelar minha compra?',
     'Sim, aceitamos parcelamento no cartão de crédito. As condições variam conforme o valor do pedido e são exibidas no checkout antes de você confirmar a compra.',
     2, true, false),
    (cat_pagamento, 'O site é seguro para compras?',
     'Sim. Todas as transações são processadas com criptografia SSL e nosso gateway de pagamento é certificado. Não armazenamos dados do seu cartão.',
     3, true, false),
    (cat_pagamento, 'Quanto tempo leva para meu pagamento ser confirmado?',
     'Pix: confirmação imediata. Cartão de crédito: até alguns minutos. Boleto bancário: até 2 dias úteis após o pagamento. O pedido só é separado após a confirmação.',
     4, true, false);

  -- Entrega
  INSERT INTO faqs (category_id, question, answer, position, is_active, is_featured) VALUES
    (cat_entrega, 'Vocês entregam em todo o Brasil?',
     'Sim, entregamos para todo o território nacional. Utilizamos transportadoras parceiras para garantir segurança e rastreamento.',
     1, true, true),
    (cat_entrega, 'Qual é o prazo de entrega?',
     'O prazo varia conforme a região e a modalidade de frete escolhida. Em geral, capitais e regiões Sul/Sudeste recebem em 3–7 dias úteis. Regiões mais remotas podem levar de 7–15 dias úteis após a postagem.',
     2, true, true),
    (cat_entrega, 'Como calculo o frete antes de finalizar a compra?',
     'Na página do carrinho há um campo "Calcular frete" onde você informa seu CEP e vê as opções e valores disponíveis antes de pagar.',
     3, true, false),
    (cat_entrega, 'Existe frete grátis?',
     'Sim! Oferecemos frete grátis para compras acima de determinado valor. O limite atual e as condições são exibidos no carrinho e na página de promoções.',
     4, true, false),
    (cat_entrega, 'Como rastrear meu pedido?',
     'Após o envio, você receberá um e-mail com o código de rastreamento. Também é possível acompanhar pelo painel "Minha Conta" > "Meus Pedidos".',
     5, true, false);

  -- Trocas e devoluções
  INSERT INTO faqs (category_id, question, answer, position, is_active, is_featured) VALUES
    (cat_trocas, 'Posso devolver um produto?',
     'Sim. Você tem até 7 dias corridos após o recebimento para solicitar a devolução, conforme o Código de Defesa do Consumidor. O produto deve estar em perfeito estado e com a embalagem original.',
     1, true, true),
    (cat_trocas, 'Meu livro chegou com defeito ou diferente do pedido. O que faço?',
     'Entre em contato pelo WhatsApp (41) 9914-35610 ou pelo e-mail contato@grainupeditora.com.br com foto do problema. Resolveremos com envio de um novo exemplar sem custo adicional.',
     2, true, true),
    (cat_trocas, 'Como solicitar o reembolso?',
     'Após a aprovação da devolução, o reembolso é feito pelo mesmo meio de pagamento utilizado. Cartão de crédito: até 2 faturas. Pix/boleto: até 5 dias úteis na conta informada.',
     3, true, false),
    (cat_trocas, 'Quem paga o frete da devolução?',
     'Se o motivo for defeito ou erro nosso, arcamos com o frete de retorno. Em caso de desistência (arrependimento), o custo do retorno é do cliente.',
     4, true, false);

  -- Afiliados
  INSERT INTO faqs (category_id, question, answer, position, is_active, is_featured) VALUES
    (cat_afiliados, 'Como funciona o programa de afiliados?',
     'Você se cadastra gratuitamente, recebe um link exclusivo e ganha comissão a cada venda realizada através dele. Você pode divulgar nas redes sociais, blog, grupos de WhatsApp ou onde preferir.',
     1, true, true),
    (cat_afiliados, 'Qual é o valor da comissão?',
     'A comissão é de até 10% sobre o valor de cada livro vendido pelo seu link. O percentual exato por produto é visível no seu painel de afiliado.',
     2, true, true),
    (cat_afiliados, 'Como e quando recebo minhas comissões?',
     'As comissões são liberadas após a confirmação da entrega e o prazo de devolução. O pagamento é feito mensalmente via Pix, na chave cadastrada no seu perfil.',
     3, true, false),
    (cat_afiliados, 'Como me inscrevo no programa?',
     'Acesse a página de Afiliados no site e preencha o formulário de inscrição. Após aprovação, você já recebe seu link e acesso ao painel.',
     4, true, false);

  -- Conta e login
  INSERT INTO faqs (category_id, question, answer, position, is_active, is_featured) VALUES
    (cat_conta, 'Como crio uma conta?',
     'Clique em "Entrar" no topo do site e depois em "Criar conta". Preencha nome, e-mail e senha. Você também pode criar uma conta automaticamente ao finalizar sua primeira compra.',
     1, true, false),
    (cat_conta, 'Esqueci minha senha. O que faço?',
     'Na tela de login, clique em "Esqueci minha senha" e informe seu e-mail. Você receberá um link para redefinir a senha em instantes.',
     2, true, false),
    (cat_conta, 'Como altero meu endereço de entrega?',
     'Acesse "Minha Conta" > "Meus Dados" e atualize o endereço antes de finalizar um novo pedido. Pedidos já realizados não podem ter o endereço alterado.',
     3, true, false),
    (cat_conta, 'Como acompanho meus pedidos?',
     'Faça login e acesse "Minha Conta" > "Meus Pedidos". Lá você vê o status de cada pedido e o código de rastreamento quando disponível.',
     4, true, false);

  -- Privacidade
  INSERT INTO faqs (category_id, question, answer, position, is_active, is_featured) VALUES
    (cat_privacidade, 'Como vocês protegem meus dados?',
     'Seguimos a Lei Geral de Proteção de Dados (LGPD). Seus dados são armazenados em servidores seguros e usados apenas para processar pedidos e melhorar sua experiência.',
     1, true, false),
    (cat_privacidade, 'Vocês compartilham meus dados com terceiros?',
     'Seus dados são compartilhados apenas com parceiros essenciais para a operação (transportadoras e gateway de pagamento), sempre com cláusulas de confidencialidade.',
     2, true, false),
    (cat_privacidade, 'Como solicito a exclusão dos meus dados?',
     'Envie um e-mail para contato@grainupeditora.com.br com o assunto "Exclusão de dados". Processamos a solicitação em até 15 dias úteis, conforme a LGPD.',
     3, true, false);
END $$;
