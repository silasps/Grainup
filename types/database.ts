export type UserRole =
  | "super_admin"
  | "admin_editora"
  | "admin_ead"
  | "admin_eifol"
  | "cliente"
  | "afiliado_jocum"
  | "afiliado_diretor"
  | "lider_jocum";

export type OrderStatus =
  | "aguardando_pagamento"
  | "pago"
  | "separando"
  | "enviado"
  | "entregue"
  | "cancelado"
  | "reembolsado"
  | "cancelamento_solicitado";

export type CancellationInitiatedBy = "customer" | "admin";
export type CancellationStatus = "pendente" | "aprovado" | "negado";
export type RefundStatus = "nao_aplicavel" | "pendente" | "processado" | "falhou";

export type PaymentStatus =
  | "pendente"
  | "aprovado"
  | "recusado"
  | "cancelado"
  | "reembolsado"
  | "chargeback";

export type PaymentMethod = "pix" | "credito" | "debito" | "boleto";

export type ReviewStatus = "pendente" | "aprovada" | "rejeitada";

export type TicketStatus =
  | "novo"
  | "em_atendimento"
  | "aguardando_cliente"
  | "resolvido"
  | "fechado";

export type AffiliateStatus = "pendente" | "ativo" | "suspenso" | "rejeitado";

export type FiscalStatus =
  | "nao_emitida"
  | "aguardando_emissao"
  | "emitida"
  | "autorizada"
  | "rejeitada"
  | "cancelada"
  | "erro_emissao"
  | "pendencia_fiscal";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          phone: string | null;
          cpf: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: never[];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_roles"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
        Relationships: never[];
      };
      authors: {
        Row: {
          id: string;
          name: string;
          slug: string;
          bio: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["authors"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["authors"]["Insert"]>;
        Relationships: never[];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: never[];
      };
      contratos: {
        Row: {
          id: string;
          token: string;
          client_name: string;
          client_email: string;
          contract_slug: string;
          status: string;
          otp_hash: string | null;
          otp_expires_at: string | null;
          signed_at: string | null;
          signer_ip: string | null;
          signer_user_agent: string | null;
          signer_latitude: number | null;
          signer_longitude: number | null;
          evidence_json: Record<string, unknown> | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          client_name: string;
          client_email: string;
          contract_slug?: string;
          status?: string;
        };
        Update: {
          client_name?: string;
          client_email?: string;
          status?: string;
          otp_hash?: string | null;
          otp_expires_at?: string | null;
          signed_at?: string | null;
          signer_ip?: string | null;
          signer_user_agent?: string | null;
          signer_latitude?: number | null;
          signer_longitude?: number | null;
          evidence_json?: Record<string, unknown> | null;
        };
        Relationships: never[];
      };
      books: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          slug: string;
          author_id: string | null;
          category_id: string | null;
          cover_url: string | null;
          description_short: string | null;
          description_full: string | null;
          price: number;
          price_promotional: number | null;
          stock: number;
          weight_grams: number | null;
          height_cm: number | null;
          width_cm: number | null;
          length_cm: number | null;
          pages: number | null;
          isbn: string | null;
          sku: string | null;
          ncm: string | null;
          cfop: string | null;
          publisher: string | null;
          published_at: string | null;
          is_active: boolean;
          is_featured: boolean;
          is_new: boolean;
          is_bestseller: boolean;
          sales_count: number;
          rating_avg: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          subtitle?: string | null;
          slug: string;
          author_id?: string | null;
          category_id?: string | null;
          cover_url?: string | null;
          description_short?: string | null;
          description_full?: string | null;
          price: number;
          price_promotional?: number | null;
          stock?: number;
          weight_grams?: number | null;
          height_cm?: number | null;
          width_cm?: number | null;
          length_cm?: number | null;
          pages?: number | null;
          isbn?: string | null;
          sku?: string | null;
          ncm?: string | null;
          cfop?: string | null;
          publisher?: string | null;
          published_at?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          is_new?: boolean;
          is_bestseller?: boolean;
        };
        Update: {
          title?: string;
          subtitle?: string | null;
          slug?: string;
          author_id?: string | null;
          category_id?: string | null;
          cover_url?: string | null;
          description_short?: string | null;
          description_full?: string | null;
          price?: number;
          price_promotional?: number | null;
          stock?: number;
          weight_grams?: number | null;
          height_cm?: number | null;
          width_cm?: number | null;
          length_cm?: number | null;
          pages?: number | null;
          isbn?: string | null;
          sku?: string | null;
          ncm?: string | null;
          cfop?: string | null;
          publisher?: string | null;
          published_at?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          is_new?: boolean;
          is_bestseller?: boolean;
        };
        Relationships: never[];
      };
      book_images: {
        Row: {
          id: string;
          book_id: string;
          url: string;
          alt: string | null;
          position: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["book_images"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["book_images"]["Insert"]>;
        Relationships: never[];
      };
      combos: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          price_original: number;
          price_promotional: number;
          discount_type: "fixed" | "percentage";
          is_active: boolean;
          is_featured: boolean;
          bling_product_id: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["combos"]["Row"], "id" | "created_at" | "bling_product_id"> & { bling_product_id?: number | null };
        Update: Partial<Database["public"]["Tables"]["combos"]["Insert"]>;
        Relationships: never[];
      };
      combo_items: {
        Row: {
          id: string;
          combo_id: string;
          book_id: string;
          quantity: number;
        };
        Insert: Omit<Database["public"]["Tables"]["combo_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["combo_items"]["Insert"]>;
        Relationships: never[];
      };
      offers: {
        Row: {
          id: string;
          name: string;
          type: "book" | "combo" | "category" | "shipping";
          book_id: string | null;
          combo_id: string | null;
          category_id: string | null;
          discount_type: "percentage" | "fixed";
          discount_value: number;
          min_order_value: number | null;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["offers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["offers"]["Insert"]>;
        Relationships: never[];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          full_name: string;
          zip_code: string;
          street: string;
          number: string;
          complement: string | null;
          neighborhood: string;
          city: string;
          state: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["addresses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["addresses"]["Insert"]>;
        Relationships: never[];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          customer_email: string;
          customer_name: string;
          customer_cpf: string | null;
          shipping_address: Record<string, unknown> | null;
          subtotal: number;
          discount: number;
          shipping_cost: number;
          total: number;
          status: OrderStatus;
          payment_status: PaymentStatus;
          payment_method: PaymentMethod | null;
          affiliate_id: string | null;
          coupon_code: string | null;
          notes: string | null;
          tracking_code: string | null;
          invoice_number: string | null;
          invoice_url: string | null;
          fiscal_status: FiscalStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "order_number" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: never[];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          book_id: string | null;
          combo_id: string | null;
          ead_course_id: string | null;
          title: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id" | "ead_course_id"> & {
          book_id?: string | null;
          combo_id?: string | null;
          title?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: never[];
      };
      shipping_rates: {
        Row: {
          id: string;
          name: string;
          state: string | null;
          min_order_value: number | null;
          price: number;
          estimated_days: number;
          is_free: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shipping_rates"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["shipping_rates"]["Insert"]>;
        Relationships: never[];
      };
      reviews: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          order_id: string | null;
          rating: number;
          title: string | null;
          body: string | null;
          status: ReviewStatus;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: never[];
      };
      book_events: {
        Row: {
          id: string;
          book_id: string;
          event_type: string;
          session_id: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["book_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["book_events"]["Insert"]>;
        Relationships: never[];
      };
      campaigns: {
        Row: {
          id: string;
          title: string;
          subject: string;
          body: string;
          segment: string;
          status: string;
          sent_count: number;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaigns"]["Row"], "id" | "created_at" | "sent_count" | "sent_at"> & { status?: string };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Row"]>;
        Relationships: never[];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          origin: string;
          book_id: string | null;
          marketing_consent: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: never[];
      };
      order_cancellations: {
        Row: {
          id: string;
          order_id: string;
          initiated_by: CancellationInitiatedBy;
          initiated_by_id: string | null;
          previous_status: OrderStatus;
          reason: string;
          status: CancellationStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          refund_amount: number | null;
          refund_status: RefundStatus;
          refund_transaction_id: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["order_cancellations"]["Row"], "id" | "created_at" | "updated_at" | "reviewed_by" | "reviewed_at" | "refund_amount" | "refund_transaction_id" | "admin_notes"> & {
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          refund_amount?: number | null;
          refund_transaction_id?: string | null;
          admin_notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_cancellations"]["Insert"]>;
        Relationships: never[];
      };
      support_tickets: {
        Row: {
          id: string;
          ticket_number: string;
          user_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          order_id: string | null;
          category: string;
          subject: string;
          status: TicketStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["support_tickets"]["Row"], "id" | "ticket_number" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["support_tickets"]["Insert"]>;
        Relationships: never[];
      };
      support_messages: {
        Row: {
          id: string;
          ticket_id: string;
          sender_id: string | null;
          sender_name: string;
          body: string;
          is_admin: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["support_messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["support_messages"]["Insert"]>;
        Relationships: never[];
      };
      faqs: {
        Row: {
          id: string;
          category_id: string | null;
          question: string;
          answer: string;
          position: number;
          is_active: boolean;
          is_featured: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["faqs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["faqs"]["Insert"]>;
        Relationships: never[];
      };
      faq_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          position: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["faq_categories"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["faq_categories"]["Insert"]>;
        Relationships: never[];
      };
      news_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          summary: string | null;
          content: string | null;
          image_url: string | null;
          is_active: boolean;
          is_featured: boolean;
          published_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["news_posts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["news_posts"]["Insert"]>;
        Relationships: never[];
      };
      financial_movements: {
        Row: {
          id: string;
          order_id: string;
          gross_amount: number;
          discount: number;
          shipping: number;
          gateway_fee: number;
          affiliate_commission: number;
          net_amount: number;
          payment_method: PaymentMethod | null;
          gateway: string | null;
          gateway_transaction_id: string | null;
          status: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["financial_movements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["financial_movements"]["Insert"]>;
        Relationships: never[];
      };
      fiscal_documents: {
        Row: {
          id: string;
          order_id: string;
          status: FiscalStatus;
          document_type: string | null;
          document_number: string | null;
          document_url: string | null;
          xml_url: string | null;
          error_message: string | null;
          issued_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["fiscal_documents"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["fiscal_documents"]["Insert"]>;
        Relationships: never[];
      };
      affiliates: {
        Row: {
          id: string;
          user_id: string;
          type: "geral" | "jocum" | "diretor";
          name: string;
          email: string;
          cpf: string;
          phone: string;
          status: AffiliateStatus;
          commission_rate: number;
          balance: number;
          balance_pending: number;
          leader_name: string | null;
          leader_email: string | null;
          leader_phone: string | null;
          leader_token: string;
          leader_confirmation: "confirmed" | "denied" | null;
          leader_confirmation_notes: string | null;
          leader_confirmed_at: string | null;
          serving_location: string | null;
          last_confirmed_at: string | null;
          requires_review: boolean;
          next_review_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["affiliates"]["Row"], "id" | "balance" | "balance_pending" | "created_at" | "requires_review" | "next_review_at" | "leader_token" | "leader_confirmation" | "leader_confirmation_notes" | "leader_confirmed_at"> & {
          balance?: number;
          balance_pending?: number;
          requires_review?: boolean;
          next_review_at?: string | null;
          leader_token?: string;
          leader_confirmation?: "confirmed" | "denied" | null;
          leader_confirmation_notes?: string | null;
          leader_confirmed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["affiliates"]["Insert"]>;
        Relationships: never[];
      };
      affiliate_links: {
        Row: {
          id: string;
          affiliate_id: string;
          book_id: string | null;
          code: string;
          clicks: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["affiliate_links"]["Row"], "id" | "clicks" | "created_at"> & {
          clicks?: number;
        };
        Update: Partial<Database["public"]["Tables"]["affiliate_links"]["Insert"]>;
        Relationships: never[];
      };
      affiliate_sales: {
        Row: {
          id: string;
          affiliate_id: string;
          order_id: string;
          commission_amount: number;
          commission_rate: number;
          status: "pendente" | "confirmada" | "paga" | "cancelada";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["affiliate_sales"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["affiliate_sales"]["Insert"]>;
        Relationships: never[];
      };
      contact_settings: {
        Row: {
          id: string;
          email: string | null;
          whatsapp: string | null;
          phone: string | null;
          whatsapp_message: string | null;
          whatsapp_enabled: boolean;
          address: string | null;
          business_hours: string | null;
          instagram: string | null;
          facebook: string | null;
          youtube: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["contact_settings"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["contact_settings"]["Insert"]>;
        Relationships: never[];
      };
      legal_pages: {
        Row: {
          id: string;
          type: "privacy" | "terms" | "returns" | "shipping" | "cookies" | "cancellation";
          title: string;
          content: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["legal_pages"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["legal_pages"]["Insert"]>;
        Relationships: never[];
      };
      destaques: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          image_url: string | null;
          image_mobile_url: string | null;
          video_url: string | null;
          focal_x: number;
          focal_y: number;
          cta_label: string | null;
          cta_url: string | null;
          type: "oferta" | "novidade" | "anuncio";
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["destaques"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["destaques"]["Insert"]>;
        Relationships: never[];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          cta_label: string | null;
          cta_url: string | null;
          badge: string | null;
          image_url: string | null;
          type: "promo" | "info" | "warning";
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["announcements"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["announcements"]["Insert"]>;
        Relationships: never[];
      };
      beta_feedback: {
        Row: {
          id: string;
          page_url: string;
          message: string;
          user_id: string | null;
          user_email: string | null;
          user_name: string | null;
          status: "novo" | "em_analise" | "implementado" | "descartado";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["beta_feedback"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["beta_feedback"]["Insert"]>;
        Relationships: never[];
      };
      bling_tokens: {
        Row: {
          id: number;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["bling_tokens"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["bling_tokens"]["Insert"]>;
        Relationships: never[];
      };
      email_logs: {
        Row: {
          id: string;
          email_type: string;
          sent_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["email_logs"]["Row"], "id" | "sent_at"> & { sent_at?: string };
        Update: Partial<Database["public"]["Tables"]["email_logs"]["Insert"]>;
        Relationships: never[];
      };

      // ─── EAD ───────────────────────────────────────────────────────────────

      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          custom_domain: string | null;
          is_active: boolean;
          plan: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: never[];
      };
      tenant_settings: {
        Row: {
          tenant_id: string;
          logo_url: string | null;
          primary_color: string;
          email_from_name: string | null;
          email_from_domain: string | null;
          bunny_library_id: string | null;
          bunny_token_key: string | null;
          bunny_cdn_hostname: string | null;
          mp_access_token: string | null;
          mp_public_key: string | null;
          community_link: string | null;
        };
        Insert: Database["public"]["Tables"]["tenant_settings"]["Row"];
        Update: Partial<Database["public"]["Tables"]["tenant_settings"]["Row"]>;
        Relationships: never[];
      };
      tenant_admins: {
        Row: { tenant_id: string; user_id: string };
        Insert: Database["public"]["Tables"]["tenant_admins"]["Row"];
        Update: never;
        Relationships: never[];
      };
      ead_courses: {
        Row: {
          id: string;
          tenant_id: string;
          title: string;
          slug: string;
          subtitle: string | null;
          description_short: string | null;
          description_full: string | null;
          thumbnail_url: string | null;
          cover_url: string | null;
          trailer_video_id: string | null;
          instructor_name: string | null;
          instructor_bio: string | null;
          instructor_photo_url: string | null;
          price: number;
          price_promotional: number | null;
          access_days: number;
          is_active: boolean;
          is_featured: boolean;
          is_free: boolean;
          level: "iniciante" | "intermediario" | "avancado" | null;
          language: string;
          total_lessons: number;
          total_duration_s: number;
          certificate_enabled: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_courses"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ead_courses"]["Insert"]>;
        Relationships: never[];
      };
      ead_modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          position: number;
          is_free_preview: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_modules"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ead_modules"]["Insert"]>;
        Relationships: never[];
      };
      ead_lessons: {
        Row: {
          id: string;
          module_id: string;
          course_id: string;
          title: string;
          slug: string;
          content_type: "video" | "texto" | "pdf" | "quiz" | "link_externo";
          bunny_video_id: string | null;
          duration_s: number | null;
          content_body: string | null;
          pdf_url: string | null;
          external_url: string | null;
          subtitle_url: string | null;
          description: string | null;
          is_free_preview: boolean;
          publish_at: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_lessons"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ead_lessons"]["Insert"]>;
        Relationships: never[];
      };
      ead_lesson_attachments: {
        Row: {
          id: string;
          lesson_id: string;
          label: string;
          url: string;
          type: string;
          position: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_lesson_attachments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ead_lesson_attachments"]["Insert"]>;
        Relationships: never[];
      };
      ead_enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          order_id: string | null;
          status: "ativa" | "expirada" | "suspensa" | "cancelada";
          enrolled_at: string;
          expires_at: string;
          completed_at: string | null;
          cancelled_at: string | null;
          notes: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_enrollments"]["Row"], "id" | "enrolled_at">;
        Update: Partial<Database["public"]["Tables"]["ead_enrollments"]["Insert"]>;
        Relationships: never[];
      };
      ead_lesson_progress: {
        Row: {
          id: string;
          enrollment_id: string;
          lesson_id: string;
          user_id: string;
          completed: boolean;
          last_position_s: number;
          watch_time_s: number;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_lesson_progress"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ead_lesson_progress"]["Insert"]>;
        Relationships: never[];
      };
      ead_certificates: {
        Row: {
          id: string;
          enrollment_id: string;
          user_id: string;
          course_id: string;
          certificate_code: string;
          issued_at: string;
          student_name: string;
          course_title: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_certificates"]["Row"], "id" | "certificate_code" | "issued_at">;
        Update: Partial<Database["public"]["Tables"]["ead_certificates"]["Insert"]>;
        Relationships: never[];
      };
      ead_reviews: {
        Row: {
          id: string;
          course_id: string;
          user_id: string;
          rating: number;
          body: string | null;
          status: ReviewStatus;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_reviews"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ead_reviews"]["Insert"]>;
        Relationships: never[];
      };
      ead_qa_questions: {
        Row: {
          id: string;
          lesson_id: string;
          user_id: string;
          body: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_qa_questions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ead_qa_questions"]["Insert"]>;
        Relationships: never[];
      };
      ead_qa_answers: {
        Row: {
          id: string;
          question_id: string;
          user_id: string;
          body: string;
          is_instructor: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_qa_answers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ead_qa_answers"]["Insert"]>;
        Relationships: never[];
      };
      ead_quizzes: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          passing_score: number;
          blocks_next: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_quizzes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ead_quizzes"]["Insert"]>;
        Relationships: never[];
      };
      ead_quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          body: string;
          options: Array<{ text: string; correct: boolean }>;
          position: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_quiz_questions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ead_quiz_questions"]["Insert"]>;
        Relationships: never[];
      };
      ead_quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          answers: Record<string, number>;
          score: number;
          passed: boolean;
          attempted_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_quiz_attempts"]["Row"], "id" | "attempted_at">;
        Update: never;
        Relationships: never[];
      };
      ead_course_announcements: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          body: string;
          sent_at: string;
          sent_by: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["ead_course_announcements"]["Row"], "id" | "sent_at">;
        Update: never;
        Relationships: never[];
      };
      ead_wishlists: {
        Row: { user_id: string; course_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["ead_wishlists"]["Row"], "created_at">;
        Update: never;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ead_course_progress: {
        Args: { p_enrollment_id: string };
        Returns: number;
      };
      search_books_quick: {
        Args: { query: string };
        Returns: {
          id: string;
          title: string;
          slug: string;
          cover_url: string | null;
          price: number;
          price_promotional: number | null;
          author: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}
