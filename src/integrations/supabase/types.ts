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
          cover_letter: string | null
          created_at: string | null
          id: string
          opportunity_id: string
          portfolio_links: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_id: string
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          opportunity_id: string
          portfolio_links?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: string
          cover_letter?: string | null
          created_at?: string | null
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
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invitee_email: string
          invitee_user_id: string | null
          inviter_id: string
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invitee_email: string
          invitee_user_id?: string | null
          inviter_id: string
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invitee_email?: string
          invitee_user_id?: string | null
          inviter_id?: string
          status?: string | null
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
            foreignKeyName: "milestones_paid_to_fkey"
            columns: ["paid_to"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_views: number | null
          behance_url: string | null
          bio: string | null
          created_at: string | null
          credits: number | null
          daily_swipes: number | null
          full_name: string
          id: string
          imdb_url: string | null
          instagram_followers: number | null
          instagram_url: string | null
          last_swipe_reset: string | null
          level: number | null
          linkedin_connections: number | null
          linkedin_url: string | null
          location: string | null
          role: string
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
          avatar_url?: string | null
          avg_views?: number | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          credits?: number | null
          daily_swipes?: number | null
          full_name: string
          id?: string
          imdb_url?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          last_swipe_reset?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          role: string
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
          avatar_url?: string | null
          avg_views?: number | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          credits?: number | null
          daily_swipes?: number | null
          full_name?: string
          id?: string
          imdb_url?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          last_swipe_reset?: string | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          role?: string
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
        ]
      }
      project_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
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
          reviewer_id: string | null
          reviewer_name: string
          reviewer_role: string | null
          status: string | null
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
          reviewer_id?: string | null
          reviewer_name: string
          reviewer_role?: string | null
          status?: string | null
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
          reviewer_id?: string | null
          reviewer_name?: string
          reviewer_role?: string | null
          status?: string | null
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
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      [_ in never]: never
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
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
