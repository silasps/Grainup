import type { Metadata } from "next";
import { Shield, Eye, Database, Share2, Lock, UserCheck, Mail, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Saiba como a Editora Jocum coleta, usa e protege seus dados pessoais em conformidade com a LGPD.",
};

const SECTIONS = [
  {
    id: "quem-somos",
    icon: Shield,
    title: "1. Quem somos",
    content: (
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        <p>
          A <strong className="text-foreground">Editora Jocum Brasil</strong>, inscrita no CNPJ
          07.112.226/0001-23, com sede na Av. Vereador Wadislau Bugalski, 3826 — Almirante Tamandaré/PR,
          CEP 83511-000, é a controladora dos dados pessoais tratados nesta plataforma.
        </p>
        <p>
          Esta Política de Privacidade descreve quais dados coletamos, como os utilizamos, com quem
          os compartilhamos e quais são os seus direitos como titular, em conformidade com a{" "}
          <strong className="text-foreground">Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong>.
        </p>
        <p>
          Ao navegar em nosso site ou realizar uma compra, você reconhece que leu e compreendeu esta
          política. Caso não concorde com seus termos, solicitamos que não utilize nossos serviços.
        </p>
      </div>
    ),
  },
  {
    id: "dados-coletados",
    icon: Database,
    title: "2. Quais dados coletamos",
    content: (
      <div className="space-y-5 text-muted-foreground leading-relaxed">
        <div>
          <h3 className="font-semibold text-foreground mb-2">2.1 Dados fornecidos por você</h3>
          <ul className="list-disc list-inside space-y-1.5 ml-2">
            <li>Nome completo e CPF/CNPJ (necessários para emissão de nota fiscal)</li>
            <li>Endereço de e-mail e número de telefone</li>
            <li>Endereço completo para entrega (logradouro, número, complemento, CEP, cidade, estado)</li>
            <li>Dados de pagamento — processados com segurança pelo nosso parceiro de pagamentos; não armazenamos dados de cartão em nossos servidores</li>
            <li>Conteúdo que você nos envia via formulários de contato, SAC ou avaliações de produtos</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">2.2 Dados coletados automaticamente</h3>
          <ul className="list-disc list-inside space-y-1.5 ml-2">
            <li>Endereço IP e informações de localização aproximada</li>
            <li>Tipo de dispositivo, sistema operacional e navegador</li>
            <li>Páginas visitadas, tempo de permanência e interações no site</li>
            <li>Dados de cookies e tecnologias similares (detalhados na seção 6)</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">2.3 Dados de terceiros</h3>
          <p>
            Em casos de autenticação via redes sociais (ex.: Google), recebemos apenas os dados que
            você autoriza expressamente ao fazer o login — geralmente nome e e-mail.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "finalidades",
    icon: Eye,
    title: "3. Para que usamos seus dados",
    content: (
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {[
            {
              titulo: "Processar pedidos",
              desc: "Confirmar pagamentos, emitir notas fiscais e organizar o envio dos livros.",
            },
            {
              titulo: "Entrega e logística",
              desc: "Transmitir seu endereço às transportadoras parceiras para entrega do pedido.",
            },
            {
              titulo: "Atendimento ao cliente",
              desc: "Responder dúvidas, resolver problemas e processar trocas e devoluções.",
            },
            {
              titulo: "Comunicações sobre o pedido",
              desc: "Enviar confirmações, atualizações de rastreamento e notificações transacionais.",
            },
            {
              titulo: "Marketing com consentimento",
              desc: "Enviar newsletters, promoções e novidades editoriais — apenas se você optar por receber.",
            },
            {
              titulo: "Segurança e prevenção a fraudes",
              desc: "Detectar atividades suspeitas e proteger você e nosso site.",
            },
            {
              titulo: "Obrigações legais",
              desc: "Cumprir exigências fiscais, contábeis e regulatórias aplicáveis.",
            },
            {
              titulo: "Melhoria do serviço",
              desc: "Analisar como nosso site é usado para aprimorar a experiência de navegação.",
            },
          ].map((item) => (
            <div key={item.titulo} className="bg-brand-50 rounded-lg p-4 border border-brand/10">
              <p className="font-semibold text-foreground text-sm mb-1">{item.titulo}</p>
              <p className="text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "bases-legais",
    icon: UserCheck,
    title: "4. Bases legais (LGPD)",
    content: (
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        <p>
          Todo tratamento de dados que realizamos está fundamentado em ao menos uma das bases legais
          previstas no Art. 7º da LGPD:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse mt-3">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 font-semibold text-foreground w-1/3">Base legal</th>
                <th className="text-left py-3 font-semibold text-foreground">Quando aplicamos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Execução de contrato", "Para processar, faturar e entregar seu pedido"],
                ["Cumprimento de obrigação legal", "Emissão de nota fiscal, recolhimento de impostos, compliance financeiro"],
                ["Legítimo interesse", "Prevenção a fraudes, segurança do site e análise de uso (de forma anonimizada)"],
                ["Consentimento", "Envio de e-mails de marketing e newsletters — revogável a qualquer momento"],
              ].map(([base, quando]) => (
                <tr key={base}>
                  <td className="py-3 pr-4 font-medium text-foreground align-top">{base}</td>
                  <td className="py-3">{quando}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    id: "compartilhamento",
    icon: Share2,
    title: "5. Com quem compartilhamos seus dados",
    content: (
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        <p>
          Não vendemos seus dados pessoais. Compartilhamos somente o necessário com parceiros que
          nos ajudam a prestar os serviços contratados:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
          <li>
            <strong className="text-foreground">Processadores de pagamento</strong> (ex.: Stripe, Mercado Pago) — para
            autorização e liquidação de transações, sob seus próprios padrões de segurança (PCI-DSS).
          </li>
          <li>
            <strong className="text-foreground">Transportadoras e Correios</strong> — para operacionalizar a entrega dos
            pedidos no endereço informado.
          </li>
          <li>
            <strong className="text-foreground">Plataformas de e-mail</strong> — para envio de notificações transacionais
            e, com seu consentimento, comunicações de marketing.
          </li>
          <li>
            <strong className="text-foreground">Serviços de análise</strong> — dados agregados e anonimizados para
            entender o uso do site (ex.: Google Analytics).
          </li>
          <li>
            <strong className="text-foreground">Autoridades públicas</strong> — quando exigido por lei, ordem judicial ou
            regulatória.
          </li>
        </ul>
        <p className="mt-2">
          Todos os nossos fornecedores são contratualmente obrigados a manter a confidencialidade e
          segurança dos dados conforme a LGPD.
        </p>
      </div>
    ),
  },
  {
    id: "cookies",
    icon: RefreshCw,
    title: "6. Cookies e tecnologias de rastreamento",
    content: (
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <p>
          Utilizamos cookies e tecnologias similares para garantir o funcionamento do site, lembrar
          suas preferências e entender como ele é utilizado.
        </p>
        <div className="space-y-3 mt-2">
          {[
            {
              tipo: "Cookies essenciais",
              desc: "Necessários para o funcionamento básico do site (ex.: manter você autenticado, guardar o carrinho). Não podem ser desativados.",
            },
            {
              tipo: "Cookies de desempenho",
              desc: "Coletam informações anônimas sobre como os visitantes usam o site, permitindo que a melhoremos continuamente.",
            },
            {
              tipo: "Cookies de funcionalidade",
              desc: "Lembram suas preferências (idioma, região, modo de exibição) para personalizar sua experiência.",
            },
            {
              tipo: "Cookies de marketing",
              desc: "Usados para exibir anúncios relevantes e medir a eficácia de campanhas. Ativados somente com seu consentimento.",
            },
          ].map((c) => (
            <div key={c.tipo} className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0" />
              <div>
                <span className="font-semibold text-foreground">{c.tipo}: </span>
                {c.desc}
              </div>
            </div>
          ))}
        </div>
        <p>
          Você pode gerenciar suas preferências de cookies a qualquer momento clicando em{" "}
          <strong className="text-foreground">"Gerenciar cookies"</strong> no rodapé do site ou através das
          configurações do seu navegador.
        </p>
      </div>
    ),
  },
  {
    id: "retencao",
    icon: Database,
    title: "7. Por quanto tempo guardamos seus dados",
    content: (
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        <p>Mantemos seus dados pelo tempo necessário para cumprir a finalidade que motivou a coleta:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse mt-3">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 font-semibold text-foreground">Tipo de dado</th>
                <th className="text-left py-3 font-semibold text-foreground">Prazo de retenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Dados de pedidos e notas fiscais", "5 anos (obrigação fiscal — Código Tributário Nacional)"],
                ["Dados cadastrais (conta ativa)", "Enquanto sua conta estiver ativa + 1 ano após encerramento"],
                ["Logs de acesso", "6 meses (Marco Civil da Internet — Lei 12.965/2014)"],
                ["Dados de marketing", "Até a revogação do seu consentimento"],
                ["Dados de SAC", "2 anos após o encerramento da solicitação (CDC)"],
              ].map(([tipo, prazo]) => (
                <tr key={tipo}>
                  <td className="py-3 pr-4 font-medium text-foreground align-top">{tipo}</td>
                  <td className="py-3">{prazo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Após o prazo aplicável, os dados são excluídos de forma segura ou anonimizados.
        </p>
      </div>
    ),
  },
  {
    id: "seus-direitos",
    icon: UserCheck,
    title: "8. Seus direitos como titular (LGPD)",
    content: (
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <p>
          A LGPD garante a você os seguintes direitos, que podem ser exercidos a qualquer momento
          mediante solicitação ao nosso canal de atendimento:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          {[
            {
              direito: "Acesso",
              desc: "Confirmar se tratamos seus dados e obter uma cópia das informações que temos sobre você.",
            },
            {
              direito: "Correção",
              desc: "Solicitar a atualização ou retificação de dados incompletos, desatualizados ou incorretos.",
            },
            {
              direito: "Anonimização ou exclusão",
              desc: "Pedir que dados desnecessários, excessivos ou tratados sem base legal sejam apagados ou anonimizados.",
            },
            {
              direito: "Portabilidade",
              desc: "Receber seus dados em formato estruturado para transferência a outro fornecedor ou serviço.",
            },
            {
              direito: "Informação sobre compartilhamento",
              desc: "Saber com quais entidades públicas e privadas compartilhamos seus dados.",
            },
            {
              direito: "Revogação do consentimento",
              desc: "Retirar seu consentimento para tratamentos baseados nessa base legal, sem prejuízo aos anteriores.",
            },
            {
              direito: "Oposição",
              desc: "Se opor a tratamentos realizados com base em legítimo interesse, em caso de descumprimento da LGPD.",
            },
            {
              direito: "Revisão de decisões automatizadas",
              desc: "Solicitar revisão de decisões tomadas exclusivamente por meios automatizados que afetem seus interesses.",
            },
          ].map((item) => (
            <div key={item.direito} className="bg-card border border-border rounded-lg p-4">
              <p className="font-semibold text-foreground text-sm mb-1">{item.direito}</p>
              <p className="text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-2">
          Responderemos às solicitações em até <strong className="text-foreground">15 dias úteis</strong>. Em
          casos de maior complexidade, podemos prorrogar esse prazo por igual período, comunicando você
          com antecedência.
        </p>
      </div>
    ),
  },
  {
    id: "seguranca",
    icon: Lock,
    title: "9. Como protegemos seus dados",
    content: (
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não
          autorizado, perda, destruição ou divulgação indevida:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Criptografia em trânsito (TLS/HTTPS) em todas as comunicações</li>
          <li>Criptografia em repouso para dados sensíveis armazenados</li>
          <li>Controles de acesso baseados em função — apenas colaboradores autorizados acessam os dados</li>
          <li>Monitoramento contínuo de atividades suspeitas e logs de auditoria</li>
          <li>Testes periódicos de segurança e gestão de vulnerabilidades</li>
          <li>Dados de cartão processados diretamente pelo gateway, sem trânsito por nossos servidores</li>
        </ul>
        <p className="mt-2 p-4 bg-brand-50 rounded-lg border border-brand/10 text-sm">
          Em caso de incidente de segurança que possa gerar risco ou dano relevante a você, notificaremos a
          Autoridade Nacional de Proteção de Dados (ANPD) e, quando necessário, os titulares afetados, nos
          prazos legais.
        </p>
      </div>
    ),
  },
  {
    id: "menores",
    icon: Shield,
    title: "10. Menores de idade",
    content: (
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        <p>
          Nosso site não é direcionado a menores de 18 anos e não coletamos intencionalmente dados
          pessoais de crianças ou adolescentes sem o consentimento dos pais ou responsáveis legais.
        </p>
        <p>
          Se você é responsável por uma criança ou adolescente e acredita que seus dados foram coletados
          sem seu conhecimento, entre em contato conosco imediatamente para que possamos excluí-los.
        </p>
      </div>
    ),
  },
  {
    id: "contato",
    icon: Mail,
    title: "11. Canal de privacidade e DPO",
    content: (
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        <p>
          Para exercer seus direitos ou tirar dúvidas sobre o tratamento de seus dados, entre em contato
          com o nosso Encarregado de Dados (DPO):
        </p>
        <div className="bg-brand-50 rounded-xl p-6 border border-brand/10 mt-4 space-y-2 text-sm">
          <p>
            <strong className="text-foreground">Editora Jocum Brasil</strong>
          </p>
          <p>Av. Vereador Wadislau Bugalski, 3826 — Almirante Tamandaré/PR — CEP: 83511-000</p>
          <p>
            E-mail:{" "}
            <a
              href="mailto:privacidade@editorajocum.com.br"
              className="text-brand hover:underline"
            >
              privacidade@editorajocum.com.br
            </a>
          </p>
          <p>Telefone: (41) 9914-35610</p>
        </div>
        <p>
          Você também pode registrar uma reclamação junto à{" "}
          <strong className="text-foreground">Autoridade Nacional de Proteção de Dados (ANPD)</strong>{" "}
          em <span className="text-brand">gov.br/anpd</span>.
        </p>
      </div>
    ),
  },
  {
    id: "atualizacoes",
    icon: RefreshCw,
    title: "12. Atualizações desta política",
    content: (
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        <p>
          Esta política pode ser atualizada periodicamente para refletir mudanças em nossas práticas,
          na legislação ou nos serviços que oferecemos. Quando houver alterações relevantes, avisaremos
          você por e-mail ou por um aviso em destaque no site.
        </p>
        <p>
          A data da última atualização é indicada no topo desta página. O uso contínuo do site após a
          publicação de alterações implica aceitação da política revisada.
        </p>
        <p className="text-sm font-medium text-foreground">
          Última atualização: maio de 2025.
        </p>
      </div>
    ),
  },
];

export default function PoliticaDePrivacidadePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-20">
        <div className="container mx-auto max-w-7xl px-4">
          <Badge className="mb-6 bg-brand hover:bg-brand text-white text-xs px-3 py-1">
            Transparência e Privacidade
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold leading-tight mb-6 max-w-2xl">
            Política de{" "}
            <span className="text-brand">Privacidade</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl leading-relaxed">
            Valorizamos sua confiança. Saiba como coletamos, utilizamos e protegemos seus dados
            pessoais em conformidade com a LGPD.
          </p>
        </div>
      </section>

      {/* Destaques rápidos */}
      <section className="bg-brand text-white py-8">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div className="flex flex-col items-center gap-1.5">
              <Shield className="h-5 w-5" />
              <span>LGPD em conformidade</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Lock className="h-5 w-5" />
              <span>Dados criptografados</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <UserCheck className="h-5 w-5" />
              <span>Seus direitos garantidos</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Share2 className="h-5 w-5" />
              <span>Não vendemos seus dados</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sumário de navegação */}
      <section className="py-10 bg-secondary">
        <div className="container mx-auto max-w-7xl px-4">
          <h2 className="font-heading text-base font-semibold text-foreground mb-4">
            Nesta página
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-sm text-brand hover:text-brand-700 hover:underline transition-colors py-1"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Conteúdo principal */}
      <section className="py-14">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="space-y-14">
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              const isAlt = i % 2 !== 0;
              return (
                <div
                  key={s.id}
                  id={s.id}
                  className={`scroll-mt-24 rounded-2xl p-8 border ${
                    isAlt ? "bg-secondary border-border" : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-brand-50 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-brand" />
                    </div>
                    <h2 className="font-heading text-xl font-bold text-foreground">{s.title}</h2>
                  </div>
                  {s.content}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 bg-foreground text-white">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <Shield className="h-10 w-10 text-brand mx-auto mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-4">
            Dúvidas sobre sua privacidade?
          </h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Nossa equipe está pronta para ajudar. Entre em contato pelo SAC ou pelo canal exclusivo
            de privacidade.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/editora/sac"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Falar com o SAC
            </Link>
            <a
              href="mailto:privacidade@editorajocum.com.br"
              className="inline-flex items-center gap-2 border border-white/40 hover:bg-white/10 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              privacidade@editorajocum.com.br
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
