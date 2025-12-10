export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string | null
          event_category: string
          event_name: string
          event_properties: Json | null
          id: string
          ip_address: string | null
          page_path: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_category: string
          event_name: string
          event_properties?: Json | null
          id?: string
          ip_address?: string | null
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_category?: string
          event_name?: string
          event_properties?: Json | null
          id?: string
          ip_address?: string | null
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          applicant_id: string
          application_notes: string | null
          availability: string | null
          cover_letter: string | null
          created_at: string | null
          expected_rate: string | null
          id: string
          opportunity_id: string
          portfolio_links: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_id: string
          application_notes?: string | null
          availability?: string | null
          cover_letter?: string | null
          created_at?: string | null
          expected_rate?: string | null
          id?: string
          opportunity_id: string
          portfolio_links?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: string
          application_notes?: string | null
          availability?: string | null
          cover_letter?: string | null
          created_at?: string | null
          expected_rate?: string | null
          id?: string
          opportunity_id?: string
          portfolio_links?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      award_comments: {
        Row: {
          award_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          award_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          award_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_comments_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          category: string | null
          certificate_url: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          organization: string
          title: string
          updated_at: string
          user_id: string
          verification_status: string | null
          verification_url: string | null
          year: number | null
        }
        Insert: {
          category?: string | null
          certificate_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          organization: string
          title: string
          updated_at?: string
          user_id: string
          verification_status?: string | null
          verification_url?: string | null
          year?: number | null
        }
        Update: {
          category?: string | null
          certificate_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          organization?: string
          title?: string
          updated_at?: string
          user_id?: string
          verification_status?: string | null
          verification_url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      challenge_entries: {
        Row: {
          challenge_id: string
          created_at: string
          description: string | null
          id: string
          media_type: string
          media_url: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          vote_count: number | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          description?: string | null
          id?: string
          media_type: string
          media_url: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          vote_count?: number | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string
          media_url?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "challenge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          brand_logo_url: string | null
          brand_name: string | null
          budget: string | null
          category: string
          created_at: string
          created_by: string
          deadline: string
          description: string
          id: string
          max_entries: number | null
          prize_amount: number | null
          prize_description: string | null
          requirements: string | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
          voting_ends_at: string | null
        }
        Insert: {
          brand_logo_url?: string | null
          brand_name?: string | null
          budget?: string | null
          category: string
          created_at?: string
          created_by: string
          deadline: string
          description: string
          id?: string
          max_entries?: number | null
          prize_amount?: number | null
          prize_description?: string | null
          requirements?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string
          voting_ends_at?: string | null
        }
        Update: {
          brand_logo_url?: string | null
          brand_name?: string | null
          budget?: string | null
          category?: string
          created_at?: string
          created_by?: string
          deadline?: string
          description?: string
          id?: string
          max_entries?: number | null
          prize_amount?: number | null
          prize_description?: string | null
          requirements?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          voting_ends_at?: string | null
        }
        Relationships: []
      }
      communities: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_official: boolean | null
          is_private: boolean | null
          location: string | null
          member_count: number | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_official?: boolean | null
          is_private?: boolean | null
          location?: string | null
          member_count?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_official?: boolean | null
          is_private?: boolean | null
          location?: string | null
          member_count?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          community_id: string
          content: string
          created_at: string
          id: string
          media_type: string | null
          media_urls: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_urls?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_urls?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      company_reviews: {
        Row: {
          company_id: string
          created_at: string
          helpful_count: number | null
          id: string
          opportunity_id: string | null
          project_id: string | null
          rating: number
          response_date: string | null
          response_text: string | null
          review_text: string | null
          reviewer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          opportunity_id?: string | null
          project_id?: string | null
          rating: number
          response_date?: string | null
          response_text?: string | null
          review_text?: string | null
          reviewer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          opportunity_id?: string | null
          project_id?: string | null
          rating?: number
          response_date?: string | null
          response_text?: string | null
          review_text?: string | null
          reviewer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_reviews_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      connections: {
        Row: {
          connected_user_id: string
          created_at: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          connected_user_id: string
          created_at?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          connected_user_id?: string
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_comments: {
        Row: {
          content: string
          created_at: string
          credit_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          credit_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          credit_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_comments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          created_at: string
          display_order: number | null
          embed_data: Json | null
          id: string
          is_featured: boolean | null
          platform: string | null
          project_name: string
          role: string
          thumbnail_url: string | null
          updated_at: string
          url: string | null
          user_id: string
          verification_status: string | null
          verification_url: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          embed_data?: Json | null
          id?: string
          is_featured?: boolean | null
          platform?: string | null
          project_name: string
          role: string
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
          verification_status?: string | null
          verification_url?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          embed_data?: Json | null
          id?: string
          is_featured?: boolean | null
          platform?: string | null
          project_name?: string
          role?: string
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
          verification_status?: string | null
          verification_url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      digital_product_purchases: {
        Row: {
          amount: number
          buyer_id: string
          currency: string | null
          download_urls: string[] | null
          id: string
          payment_intent_id: string | null
          payment_status: string | null
          product_id: string
          purchased_at: string | null
          seller_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          currency?: string | null
          download_urls?: string[] | null
          id?: string
          payment_intent_id?: string | null
          payment_status?: string | null
          product_id: string
          purchased_at?: string | null
          seller_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          currency?: string | null
          download_urls?: string[] | null
          id?: string
          payment_intent_id?: string | null
          payment_status?: string | null
          product_id?: string
          purchased_at?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_reviews: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          rating: number
          review_text: string | null
          reviewer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          rating: number
          review_text?: string | null
          reviewer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_products: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          demo_url: string | null
          description: string | null
          download_count: number | null
          file_urls: string[] | null
          id: string
          is_active: boolean | null
          license_type: string | null
          preview_urls: string[] | null
          price: number
          product_type: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          demo_url?: string | null
          description?: string | null
          download_count?: number | null
          file_urls?: string[] | null
          id?: string
          is_active?: boolean | null
          license_type?: string | null
          preview_urls?: string[] | null
          price: number
          product_type: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          demo_url?: string | null
          description?: string | null
          download_count?: number | null
          file_urls?: string[] | null
          id?: string
          is_active?: boolean | null
          license_type?: string | null
          preview_urls?: string[] | null
          price?: number
          product_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_portfolio_item: boolean | null
          media_type: string | null
          media_urls: Json | null
          portfolio_item_id: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_portfolio_item?: boolean | null
          media_type?: string | null
          media_urls?: Json | null
          portfolio_item_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_portfolio_item?: boolean | null
          media_type?: string | null
          media_urls?: Json | null
          portfolio_item_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_stats: {
        Row: {
          created_at: string
          date_achieved: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_featured: boolean | null
          issuer: string | null
          stat_type: string
          title: string
          updated_at: string
          user_id: string
          value: string | null
          verification_url: string | null
        }
        Insert: {
          created_at?: string
          date_achieved?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          issuer?: string | null
          stat_type: string
          title: string
          updated_at?: string
          user_id: string
          value?: string | null
          verification_url?: string | null
        }
        Update: {
          created_at?: string
          date_achieved?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          issuer?: string | null
          stat_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          value?: string | null
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "industry_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "industry_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "industry_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          current_uses: number | null
          id: string
          invite_code: string | null
          invitee_email: string
          invitee_user_id: string | null
          inviter_id: string
          max_uses: number | null
          status: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          current_uses?: number | null
          id?: string
          invite_code?: string | null
          invitee_email: string
          invitee_user_id?: string | null
          inviter_id: string
          max_uses?: number | null
          status?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          current_uses?: number | null
          id?: string
          invite_code?: string | null
          invitee_email?: string
          invitee_user_id?: string | null
          inviter_id?: string
          max_uses?: number | null
          status?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          issued_by: string
          issued_to: string
          line_items: Json | null
          milestone_id: string | null
          notes: string | null
          paid_at: string | null
          project_id: string
          status: string
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_by: string
          issued_to: string
          line_items?: Json | null
          milestone_id?: string | null
          notes?: string | null
          paid_at?: string | null
          project_id: string
          status?: string
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_by?: string
          issued_to?: string
          line_items?: Json | null
          milestone_id?: string | null
          notes?: string | null
          paid_at?: string | null
          project_id?: string
          status?: string
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          id: string
          match_type: string
          status: string | null
          target_id: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_type: string
          status?: string | null
          target_id?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          match_type?: string
          status?: string | null
          target_id?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          match_id: string | null
          read: boolean | null
          receiver_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          match_id?: string | null
          read?: boolean | null
          receiver_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          match_id?: string | null
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          escrow_status: string | null
          id: string
          paid_at: string | null
          paid_to: string | null
          payment_intent_id: string | null
          project_id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          escrow_status?: string | null
          id?: string
          paid_at?: string | null
          paid_to?: string | null
          payment_intent_id?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          escrow_status?: string | null
          id?: string
          paid_at?: string | null
          paid_to?: string | null
          payment_intent_id?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_paid_to_fkey"
            columns: ["paid_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_paid_to_fkey"
            columns: ["paid_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_paid_to_fkey"
            columns: ["paid_to"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_paid_to_fkey"
            columns: ["paid_to"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_matches: boolean | null
          email_messages: boolean | null
          email_opportunities: boolean | null
          email_projects: boolean | null
          id: string
          in_app_all: boolean | null
          push_matches: boolean | null
          push_messages: boolean | null
          push_opportunities: boolean | null
          push_projects: boolean | null
          unsubscribe_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_matches?: boolean | null
          email_messages?: boolean | null
          email_opportunities?: boolean | null
          email_projects?: boolean | null
          id?: string
          in_app_all?: boolean | null
          push_matches?: boolean | null
          push_messages?: boolean | null
          push_opportunities?: boolean | null
          push_projects?: boolean | null
          unsubscribe_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_matches?: boolean | null
          email_messages?: boolean | null
          email_opportunities?: boolean | null
          email_projects?: boolean | null
          id?: string
          in_app_all?: boolean | null
          push_matches?: boolean | null
          push_messages?: boolean | null
          push_opportunities?: boolean | null
          push_projects?: boolean | null
          unsubscribe_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_text: string | null
          action_url: string | null
          category: string | null
          created_at: string | null
          id: string
          image_url: string | null
          link: string | null
          message: string
          priority: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_text?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          message: string
          priority?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_text?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          message?: string
          priority?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          compensation: string | null
          created_at: string | null
          created_by: string
          deliverables: string | null
          description: string
          duration: string | null
          id: string
          image_url: string | null
          location: string | null
          requirements: string | null
          skills: string[] | null
          status: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          compensation?: string | null
          created_at?: string | null
          created_by: string
          deliverables?: string | null
          description: string
          duration?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          requirements?: string | null
          skills?: string[] | null
          status?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          compensation?: string | null
          created_at?: string | null
          created_by?: string
          deliverables?: string | null
          description?: string
          duration?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          requirements?: string | null
          skills?: string[] | null
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_discounts: {
        Row: {
          category: string
          created_at: string | null
          description: string
          discount_type: string
          discount_value: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          partner_logo_url: string | null
          partner_name: string
          redemption_code: string | null
          redemption_url: string | null
          terms: string | null
          tier_required: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          discount_type: string
          discount_value: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_logo_url?: string | null
          partner_name: string
          redemption_code?: string | null
          redemption_url?: string | null
          terms?: string | null
          tier_required?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          discount_type?: string
          discount_value?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_logo_url?: string | null
          partner_name?: string
          redemption_code?: string | null
          redemption_url?: string | null
          terms?: string | null
          tier_required?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_locations: {
        Row: {
          address: string
          amenities: Json | null
          check_in_radius_meters: number | null
          city: string
          country: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          latitude: number
          logo_url: string | null
          longitude: number
          name: string
          offerings: string[] | null
          points_per_visit: number
          qr_code: string
          tier_required: string
          type: string
          updated_at: string
        }
        Insert: {
          address: string
          amenities?: Json | null
          check_in_radius_meters?: number | null
          city: string
          country: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude: number
          logo_url?: string | null
          longitude: number
          name: string
          offerings?: string[] | null
          points_per_visit?: number
          qr_code?: string
          tier_required?: string
          type: string
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: Json | null
          check_in_radius_meters?: number | null
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number
          logo_url?: string | null
          longitude?: number
          name?: string
          offerings?: string[] | null
          points_per_visit?: number
          qr_code?: string
          tier_required?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_submissions: {
        Row: {
          category: string
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          description: string
          discount_type: string
          discount_value: string
          id: string
          logo_url: string
          redemption_code: string | null
          redemption_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          terms: string | null
          tier_required: string
          website_url: string | null
        }
        Insert: {
          category: string
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          description: string
          discount_type: string
          discount_value: string
          id?: string
          logo_url: string
          redemption_code?: string | null
          redemption_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          terms?: string | null
          tier_required?: string
          website_url?: string | null
        }
        Update: {
          category?: string
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          description?: string
          discount_type?: string
          discount_value?: string
          id?: string
          logo_url?: string
          redemption_code?: string | null
          redemption_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          terms?: string | null
          tier_required?: string
          website_url?: string | null
        }
        Relationships: []
      }
      payment_disputes: {
        Row: {
          created_at: string
          details: string
          disputed_by: string
          evidence: string | null
          id: string
          milestone_id: string | null
          payment_intent_id: string | null
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details: string
          disputed_by: string
          evidence?: string | null
          id?: string
          milestone_id?: string | null
          payment_intent_id?: string | null
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string
          disputed_by?: string
          evidence?: string | null
          id?: string
          milestone_id?: string | null
          payment_intent_id?: string | null
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_disputes_disputed_by_fkey"
            columns: ["disputed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_disputes_disputed_by_fkey"
            columns: ["disputed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_disputes_disputed_by_fkey"
            columns: ["disputed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_disputes_disputed_by_fkey"
            columns: ["disputed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_disputes_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          milestone_id: string | null
          payment_intent_id: string | null
          project_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          milestone_id?: string | null
          payment_intent_id?: string | null
          project_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          milestone_id?: string | null
          payment_intent_id?: string | null
          project_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          portfolio_item_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          portfolio_item_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          portfolio_item_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_comments_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          embed_code: string | null
          featured: boolean | null
          id: string
          media_type: string
          media_url: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          embed_code?: string | null
          featured?: boolean | null
          id?: string
          media_type: string
          media_url: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          embed_code?: string | null
          featured?: boolean | null
          id?: string
          media_type?: string
          media_url?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portfolio_reactions: {
        Row: {
          created_at: string
          id: string
          portfolio_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          portfolio_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          portfolio_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_reactions_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      press_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          press_link_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          press_link_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          press_link_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "press_comments_press_link_id_fkey"
            columns: ["press_link_id"]
            isOneToOne: false
            referencedRelation: "press_links"
            referencedColumns: ["id"]
          },
        ]
      }
      press_links: {
        Row: {
          created_at: string
          display_order: number | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          og_data: Json | null
          publication: string | null
          published_date: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string
          user_id: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          og_data?: Json | null
          publication?: string | null
          published_date?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          url: string
          user_id: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          og_data?: Json | null
          publication?: string | null
          published_date?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          achievement_badges: string[] | null
          available_invites: number | null
          avatar_url: string | null
          average_rating: number | null
          avg_views: number | null
          awards: Json | null
          badge: Database["public"]["Enums"]["user_badge"] | null
          behance_url: string | null
          bio: string | null
          collab_intent: string | null
          company_about: string | null
          company_address: string | null
          company_images: Json | null
          company_industry: string | null
          company_location_lat: number | null
          company_location_lng: number | null
          company_logo_url: string | null
          company_name: string | null
          company_size: string | null
          created_at: string | null
          daily_swipes: number | null
          full_name: string
          google_maps_place_id: string | null
          id: string
          imdb_url: string | null
          industry: string | null
          instagram_followers: number | null
          instagram_url: string | null
          invite_code_used: string | null
          invited_by: string | null
          job_title: string | null
          last_active_date: string | null
          last_swipe_reset: string | null
          level: number | null
          linkedin_connections: number | null
          linkedin_url: string | null
          location: string | null
          longest_streak: number | null
          membership_number: string | null
          og_promotion_expires_at: string | null
          og_promotion_used: boolean | null
          onboarding_completed: boolean
          onboarding_reminder_sent: boolean | null
          onboarding_started_at: string | null
          onboarding_step: number | null
          partner_location_id: string | null
          passion_skills: Json | null
          portfolio_verified: boolean | null
          press_links: Json | null
          professional_skills: Json | null
          project_credits: number | null
          rate_range: string | null
          review_share_token: string | null
          role: string
          section_order: Json | null
          social_verified: boolean | null
          soundcloud_url: string | null
          spotify_listeners: number | null
          spotify_url: string | null
          storage_limit_bytes: number | null
          storage_used_bytes: number | null
          streak_count: number | null
          streak_freeze_count: number | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_product_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          tiktok_followers: number | null
          tiktok_url: string | null
          total_engagement_rate: number | null
          total_reviews: number | null
          twitter_followers: number | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          verification_notes: string | null
          verification_score: number | null
          verification_status: string | null
          verification_tier: string | null
          verified_at: string | null
          verified_credentials: Json | null
          verified_metrics: boolean | null
          website: string | null
          xp: number | null
          youtube_subscribers: number | null
          youtube_url: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          achievement_badges?: string[] | null
          available_invites?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          avg_views?: number | null
          awards?: Json | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          collab_intent?: string | null
          company_about?: string | null
          company_address?: string | null
          company_images?: Json | null
          company_industry?: string | null
          company_location_lat?: number | null
          company_location_lng?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          daily_swipes?: number | null
          full_name: string
          google_maps_place_id?: string | null
          id?: string
          imdb_url?: string | null
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          invite_code_used?: string | null
          invited_by?: string | null
          job_title?: string | null
          last_active_date?: string | null
          last_swipe_reset?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          longest_streak?: number | null
          membership_number?: string | null
          og_promotion_expires_at?: string | null
          og_promotion_used?: boolean | null
          onboarding_completed?: boolean
          onboarding_reminder_sent?: boolean | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          partner_location_id?: string | null
          passion_skills?: Json | null
          portfolio_verified?: boolean | null
          press_links?: Json | null
          professional_skills?: Json | null
          project_credits?: number | null
          rate_range?: string | null
          review_share_token?: string | null
          role: string
          section_order?: Json | null
          social_verified?: boolean | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          storage_limit_bytes?: number | null
          storage_used_bytes?: number | null
          streak_count?: number | null
          streak_freeze_count?: number | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tiktok_followers?: number | null
          tiktok_url?: string | null
          total_engagement_rate?: number | null
          total_reviews?: number | null
          twitter_followers?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          verification_notes?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verification_tier?: string | null
          verified_at?: string | null
          verified_credentials?: Json | null
          verified_metrics?: boolean | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          achievement_badges?: string[] | null
          available_invites?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          avg_views?: number | null
          awards?: Json | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          collab_intent?: string | null
          company_about?: string | null
          company_address?: string | null
          company_images?: Json | null
          company_industry?: string | null
          company_location_lat?: number | null
          company_location_lng?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          daily_swipes?: number | null
          full_name?: string
          google_maps_place_id?: string | null
          id?: string
          imdb_url?: string | null
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          invite_code_used?: string | null
          invited_by?: string | null
          job_title?: string | null
          last_active_date?: string | null
          last_swipe_reset?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          longest_streak?: number | null
          membership_number?: string | null
          og_promotion_expires_at?: string | null
          og_promotion_used?: boolean | null
          onboarding_completed?: boolean
          onboarding_reminder_sent?: boolean | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          partner_location_id?: string | null
          passion_skills?: Json | null
          portfolio_verified?: boolean | null
          press_links?: Json | null
          professional_skills?: Json | null
          project_credits?: number | null
          rate_range?: string | null
          review_share_token?: string | null
          role?: string
          section_order?: Json | null
          social_verified?: boolean | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          storage_limit_bytes?: number | null
          storage_used_bytes?: number | null
          streak_count?: number | null
          streak_freeze_count?: number | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tiktok_followers?: number | null
          tiktok_url?: string | null
          total_engagement_rate?: number | null
          total_reviews?: number | null
          twitter_followers?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          verification_notes?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verification_tier?: string | null
          verified_at?: string | null
          verified_credentials?: Json | null
          verified_metrics?: boolean | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_location_id_fkey"
            columns: ["partner_location_id"]
            isOneToOne: false
            referencedRelation: "partner_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_at: string
          invited_by: string
          project_id: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          invited_by: string
          project_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string
          project_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_messages: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          message: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_notes: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          category: string
          complexity: string | null
          created_at: string | null
          created_by: string
          description: string | null
          estimated_duration: string | null
          id: string
          is_public: boolean | null
          milestones: Json | null
          name: string
          structure: Json
          tasks: Json | null
          thumbnail_url: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          complexity?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_public?: boolean | null
          milestones?: Json | null
          name: string
          structure: Json
          tasks?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          complexity?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_public?: boolean | null
          milestones?: Json | null
          name?: string
          structure?: Json
          tasks?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: string | null
          created_at: string | null
          created_by: string
          deadline: string | null
          description: string | null
          id: string
          match_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget?: string | null
          created_at?: string | null
          created_by: string
          deadline?: string | null
          description?: string | null
          id?: string
          match_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget?: string | null
          created_at?: string | null
          created_by?: string
          deadline?: string | null
          description?: string | null
          id?: string
          match_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      review_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          personal_message: string | null
          profile_id: string
          project_name: string | null
          reviewer_email: string
          reviewer_name: string
          share_token: string
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          personal_message?: string | null
          profile_id: string
          project_name?: string | null
          reviewer_email: string
          reviewer_name: string
          share_token?: string
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          personal_message?: string | null
          profile_id?: string
          project_name?: string | null
          reviewer_email?: string
          reviewer_name?: string
          share_token?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reviews: {
        Row: {
          collaboration_type: string | null
          created_at: string
          id: string
          is_endorsed: boolean | null
          is_verified: boolean | null
          profile_id: string
          project_name: string | null
          rating: number | null
          review_text: string
          reviewer_avatar_url: string | null
          reviewer_company: string | null
          reviewer_email: string | null
          reviewer_id: string | null
          reviewer_name: string
          reviewer_role: string | null
          status: string | null
          submission_token: string | null
          updated_at: string
        }
        Insert: {
          collaboration_type?: string | null
          created_at?: string
          id?: string
          is_endorsed?: boolean | null
          is_verified?: boolean | null
          profile_id: string
          project_name?: string | null
          rating?: number | null
          review_text: string
          reviewer_avatar_url?: string | null
          reviewer_company?: string | null
          reviewer_email?: string | null
          reviewer_id?: string | null
          reviewer_name: string
          reviewer_role?: string | null
          status?: string | null
          submission_token?: string | null
          updated_at?: string
        }
        Update: {
          collaboration_type?: string | null
          created_at?: string
          id?: string
          is_endorsed?: boolean | null
          is_verified?: boolean | null
          profile_id?: string
          project_name?: string | null
          rating?: number | null
          review_text?: string
          reviewer_avatar_url?: string | null
          reviewer_company?: string | null
          reviewer_email?: string | null
          reviewer_id?: string | null
          reviewer_name?: string
          reviewer_role?: string | null
          status?: string | null
          submission_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_opportunities: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_sparks: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_endorsement_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          endorser_email: string | null
          endorser_name: string | null
          expires_at: string
          id: string
          personal_message: string | null
          profile_id: string
          project_name: string | null
          share_token: string
          skill_name: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          endorser_email?: string | null
          endorser_name?: string | null
          expires_at?: string
          id?: string
          personal_message?: string | null
          profile_id: string
          project_name?: string | null
          share_token?: string
          skill_name: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          endorser_email?: string | null
          endorser_name?: string | null
          expires_at?: string
          id?: string
          personal_message?: string | null
          profile_id?: string
          project_name?: string | null
          share_token?: string
          skill_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsement_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsement_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsement_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsement_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          created_at: string
          endorser_company: string | null
          endorser_email: string
          endorser_name: string
          id: string
          proficiency_level: string
          profile_id: string
          project_name: string | null
          relationship: string | null
          request_id: string | null
          skill_name: string
          testimonial: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          endorser_company?: string | null
          endorser_email: string
          endorser_name: string
          id?: string
          proficiency_level: string
          profile_id: string
          project_name?: string | null
          relationship?: string | null
          request_id?: string | null
          skill_name: string
          testimonial?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          endorser_company?: string | null
          endorser_email?: string
          endorser_name?: string
          id?: string
          proficiency_level?: string
          profile_id?: string
          project_name?: string | null
          relationship?: string | null
          request_id?: string | null
          skill_name?: string
          testimonial?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "skill_endorsement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          sender_id: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string | null
          created_at: string
          id: string
          priority: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          is_super_like: boolean | null
          is_undo: boolean | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          is_super_like?: boolean | null
          is_undo?: boolean | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          is_super_like?: boolean | null
          is_undo?: boolean | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          hourly_rate: number | null
          id: string
          is_billable: boolean | null
          project_id: string
          start_time: string
          task_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean | null
          project_id: string
          start_time: string
          task_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean | null
          project_id?: string
          start_time?: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          related_project_id: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          related_project_id?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          related_project_id?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_check_ins: {
        Row: {
          check_in_date: string
          check_in_latitude: number | null
          check_in_longitude: number | null
          created_at: string
          id: string
          location_id: string
          points_awarded: number
          user_id: string
          verified_location: boolean | null
        }
        Insert: {
          check_in_date?: string
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          created_at?: string
          id?: string
          location_id: string
          points_awarded: number
          user_id: string
          verified_location?: boolean | null
        }
        Update: {
          check_in_date?: string
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          created_at?: string
          id?: string
          location_id?: string
          points_awarded?: number
          user_id?: string
          verified_location?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_check_ins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "partner_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          ai_decision: string | null
          ai_reasoning: string | null
          ai_score: number | null
          appeal_decision: string | null
          appeal_reason: string | null
          appeal_reviewed_at: string | null
          appeal_reviewed_by: string | null
          appeal_submitted_at: string | null
          authenticity_score: number | null
          created_at: string | null
          id: string
          profile_data: Json
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          ai_decision?: string | null
          ai_reasoning?: string | null
          ai_score?: number | null
          appeal_decision?: string | null
          appeal_reason?: string | null
          appeal_reviewed_at?: string | null
          appeal_reviewed_by?: string | null
          appeal_submitted_at?: string | null
          authenticity_score?: number | null
          created_at?: string | null
          id?: string
          profile_data: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          ai_decision?: string | null
          ai_reasoning?: string | null
          ai_score?: number | null
          appeal_decision?: string | null
          appeal_reason?: string | null
          appeal_reviewed_at?: string | null
          appeal_reviewed_by?: string | null
          appeal_submitted_at?: string | null
          authenticity_score?: number | null
          created_at?: string | null
          id?: string
          profile_data?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          ai_decision: string | null
          ai_reasoning: string | null
          ai_score: number | null
          bio: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          instagram_url: string | null
          invite_code: string | null
          invite_sent_at: string | null
          linkedin_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          spotify_url: string | null
          status: string | null
          twitter_url: string | null
          updated_at: string | null
          website: string | null
          why_join: string | null
        }
        Insert: {
          ai_decision?: string | null
          ai_reasoning?: string | null
          ai_score?: number | null
          bio?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          instagram_url?: string | null
          invite_code?: string | null
          invite_sent_at?: string | null
          linkedin_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role: string
          spotify_url?: string | null
          status?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
          why_join?: string | null
        }
        Update: {
          ai_decision?: string | null
          ai_reasoning?: string | null
          ai_score?: number | null
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          instagram_url?: string | null
          invite_code?: string | null
          invite_sent_at?: string | null
          linkedin_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          spotify_url?: string | null
          status?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
          why_join?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          credits: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          credits?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          credits?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      xp_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id: string
          xp_earned: number
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
    }
    Views: {
      analytics_funnel: {
        Row: {
          event_category: string | null
          event_date: string | null
          event_name: string | null
          total_events: number | null
          unique_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      conversation_list: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          match_id: string | null
          message_id: string | null
          read: boolean | null
          receiver_avatar: string | null
          receiver_id: string | null
          receiver_name: string | null
          sender_avatar: string | null
          sender_id: string | null
          sender_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          average_rating: number | null
          badge: Database["public"]["Enums"]["user_badge"] | null
          behance_url: string | null
          bio: string | null
          company_about: string | null
          company_address: string | null
          company_images: Json | null
          company_industry: string | null
          company_location_lat: number | null
          company_location_lng: number | null
          company_logo_url: string | null
          company_name: string | null
          company_size: string | null
          created_at: string | null
          full_name: string | null
          imdb_url: string | null
          industry: string | null
          instagram_url: string | null
          job_title: string | null
          level: number | null
          linkedin_url: string | null
          location: string | null
          passion_skills: Json | null
          portfolio_verified: boolean | null
          professional_skills: Json | null
          role: string | null
          social_verified: boolean | null
          soundcloud_url: string | null
          spotify_url: string | null
          tiktok_url: string | null
          total_reviews: number | null
          twitter_url: string | null
          user_id: string | null
          verification_status: string | null
          verified_at: string | null
          website: string | null
          xp: number | null
          youtube_url: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          average_rating?: number | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          company_about?: string | null
          company_address?: string | null
          company_images?: Json | null
          company_industry?: string | null
          company_location_lat?: number | null
          company_location_lng?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          full_name?: string | null
          imdb_url?: string | null
          industry?: string | null
          instagram_url?: string | null
          job_title?: string | null
          level?: number | null
          linkedin_url?: string | null
          location?: string | null
          passion_skills?: Json | null
          portfolio_verified?: boolean | null
          professional_skills?: Json | null
          role?: string | null
          social_verified?: boolean | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          tiktok_url?: string | null
          total_reviews?: number | null
          twitter_url?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          website?: string | null
          xp?: number | null
          youtube_url?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          average_rating?: number | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          company_about?: string | null
          company_address?: string | null
          company_images?: Json | null
          company_industry?: string | null
          company_location_lat?: number | null
          company_location_lng?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          full_name?: string | null
          imdb_url?: string | null
          industry?: string | null
          instagram_url?: string | null
          job_title?: string | null
          level?: number | null
          linkedin_url?: string | null
          location?: string | null
          passion_skills?: Json | null
          portfolio_verified?: boolean | null
          professional_skills?: Json | null
          role?: string | null
          social_verified?: boolean | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          tiktok_url?: string | null
          total_reviews?: number | null
          twitter_url?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          website?: string | null
          xp?: number | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      public_profiles_safe: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          average_rating: number | null
          avg_views: number | null
          badge: Database["public"]["Enums"]["user_badge"] | null
          behance_url: string | null
          bio: string | null
          collab_intent: string | null
          company_about: string | null
          company_address: string | null
          company_images: Json | null
          company_industry: string | null
          company_location_lat: number | null
          company_location_lng: number | null
          company_logo_url: string | null
          company_name: string | null
          company_size: string | null
          created_at: string | null
          full_name: string | null
          imdb_url: string | null
          industry: string | null
          instagram_followers: number | null
          instagram_url: string | null
          job_title: string | null
          level: number | null
          linkedin_connections: number | null
          linkedin_url: string | null
          location: string | null
          passion_skills: Json | null
          portfolio_verified: boolean | null
          professional_skills: Json | null
          role: string | null
          social_verified: boolean | null
          soundcloud_url: string | null
          spotify_listeners: number | null
          spotify_url: string | null
          subscription_tier: string | null
          tiktok_followers: number | null
          tiktok_url: string | null
          total_engagement_rate: number | null
          total_reviews: number | null
          twitter_followers: number | null
          twitter_url: string | null
          user_id: string | null
          verification_status: string | null
          verified_at: string | null
          verified_metrics: boolean | null
          website: string | null
          xp: number | null
          youtube_subscribers: number | null
          youtube_url: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          average_rating?: number | null
          avg_views?: number | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          collab_intent?: string | null
          company_about?: string | null
          company_address?: string | null
          company_images?: Json | null
          company_industry?: string | null
          company_location_lat?: number | null
          company_location_lng?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          full_name?: string | null
          imdb_url?: string | null
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          job_title?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          passion_skills?: Json | null
          portfolio_verified?: boolean | null
          professional_skills?: Json | null
          role?: string | null
          social_verified?: boolean | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          subscription_tier?: string | null
          tiktok_followers?: number | null
          tiktok_url?: string | null
          total_engagement_rate?: number | null
          total_reviews?: number | null
          twitter_followers?: number | null
          twitter_url?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_metrics?: boolean | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          average_rating?: number | null
          avg_views?: number | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          collab_intent?: string | null
          company_about?: string | null
          company_address?: string | null
          company_images?: Json | null
          company_industry?: string | null
          company_location_lat?: number | null
          company_location_lng?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          full_name?: string | null
          imdb_url?: string | null
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          job_title?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          passion_skills?: Json | null
          portfolio_verified?: boolean | null
          professional_skills?: Json | null
          role?: string | null
          social_verified?: boolean | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          subscription_tier?: string | null
          tiktok_followers?: number | null
          tiktok_url?: string | null
          total_engagement_rate?: number | null
          total_reviews?: number | null
          twitter_followers?: number | null
          twitter_url?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_metrics?: boolean | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      public_profiles_view: {
        Row: {
          avatar_url: string | null
          badge: Database["public"]["Enums"]["user_badge"] | null
          behance_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          imdb_url: string | null
          industry: string | null
          instagram_url: string | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          passion_skills: Json | null
          professional_skills: Json | null
          role: string | null
          soundcloud_url: string | null
          spotify_url: string | null
          twitter_url: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          imdb_url?: string | null
          industry?: string | null
          instagram_url?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          passion_skills?: Json | null
          professional_skills?: Json | null
          role?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          twitter_url?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          imdb_url?: string | null
          industry?: string | null
          instagram_url?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          passion_skills?: Json | null
          professional_skills?: Json | null
          role?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          twitter_url?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      public_reviews: {
        Row: {
          collaboration_type: string | null
          created_at: string | null
          id: string | null
          is_endorsed: boolean | null
          is_verified: boolean | null
          profile_id: string | null
          project_name: string | null
          rating: number | null
          review_text: string | null
          reviewer_avatar_url: string | null
          reviewer_company: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          reviewer_role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          collaboration_type?: string | null
          created_at?: string | null
          id?: string | null
          is_endorsed?: boolean | null
          is_verified?: boolean | null
          profile_id?: string | null
          project_name?: string | null
          rating?: number | null
          review_text?: string | null
          reviewer_avatar_url?: string | null
          reviewer_company?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          collaboration_type?: string | null
          created_at?: string | null
          id?: string | null
          is_endorsed?: boolean | null
          is_verified?: boolean | null
          profile_id?: string | null
          project_name?: string | null
          rating?: number | null
          review_text?: string | null
          reviewer_avatar_url?: string | null
          reviewer_company?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_skill_endorsements: {
        Row: {
          created_at: string | null
          endorser_company: string | null
          endorser_name: string | null
          id: string | null
          proficiency_level: string | null
          profile_id: string | null
          project_name: string | null
          relationship: string | null
          request_id: string | null
          skill_name: string | null
          testimonial: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          endorser_company?: string | null
          endorser_name?: string | null
          id?: string | null
          proficiency_level?: string | null
          profile_id?: string | null
          project_name?: string | null
          relationship?: string | null
          request_id?: string | null
          skill_name?: string | null
          testimonial?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          endorser_company?: string | null
          endorser_name?: string | null
          id?: string | null
          proficiency_level?: string | null
          profile_id?: string | null
          project_name?: string | null
          relationship?: string | null
          request_id?: string | null
          skill_name?: string | null
          testimonial?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "skill_endorsement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsement_counts: {
        Row: {
          average_level: number | null
          endorsement_count: number | null
          profile_id: string | null
          skill_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_applications_view: {
        Row: {
          applicant_avatar: string | null
          applicant_id: string | null
          applicant_name: string | null
          application_notes: string | null
          availability: string | null
          compensation: string | null
          cover_letter: string | null
          created_at: string | null
          expected_rate: string | null
          id: string | null
          location: string | null
          opportunity_id: string | null
          opportunity_status: string | null
          opportunity_title: string | null
          opportunity_type: string | null
          portfolio_links: string[] | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      calculate_level: { Args: { xp: number }; Returns: number }
      check_storage_available: {
        Args: { file_size_param: number; user_id_param: string }
        Returns: boolean
      }
      create_multi_use_code: {
        Args: { num_uses: number; owner_email: string }
        Returns: string
      }
      create_notification: {
        Args: {
          p_action_text?: string
          p_action_url?: string
          p_category?: string
          p_image_url?: string
          p_link?: string
          p_message: string
          p_priority?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      generate_invite_codes: {
        Args: { num_codes?: number; user_id_param: string }
        Returns: undefined
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_membership_number: { Args: never; Returns: string }
      generate_secure_token: { Args: never; Returns: string }
      generate_unsubscribe_token: { Args: never; Returns: string }
      get_endorsement_request_by_token: {
        Args: { token_param: string }
        Returns: {
          created_at: string
          id: string
          personal_message: string
          profile_id: string
          share_token: string
          skill_name: string
        }[]
      }
      get_mutual_connections: {
        Args: { user1_id: string; user2_id: string }
        Returns: {
          avatar_url: string
          connection_id: string
          full_name: string
          role: string
        }[]
      }
      get_network_stats: {
        Args: { p_user_id: string }
        Returns: {
          connection_count: number
          degree: number
        }[]
      }
      get_own_profile_sensitive_data: {
        Args: never
        Returns: {
          stripe_customer_id: string
          subscription_status: string
          subscription_tier: string
        }[]
      }
      get_review_request_by_token: {
        Args: { token_param: string }
        Returns: {
          completed_at: string
          created_at: string
          expires_at: string
          id: string
          personal_message: string
          profile_id: string
          project_name: string
          reviewer_name: string
          share_token: string
          status: string
        }[]
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_profile_owner: { Args: { _profile_user_id: string }; Returns: boolean }
      send_opportunity_alerts: {
        Args: { opportunity_id_param: string }
        Returns: undefined
      }
      use_invite_code:
        | { Args: { code: string; user_email: string }; Returns: boolean }
        | {
            Args: { code: string; new_user_id?: string; user_email: string }
            Returns: boolean
          }
      user_has_project_access: {
        Args: { project_id_param: string; user_id_param: string }
        Returns: boolean
      }
      validate_invite_code: { Args: { code: string }; Returns: boolean }
    }
    Enums: {
      account_type: "individual" | "company"
      app_role: "admin" | "moderator" | "user"
      user_badge: "og" | "beta" | "official" | "founder"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["individual", "company"],
      app_role: ["admin", "moderator", "user"],
      user_badge: ["og", "beta", "official", "founder"],
    },
  },
} as const
