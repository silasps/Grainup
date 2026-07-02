export interface Clausula {
  numero: number;
  titulo: string;
  texto: string;
}

export interface ContratoContent {
  slug: string;
  titulo: string;
  subtitulo: string;
  partes: {
    contratante: { nome: string; cnpj: string; email: string; endereco: string };
    contratado: { nome: string; cpf: string; email: string };
  };
  valor: string;
  pagamento: string;
  prazo: string;
  foro: string;
  clausulas: Clausula[];
  escopo: {
    titulo: string;
    areas: { titulo: string; itens: string[] }[];
  };
  bonus: {
    titulo: string;
    itens: string[];
  };
  pdfStoragePath: string;
}

export const CONTRATO_EDITORA_JOCUM: ContratoContent = {
  slug: "editora-jocum-v1",
  titulo: "Contrato de Prestação de Serviços",
  subtitulo: "Desenvolvimento de Soluções Digitais · Plataforma GrainUp · Módulo Editora",
  partes: {
    contratante: {
      nome: "Marcos de Souza Borges Edição e Distribuição de Livros",
      cnpj: "07.112.226/0001-23",
      email: "editorajocum@gmail.com",
      endereco: "Rua Vereador Wadislau Bugalski, 3826, Botiatuba, Almirante Tamandaré/PR",
    },
    contratado: {
      nome: "Silas Pereira Silva",
      cpf: "093.416.016-30",
      email: "silaspereiras@gmail.com",
    },
  },
  valor: "R$ 6.000,00",
  pagamento: "100% na entrega e publicação (go-live), via PIX para a chave CPF 093.416.016-30 (Silas Pereira Silva)",
  prazo: "4 semanas após recebimento de todos os materiais e acessos necessários",
  foro: "Comarca de Almirante Tamandaré, Estado do Paraná",
  clausulas: [
    {
      numero: 1,
      titulo: "Do Objeto",
      texto:
        "O presente contrato tem por objeto o desenvolvimento, a configuração e a implantação da plataforma de comércio eletrônico denominada \"GrainUp – Módulo Editora\", na modalidade Plano Profissional, conforme escopo detalhado no Anexo I, que é parte integrante e inseparável deste contrato.\n\nA plataforma destina-se à venda de livros e à gestão administrativa da CONTRATANTE.",
    },
    {
      numero: 2,
      titulo: "Do Escopo dos Serviços (Itens Incluídos)",
      texto:
        "Estão incluídos no objeto deste contrato, exclusivamente, os itens e funcionalidades descritos no Anexo I.\n\nQualquer item, funcionalidade ou serviço que não esteja expressamente listado no Anexo I não integra o presente contrato e será tratado conforme a Cláusula 3ª, ressalvados os itens entregues como bônus na forma da Cláusula 4ª.",
    },
    {
      numero: 3,
      titulo: "Dos Serviços Não Incluídos e dos Extras",
      texto:
        "Não estão incluídos neste contrato e serão objeto de orçamento e cobrança à parte, entre outros:\n\n• Novas funcionalidades não previstas no Anexo I;\n• Alterações de escopo, de regras de negócio ou de layout solicitadas após a aprovação das respectivas etapas;\n• Integrações adicionais com sistemas, plataformas ou serviços de terceiros;\n• Os demais módulos da plataforma (Eifol/Eventos, EAD e Condomínio) e quaisquer outros módulos futuros;\n• Cadastro de produtos, criação de textos, imagens e demais conteúdos, salvo se expressamente previstos no Anexo I.\n\nDistinção entre correção e evolução: considera-se correção (coberta pela garantia, sem custo) o ajuste de falha de item entregue que não funcione conforme o Anexo I. Considera-se evolução (cobrada) qualquer inclusão, alteração ou novo comportamento não previsto no Anexo I, ainda que solicitado durante o período de garantia.\n\nToda demanda extra será previamente descrita, orçada e somente executada após aprovação, por escrito, da CONTRATANTE, não havendo cobrança por serviço não aprovado.",
    },
    {
      numero: 4,
      titulo: "Dos Itens Entregues como Bônus",
      texto:
        "O CONTRATADO entregou à CONTRATANTE, a título de cortesia (bônus) e sem qualquer custo adicional, melhorias e funcionalidades além do escopo originalmente proposto, relacionadas no Anexo II deste contrato.\n\nTais itens não alteram o valor previsto na Cláusula 5ª, passam a integrar a plataforma entregue e são reconhecidos pelas partes como entrega adicional ao combinado.\n\nA manutenção e a evolução desses itens, após o período de garantia, seguem as mesmas regras das Cláusulas 7ª e 8ª.",
    },
    {
      numero: 5,
      titulo: "Do Valor e da Forma de Pagamento",
      texto:
        "Pela execução dos serviços descritos no Anexo I, a CONTRATANTE pagará ao CONTRATADO o valor total de R$ 6.000,00 (seis mil reais).\n\nO pagamento será realizado de forma integral, 100% na entrega e publicação (go-live) da plataforma.\n\nO pagamento será efetuado via PIX para a chave 093.416.016-30 (CPF), em nome de Silas Pereira Silva.",
    },
    {
      numero: 6,
      titulo: "Do Prazo de Execução",
      texto:
        "O prazo estimado de implantação é de aproximadamente 4 (quatro) semanas, contadas do recebimento de todos os materiais e acessos necessários, conforme o cronograma:\n\n• Semanas 1 e 2 — configuração de servidor, banco de dados e catálogo inicial;\n• Semana 3 — treinamento da equipe e migração de conteúdo;\n• Semana 4 — testes, ajustes e publicação (go-live).\n\nAtrasos decorrentes de pendências da CONTRATANTE (envio de conteúdo, concessão de acessos ou aprovações) suspendem a contagem do prazo enquanto não sanados.",
    },
    {
      numero: 7,
      titulo: "Da Garantia e do Suporte",
      texto:
        "O CONTRATADO prestará suporte pós-implantação pelo período de 1 (um) mês (30 dias), contado da publicação (go-live), destinado à correção de falhas dos itens entregues, conforme distinção da Cláusula 3.2, sem custo adicional.\n\nEncerrado o período de garantia, manutenções, ajustes e novas funcionalidades observarão a Cláusula 8ª.",
    },
    {
      numero: 8,
      titulo: "Da Manutenção e Evolução (Contratação Futura)",
      texto:
        "Após o período de garantia, os serviços de manutenção e evolução serão cobrados conforme a complexidade da solução (porte), com valor fechado e aprovado previamente, e não por hora trabalhada, à escolha da CONTRATANTE entre os modelos abaixo, mediante contratação específica:\n\n(a) Por porte da solução — valor fechado por demanda:\n• Pequeno: ajuste isolado, sem nova regra de negócio (ex: texto, cor, campo, filtro ou correção fora da garantia) — R$ 250,00 por demanda;\n• Médio: funcionalidade com alguma regra (ex: novo relatório, novo status de pedido ou novo e-mail automático) — R$ 800,00 por demanda;\n• Grande: fluxo novo, tela com regras ou nova integração — a partir de R$ 2.000,00, orçado por escopo, com pagamento de 50% na aprovação e 50% na entrega.\n\n(b) Plano mensal de sustentação — R$ 800,00 (oitocentos reais) por mês, incluindo monitoramento, backups, atualizações de segurança e até 2 (dois) ajustes de porte pequeno por mês; demandas excedentes seguem a cobrança por porte.\n\nA classificação do porte de cada demanda será informada e aprovada antes do início, tomando por base os exemplos acima, e não o tempo de execução.\n\nOs valores previstos nesta cláusula são referenciais, poderão ser reajustados e dependem de contratação específica e autônoma em relação a este contrato.",
    },
    {
      numero: 9,
      titulo: "Das Obrigações do Contratado",
      texto:
        "• Executar os serviços conforme o Anexo I, com zelo técnico e qualidade profissional;\n• Cumprir os prazos pactuados, ressalvadas as hipóteses de suspensão previstas neste contrato;\n• Prestar a garantia descrita na Cláusula 7ª;\n• Manter sigilo sobre as informações da CONTRATANTE, nos termos da Cláusula 12ª.",
    },
    {
      numero: 10,
      titulo: "Das Obrigações da Contratante",
      texto:
        "• Fornecer, em tempo hábil, conteúdos, textos, imagens, acessos e materiais necessários à execução;\n• Analisar e aprovar as etapas dentro dos prazos combinados;\n• Efetuar o pagamento na data pactuada;\n• Arcar com os custos de terceiros previstos na Cláusula 11ª.",
    },
    {
      numero: 11,
      titulo: "Dos Custos de Terceiros",
      texto:
        "São de responsabilidade exclusiva da CONTRATANTE os custos de domínio, hospedagem, banco de dados (por exemplo, Supabase), provedores de e-mail, certificados, meios e gateways de pagamento e demais serviços de terceiros necessários ao funcionamento da plataforma, preferencialmente contratados em nome da própria CONTRATANTE.",
    },
    {
      numero: 12,
      titulo: "Da Propriedade Intelectual e da Confidencialidade",
      texto:
        "Quitado integralmente o valor previsto na Cláusula 5ª, a CONTRATANTE passa a deter o direito de uso sobre a aplicação desenvolvida especificamente para si e sobre os dados nela contidos.\n\nO CONTRATADO conserva a titularidade sobre componentes, bibliotecas, estruturas e ferramentas de base reutilizáveis por ele previamente desenvolvidas, concedendo à CONTRATANTE licença de uso no âmbito da plataforma objeto deste contrato.\n\nAs partes obrigam-se a manter sigilo sobre todas as informações confidenciais a que tiverem acesso em razão deste contrato, durante sua vigência e após o seu término.",
    },
    {
      numero: 13,
      titulo: "Da Vigência e da Rescisão",
      texto:
        "Este contrato vigora a partir da data de sua assinatura e estende-se até a entrega da plataforma e o encerramento do período de garantia.\n\nO contrato poderá ser rescindido por qualquer das partes em caso de descumprimento de obrigação, mediante notificação escrita, sendo devidos os valores correspondentes aos serviços já executados até a data da rescisão.",
    },
    {
      numero: 14,
      titulo: "Das Disposições Gerais",
      texto:
        "Toda e qualquer alteração deste contrato somente terá validade se formalizada por escrito, mediante termo aditivo assinado pelas partes.\n\nO presente contrato não gera vínculo empregatício, societário ou de subordinação entre as partes, tratando-se de prestação de serviço autônoma.",
    },
    {
      numero: 15,
      titulo: "Do Foro",
      texto:
        "Fica eleito o foro da comarca de Almirante Tamandaré, Estado do Paraná, para dirimir quaisquer questões oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.",
    },
  ],
  escopo: {
    titulo: "Escopo Detalhado — Plataforma Entregue",
    areas: [
      {
        titulo: "Loja virtual (área do cliente)",
        itens: [
          "Vitrine e catálogo completo de livros, organizados por categoria",
          "Página individual de cada livro, com descrição, autor, avaliações e preço",
          "Combos (kits de livros) com preço especial",
          "Carrinho de compras e checkout completo (endereço, frete e pagamento)",
          "Conta do cliente com histórico de pedidos e endereços salvos",
          "Sistema de avaliação de livros (estrelas e comentários)",
          "Banners e destaques na página inicial, com suporte a imagens e vídeos",
          "Página do programa de afiliados, central de ajuda, FAQ, formulário de contato e páginas de políticas da loja",
        ],
      },
      {
        titulo: "Painel administrativo (gestão da editora)",
        itens: [
          "Cadastro, edição e exclusão de livros (foto, preço, estoque, ISBN e categorias)",
          "Criação de combos e promoções com datas de início e fim",
          "Acompanhamento de pedidos em tempo real, com controle de status",
          "Financeiro: relatório de receitas com detalhamento de taxas e comissões e exportação de dados",
          "Afiliados: cadastro, links, comissões por faixas de desempenho, cupons e controle de saques",
          "Atendimento (SAC): chamados com protocolo, conversa direta com o cliente e e-mails automáticos",
          "Conteúdo e marketing: banners, notícias, FAQ, captura de leads e páginas de políticas",
          "Dashboard com indicadores: receita, livros mais vendidos, últimos pedidos, avaliações, tickets e leads",
        ],
      },
      {
        titulo: "Portal do afiliado",
        itens: [
          "Área exclusiva com saldo confirmado e pendente",
          "Acompanhamento de vendas e comissões",
          "Geração e cópia de link (geral ou por livro) e cupom personalizados",
          "Solicitação de saque das comissões acumuladas",
          "Visualização da faixa de comissão atual e do quanto falta para subir de nível",
        ],
      },
      {
        titulo: "Integrações incluídas",
        itens: [
          "MercadoPago — pagamentos online por cartão de crédito, PIX e boleto",
          "Melhor Envio — cálculo e cotação de frete em tempo real, com múltiplas transportadoras",
          "Bling ERP — sincronização de estoque e emissão de notas fiscais (NF-e)",
          "Resend — envio de e-mails automáticos (confirmação de pedido, boas-vindas, SAC, entre outros)",
        ],
      },
      {
        titulo: "Suporte e capacitação",
        itens: [
          "1 (um) mês (30 dias) de suporte pós-implantação (garantia)",
          "Treinamento de 4 (quatro) horas para a equipe, com manual de operação",
        ],
      },
    ],
  },
  bonus: {
    titulo: "Itens Entregues como Bônus (Sem Custo Adicional)",
    itens: [
      "Login com Google (acesso com um clique, sem necessidade de criar senha)",
      "Cálculo de frete em tempo real com múltiplas transportadoras (Melhor Envio), em substituição ao cálculo por estado originalmente previsto",
      "Emissão de notas fiscais (NF-e) e sincronização de estoque via integração com Bling ERP",
      "Envio de e-mails automáticos (confirmação de pedido, boas-vindas e SAC) via Resend",
      "Programa de afiliados ampliado: comissão por faixas de desempenho, cupons personalizados e portal exclusivo do afiliado",
      "Banners e destaques na página inicial com suporte a vídeo, além das imagens originalmente previstas",
      "Processo de checkout aprimorado e otimizado, com fluxo mais enxuto e menos atrito até o pagamento",
      "Painel administrativo construído de forma mais robusta e completa do que o originalmente especificado",
    ],
  },
  pdfStoragePath: "contratos/Contrato-GrainUp-Editora-Jocum.pdf",
};

export const CONTRATO_ADITIVO_CORREIOS: ContratoContent = {
  slug: "aditivo-correios-v1",
  titulo: "Termo Aditivo ao Contrato de Prestação de Serviços",
  subtitulo: "Implantação da API dos Correios · Plataforma GrainUp · Módulo Editora",
  partes: {
    contratante: {
      nome: "Marcos de Souza Borges Edição e Distribuição de Livros",
      cnpj: "07.112.226/0001-23",
      email: "editorajocum@gmail.com",
      endereco: "Rua Vereador Wadislau Bugalski, 3826, Botiatuba, Almirante Tamandaré/PR",
    },
    contratado: {
      nome: "Silas Pereira Silva",
      cpf: "093.416.016-30",
      email: "silaspereiras@gmail.com",
    },
  },
  valor: "R$ 500,00",
  pagamento: "100% no ato da assinatura deste termo, via PIX para a chave CPF 093.416.016-30 (Silas Pereira Silva)",
  prazo: "Serviço já desenvolvido, implantado e em produção previamente à assinatura deste termo",
  foro: "Comarca de Almirante Tamandaré, Estado do Paraná",
  clausulas: [
    {
      numero: 1,
      titulo: "Do Objeto",
      texto:
        "O presente termo aditivo tem por objeto a contratação de serviço extra, não previsto no Anexo I do Contrato de Prestação de Serviços firmado entre as partes (\"Contrato Original\", ref. GrainUp – Módulo Editora), consistente na implantação da integração direta com a API oficial dos Correios (CWS – Correios Web Services) na plataforma GrainUp – Módulo Editora, conforme escopo detalhado no Anexo I deste termo.\n\nEsta contratação enquadra-se na hipótese prevista na Cláusula 3ª do Contrato Original (serviços não incluídos e extras), sendo tratada de forma independente e com valor próprio, conforme a Cláusula 3ª deste termo.",
    },
    {
      numero: 2,
      titulo: "Do Escopo do Serviço Entregue",
      texto:
        "Estão incluídos no objeto deste termo, exclusivamente, os itens e funcionalidades descritos no Anexo I.\n\nO serviço já foi desenvolvido, testado e implantado em produção antes da assinatura deste termo, que tem caráter de formalização e faturamento da entrega já realizada.",
    },
    {
      numero: 3,
      titulo: "Do Valor e da Forma de Pagamento",
      texto:
        "Pela execução do serviço descrito no Anexo I, a CONTRATANTE pagará ao CONTRATADO o valor fechado de R$ 500,00 (quinhentos reais), conforme previamente acordado entre as partes.\n\nO pagamento será realizado de forma integral (100%), no ato da assinatura deste termo, via PIX para a chave 093.416.016-30 (CPF), em nome de Silas Pereira Silva.",
    },
    {
      numero: 4,
      titulo: "Da Garantia",
      texto:
        "O CONTRATADO prestará garantia de 30 (trinta) dias, contados da assinatura deste termo, destinada à correção de falhas do item entregue que não funcione conforme o Anexo I, sem custo adicional, observada a distinção entre correção e evolução prevista na Cláusula 3ª do Contrato Original.\n\nEncerrado o período de garantia, manutenções, ajustes e novas funcionalidades relacionadas a este item observarão a Cláusula 8ª do Contrato Original.",
    },
    {
      numero: 5,
      titulo: "Da Relação com o Contrato Original",
      texto:
        "Permanecem inalteradas e em pleno vigor todas as demais cláusulas do Contrato Original (GrainUp – Módulo Editora), inclusive as disposições sobre propriedade intelectual, confidencialidade, custos de terceiros, vigência, rescisão e foro, que se aplicam integralmente a este termo aditivo, no que não conflitarem com o aqui disposto.\n\nOs custos de terceiros relativos à contratação, homologação e uso do CWS (Correios Web Services) junto aos Correios são de responsabilidade exclusiva da CONTRATANTE, nos termos da Cláusula 11ª do Contrato Original.",
    },
    {
      numero: 6,
      titulo: "Da Vigência",
      texto:
        "Este termo aditivo vigora a partir da data de sua assinatura e estende-se até o encerramento do período de garantia previsto na Cláusula 4ª.",
    },
    {
      numero: 7,
      titulo: "Do Foro",
      texto:
        "Fica eleito o foro da comarca de Almirante Tamandaré, Estado do Paraná, para dirimir quaisquer questões oriundas deste termo, com renúncia a qualquer outro, por mais privilegiado que seja.",
    },
  ],
  escopo: {
    titulo: "Escopo Detalhado — Integração com a API dos Correios",
    areas: [
      {
        titulo: "Cálculo de frete em tempo real",
        itens: [
          "Autenticação direta com o CWS (Correios Web Services), com gestão automática de token de acesso",
          "Cálculo de frete em tempo real no checkout para os serviços PAC, SEDEX e SEDEX 10, com base no peso e nas dimensões reais dos livros",
          "Consulta direta à API oficial dos Correios, com uso do contrato e cartão de postagem da CONTRATANTE",
        ],
      },
      {
        titulo: "Rastreamento automático de pedidos",
        itens: [
          "Consulta automática do rastreamento (Rastro) dos Correios para pedidos com código de rastreio",
          "Verificação periódica automatizada (a cada 4 horas) do status de entrega de todos os pedidos enviados",
          "Atualização automática do status do pedido para \"entregue\" assim que confirmada a entrega pelos Correios",
          "Disparo automático de e-mail solicitando avaliação do cliente após a confirmação de entrega",
        ],
      },
      {
        titulo: "Continuidade e confiabilidade",
        itens: [
          "Renovação automática do token de autenticação antes do vencimento",
          "Nova tentativa automática em caso de falha temporária de autenticação ou comunicação com a API",
        ],
      },
    ],
  },
  bonus: {
    titulo: "Itens Entregues como Bônus (Sem Custo Adicional)",
    itens: [
      "Fallback automático para o Melhor Envio no cálculo de frete, caso a API dos Correios esteja temporariamente indisponível, garantindo que o checkout nunca fique sem opções de frete",
    ],
  },
  pdfStoragePath: "contratos/Termo-Aditivo-GrainUp-Correios.pdf",
};

export const CONTRATOS_REGISTRY: Record<string, ContratoContent> = {
  [CONTRATO_EDITORA_JOCUM.slug]: CONTRATO_EDITORA_JOCUM,
  [CONTRATO_ADITIVO_CORREIOS.slug]: CONTRATO_ADITIVO_CORREIOS,
};

export function getContratoContent(slug: string | null | undefined): ContratoContent {
  return (slug && CONTRATOS_REGISTRY[slug]) || CONTRATO_EDITORA_JOCUM;
}
