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
  | "reembolsado";

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

export interface Database {
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
        Insert: Omit<Database["public"]["Tables"]["books"]["Row"], "id" | "sales_count" | "rating_avg" | "rating_count" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["books"]["Insert"]>;
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
          is_active: boolean;
          is_featured: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["combos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["combos"]["Insert"]>;
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
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          customer_email: string;
          customer_name: string;
          customer_cpf: string | null;
          shipping_address: Record<string, unknown>;
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
          fiscal_status: FiscalStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "order_number" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          book_id: string | null;
          combo_id: string | null;
          title: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
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
      };
      affiliates: {
        Row: {
          id: string;
          user_id: string;
          type: "jocum" | "diretor";
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
          serving_location: string | null;
          last_confirmed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["affiliates"]["Row"], "id" | "balance" | "balance_pending" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["affiliates"]["Insert"]>;
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
        Insert: Omit<Database["public"]["Tables"]["affiliate_links"]["Row"], "id" | "clicks" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["affiliate_links"]["Insert"]>;
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
      };
      legal_pages: {
        Row: {
          id: string;
          type: "privacy" | "terms" | "returns" | "shipping" | "cookies";
          title: string;
          content: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["legal_pages"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["legal_pages"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
