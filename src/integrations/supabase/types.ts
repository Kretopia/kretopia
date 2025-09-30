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
      opportunities: {
        Row: {
          compensation: string | null
          created_at: string | null
          created_by: string
          description: string
          id: string
          image_url: string | null
          location: string | null
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
          description: string
          id?: string
          image_url?: string | null
          location?: string | null
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
          description?: string
          id?: string
          image_url?: string | null
          location?: string | null
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
          behance_url: string | null
          bio: string | null
          created_at: string | null
          credits: number | null
          full_name: string
          id: string
          imdb_url: string | null
          instagram_url: string | null
          linkedin_url: string | null
          location: string | null
          role: string
          soundcloud_url: string | null
          spotify_url: string | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          credits?: number | null
          full_name: string
          id?: string
          imdb_url?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          location?: string | null
          role: string
          soundcloud_url?: string | null
          spotify_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          behance_url?: string | null
          bio?: string | null
          created_at?: string | null
          credits?: number | null
          full_name?: string
          id?: string
          imdb_url?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          location?: string | null
          role?: string
          soundcloud_url?: string | null
          spotify_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
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
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
