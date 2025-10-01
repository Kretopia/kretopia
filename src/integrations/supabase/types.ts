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
          id: string
          paid_at: string | null
          paid_to: string | null
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
          id?: string
          paid_at?: string | null
          paid_to?: string | null
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
          id?: string
          paid_at?: string | null
          paid_to?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
        ]
      }
      press_links: {
        Row: {
          created_at: string
          display_order: number | null
          excerpt: string | null
          id: string
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
          available_invites: number | null
          avatar_url: string | null
          avg_views: number | null
          awards: Json | null
          badge: Database["public"]["Enums"]["user_badge"] | null
          behance_url: string | null
          bio: string | null
          created_at: string | null
          daily_swipes: number | null
          full_name: string
          id: string
          imdb_url: string | null
          industry: string | null
          instagram_followers: number | null
          instagram_url: string | null
          invite_code_used: string | null
          job_title: string | null
          last_swipe_reset: string | null
          level: number | null
          linkedin_connections: number | null
          linkedin_url: string | null
          location: string | null
          passion_skills: Json | null
          press_links: Json | null
          professional_skills: Json | null
          project_credits: number | null
          review_share_token: string | null
          role: string
          section_order: Json | null
          soundcloud_url: string | null
          spotify_listeners: number | null
          spotify_url: string | null
          storage_limit_bytes: number | null
          storage_used_bytes: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_product_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          tiktok_followers: number | null
          total_engagement_rate: number | null
          twitter_followers: number | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          verified_metrics: boolean | null
          website: string | null
          xp: number | null
          youtube_subscribers: number | null
        }
        Insert: {
          available_invites?: number | null
          avatar_url?: string | null
          avg_views?: number | null
          awards?: Json | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          daily_swipes?: number | null
          full_name: string
          id?: string
          imdb_url?: string | null
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          invite_code_used?: string | null
          job_title?: string | null
          last_swipe_reset?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          passion_skills?: Json | null
          press_links?: Json | null
          professional_skills?: Json | null
          project_credits?: number | null
          review_share_token?: string | null
          role: string
          section_order?: Json | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          storage_limit_bytes?: number | null
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tiktok_followers?: number | null
          total_engagement_rate?: number | null
          twitter_followers?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          verified_metrics?: boolean | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
        }
        Update: {
          available_invites?: number | null
          avatar_url?: string | null
          avg_views?: number | null
          awards?: Json | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          daily_swipes?: number | null
          full_name?: string
          id?: string
          imdb_url?: string | null
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          invite_code_used?: string | null
          job_title?: string | null
          last_swipe_reset?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          passion_skills?: Json | null
          press_links?: Json | null
          professional_skills?: Json | null
          project_credits?: number | null
          review_share_token?: string | null
          role?: string
          section_order?: Json | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          storage_limit_bytes?: number | null
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tiktok_followers?: number | null
          total_engagement_rate?: number | null
          twitter_followers?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          verified_metrics?: boolean | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
        }
        Relationships: []
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
      projects: {
        Row: {
          budget: string | null
          created_at: string | null
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      review_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
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
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          is_super_like?: boolean | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          is_super_like?: boolean | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
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
      waitlist: {
        Row: {
          bio: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          instagram_url: string | null
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
          bio?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          instagram_url?: string | null
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
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          instagram_url?: string | null
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
          avatar_url: string | null
          avg_views: number | null
          badge: Database["public"]["Enums"]["user_badge"] | null
          behance_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          imdb_url: string | null
          instagram_followers: number | null
          instagram_url: string | null
          level: number | null
          linkedin_connections: number | null
          linkedin_url: string | null
          location: string | null
          role: string | null
          soundcloud_url: string | null
          spotify_listeners: number | null
          spotify_url: string | null
          tiktok_followers: number | null
          total_engagement_rate: number | null
          twitter_followers: number | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string | null
          verified_metrics: boolean | null
          website: string | null
          xp: number | null
          youtube_subscribers: number | null
        }
        Insert: {
          avatar_url?: string | null
          avg_views?: number | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          imdb_url?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          role?: string | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          tiktok_followers?: number | null
          total_engagement_rate?: number | null
          twitter_followers?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_metrics?: boolean | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
        }
        Update: {
          avatar_url?: string | null
          avg_views?: number | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          imdb_url?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          role?: string | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          tiktok_followers?: number | null
          total_engagement_rate?: number | null
          twitter_followers?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_metrics?: boolean | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
        }
        Relationships: []
      }
      user_applications_view: {
        Row: {
          applicant_id: string | null
          application_notes: string | null
          availability: string | null
          compensation: string | null
          cover_letter: string | null
          created_at: string | null
          expected_rate: string | null
          id: string | null
          location: string | null
          opportunity_id: string | null
          opportunity_title: string | null
          opportunity_type: string | null
          portfolio_links: string[] | null
          poster_avatar: string | null
          poster_id: string | null
          poster_name: string | null
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
      calculate_level: {
        Args: { xp: number }
        Returns: number
      }
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
      use_invite_code: {
        Args: { code: string; user_email: string }
        Returns: boolean
      }
    }
    Enums: {
      user_badge: "og" | "beta" | "official"
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
      user_badge: ["og", "beta", "official"],
    },
  },
} as const
