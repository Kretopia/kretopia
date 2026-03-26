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
      agent_actions: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          error_message: string | null
          executed_at: string | null
          goal_id: string | null
          id: string
          payload: Json
          result: Json | null
          risk_level: string
          scheduled_for: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          error_message?: string | null
          executed_at?: string | null
          goal_id?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          risk_level?: string
          scheduled_for?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          error_message?: string | null
          executed_at?: string | null
          goal_id?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          risk_level?: string
          scheduled_for?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "agent_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number
          deadline: string | null
          description: string | null
          goal_type: string
          id: string
          priority: string
          status: string
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          deadline?: string | null
          description?: string | null
          goal_type: string
          id?: string
          priority?: string
          status?: string
          target_value?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          deadline?: string | null
          description?: string | null
          goal_type?: string
          id?: string
          priority?: string
          status?: string
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_settings: {
        Row: {
          auto_approve_low_risk: boolean
          created_at: string
          daily_action_limit: number
          document_generation: boolean
          email_automation: boolean
          focus_areas: Json
          id: string
          is_active: boolean
          mode: string
          task_automation: boolean
          timezone: string | null
          updated_at: string
          user_id: string
          working_hours_end: number | null
          working_hours_start: number | null
        }
        Insert: {
          auto_approve_low_risk?: boolean
          created_at?: string
          daily_action_limit?: number
          document_generation?: boolean
          email_automation?: boolean
          focus_areas?: Json
          id?: string
          is_active?: boolean
          mode?: string
          task_automation?: boolean
          timezone?: string | null
          updated_at?: string
          user_id: string
          working_hours_end?: number | null
          working_hours_start?: number | null
        }
        Update: {
          auto_approve_low_risk?: boolean
          created_at?: string
          daily_action_limit?: number
          document_generation?: boolean
          email_automation?: boolean
          focus_areas?: Json
          id?: string
          is_active?: boolean
          mode?: string
          task_automation?: boolean
          timezone?: string | null
          updated_at?: string
          user_id?: string
          working_hours_end?: number | null
          working_hours_start?: number | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      asset_folders: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          parent_id: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          parent_id?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          parent_id?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "asset_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_versions: {
        Row: {
          asset_id: string
          change_note: string | null
          created_at: string
          file_size: number | null
          file_url: string
          id: string
          uploaded_by: string
          version: number
        }
        Insert: {
          asset_id: string
          change_note?: string | null
          created_at?: string
          file_size?: number | null
          file_url: string
          id?: string
          uploaded_by: string
          version: number
        }
        Update: {
          asset_id?: string
          change_note?: string | null
          created_at?: string
          file_size?: number | null
          file_url?: string
          id?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_versions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "creative_assets"
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
      board_items: {
        Row: {
          color: string | null
          content: string | null
          created_at: string
          created_by: string
          height: number | null
          id: string
          image_url: string | null
          position_x: number | null
          position_y: number | null
          project_id: string
          tags: string[] | null
          title: string | null
          type: string
          updated_at: string
          width: number | null
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          height?: number | null
          id?: string
          image_url?: string | null
          position_x?: number | null
          position_y?: number | null
          project_id: string
          tags?: string[] | null
          title?: string | null
          type?: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          image_url?: string | null
          position_x?: number | null
          position_y?: number | null
          project_id?: string
          tags?: string[] | null
          title?: string | null
          type?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "board_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_email_usage: {
        Row: {
          id: string
          month: string
          send_count: number
          user_id: string
        }
        Insert: {
          id?: string
          month: string
          send_count?: number
          user_id: string
        }
        Update: {
          id?: string
          month?: string
          send_count?: number
          user_id?: string
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          email: string
          error_message: string | null
          id: string
          name: string | null
          opened_at: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          name?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          name?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_entries: {
        Row: {
          challenge_id: string
          created_at: string
          description: string | null
          id: string
          media_type: string | null
          media_url: string | null
          rank: number | null
          title: string | null
          user_id: string
          vote_count: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          rank?: number | null
          title?: string | null
          user_id: string
          vote_count?: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          rank?: number | null
          title?: string | null
          user_id?: string
          vote_count?: number
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
      challenge_leaderboard: {
        Row: {
          current_streak: number
          id: string
          total_challenge_xp: number
          total_votes_received: number
          total_wins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          total_challenge_xp?: number
          total_votes_received?: number
          total_wins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          total_challenge_xp?: number
          total_votes_received?: number
          total_wins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          cadence: string
          category: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          entry_count: number
          id: string
          starts_at: string
          status: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          cadence?: string
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          entry_count?: number
          id?: string
          starts_at?: string
          status?: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          cadence?: string
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          entry_count?: number
          id?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          xp_reward?: number
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
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
            referencedRelation: "public_profiles_discovery"
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
      connected_platforms: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          last_synced_at: string | null
          platform: string
          platform_data: Json | null
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          platform: string
          platform_data?: Json | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          platform?: string
          platform_data?: Json | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_discovery"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
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
          declined_at: string | null
          id: string
          is_message_request: boolean | null
          status: string | null
          user_id: string
        }
        Insert: {
          connected_user_id: string
          created_at?: string | null
          declined_at?: string | null
          id?: string
          is_message_request?: boolean | null
          status?: string | null
          user_id: string
        }
        Update: {
          connected_user_id?: string
          created_at?: string | null
          declined_at?: string | null
          id?: string
          is_message_request?: boolean | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      creative_assets: {
        Row: {
          created_at: string
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          folder_id: string | null
          id: string
          media_type: string | null
          name: string
          project_id: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string
          version: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          folder_id?: string | null
          id?: string
          media_type?: string | null
          name: string
          project_id: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by: string
          version?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          folder_id?: string | null
          id?: string
          media_type?: string | null
          name?: string
          project_id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "asset_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_jams: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string
          is_public: boolean | null
          is_ticketed: boolean | null
          latitude: number | null
          longitude: number | null
          max_participants: number | null
          start_time: string
          status: string | null
          tags: string[] | null
          ticket_currency: string | null
          ticket_price: number | null
          title: string
          updated_at: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          is_public?: boolean | null
          is_ticketed?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_participants?: number | null
          start_time: string
          status?: string | null
          tags?: string[] | null
          ticket_currency?: string | null
          ticket_price?: number | null
          title: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          is_public?: boolean | null
          is_ticketed?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_participants?: number | null
          start_time?: string
          status?: string | null
          tags?: string[] | null
          ticket_currency?: string | null
          ticket_price?: number | null
          title?: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_jams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creative_jams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creative_jams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creative_jams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_discovery"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creative_jams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creative_jams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      credit_ai_verifications: {
        Row: {
          ai_summary: string | null
          confidence_score: number | null
          credit_id: string
          evidence_links: Json | null
          id: string
          last_checked_at: string
          search_query: string | null
          status: string
          verified_at: string
        }
        Insert: {
          ai_summary?: string | null
          confidence_score?: number | null
          credit_id: string
          evidence_links?: Json | null
          id?: string
          last_checked_at?: string
          search_query?: string | null
          status?: string
          verified_at?: string
        }
        Update: {
          ai_summary?: string | null
          confidence_score?: number | null
          credit_id?: string
          evidence_links?: Json | null
          id?: string
          last_checked_at?: string
          search_query?: string | null
          status?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ai_verifications_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: true
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
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
      credit_endorsements: {
        Row: {
          credit_id: string
          endorser_email: string | null
          endorser_id: string | null
          endorser_name: string | null
          id: string
          relationship: string | null
          requested_at: string
          requested_by: string
          responded_at: string | null
          status: string
          testimonial: string | null
          token: string | null
        }
        Insert: {
          credit_id: string
          endorser_email?: string | null
          endorser_id?: string | null
          endorser_name?: string | null
          id?: string
          relationship?: string | null
          requested_at?: string
          requested_by: string
          responded_at?: string | null
          status?: string
          testimonial?: string | null
          token?: string | null
        }
        Update: {
          credit_id?: string
          endorser_email?: string | null
          endorser_id?: string | null
          endorser_name?: string | null
          id?: string
          relationship?: string | null
          requested_at?: string
          requested_by?: string
          responded_at?: string | null
          status?: string
          testimonial?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_endorsements_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          ai_confidence: number | null
          client_brand: string | null
          collaborator_user_ids: string[] | null
          created_at: string
          credit_category: string | null
          description: string | null
          display_order: number | null
          embed_data: Json | null
          end_date: string | null
          endorsement_count: number | null
          external_links: Json | null
          id: string
          is_featured: boolean | null
          location: string | null
          media_urls: string[] | null
          payment_verified: boolean | null
          platform: string | null
          project_name: string
          project_type: string | null
          role: string
          start_date: string | null
          thumbnail_url: string | null
          updated_at: string
          url: string | null
          user_id: string
          verification_status: string | null
          verification_url: string | null
          verified_by_name: string | null
          verified_by_user_id: string | null
          year: number | null
        }
        Insert: {
          ai_confidence?: number | null
          client_brand?: string | null
          collaborator_user_ids?: string[] | null
          created_at?: string
          credit_category?: string | null
          description?: string | null
          display_order?: number | null
          embed_data?: Json | null
          end_date?: string | null
          endorsement_count?: number | null
          external_links?: Json | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          media_urls?: string[] | null
          payment_verified?: boolean | null
          platform?: string | null
          project_name: string
          project_type?: string | null
          role: string
          start_date?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
          verification_status?: string | null
          verification_url?: string | null
          verified_by_name?: string | null
          verified_by_user_id?: string | null
          year?: number | null
        }
        Update: {
          ai_confidence?: number | null
          client_brand?: string | null
          collaborator_user_ids?: string[] | null
          created_at?: string
          credit_category?: string | null
          description?: string | null
          display_order?: number | null
          embed_data?: Json | null
          end_date?: string | null
          endorsement_count?: number | null
          external_links?: Json | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          media_urls?: string[] | null
          payment_verified?: boolean | null
          platform?: string | null
          project_name?: string
          project_type?: string | null
          role?: string
          start_date?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
          verification_status?: string | null
          verification_url?: string | null
          verified_by_name?: string | null
          verified_by_user_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
      deliverable_comments: {
        Row: {
          annotation_x: number | null
          annotation_y: number | null
          content: string
          created_at: string
          deliverable_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annotation_x?: number | null
          annotation_y?: number | null
          content: string
          created_at?: string
          deliverable_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annotation_x?: number | null
          annotation_y?: number | null
          content?: string
          created_at?: string
          deliverable_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_comments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_versions: {
        Row: {
          change_note: string | null
          created_at: string
          deliverable_id: string
          file_url: string
          id: string
          thumbnail_url: string | null
          uploaded_by: string
          version: number
        }
        Insert: {
          change_note?: string | null
          created_at?: string
          deliverable_id: string
          file_url: string
          id?: string
          thumbnail_url?: string | null
          uploaded_by: string
          version: number
        }
        Update: {
          change_note?: string | null
          created_at?: string
          deliverable_id?: string
          file_url?: string
          id?: string
          thumbnail_url?: string | null
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_versions_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["id"]
          },
        ]
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
          availability_info: string | null
          average_rating: number | null
          category: string | null
          condition: string | null
          created_at: string | null
          currency: string | null
          demo_url: string | null
          description: string | null
          download_count: number | null
          file_urls: string[] | null
          id: string
          is_active: boolean | null
          is_virtual: boolean | null
          item_location: string | null
          license_type: string | null
          listing_type: string
          pickup_location: string | null
          preview_urls: string[] | null
          price: number
          product_type: string
          review_count: number | null
          service_duration: string | null
          service_format: string | null
          shipping_method: string | null
          shipping_price: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability_info?: string | null
          average_rating?: number | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          demo_url?: string | null
          description?: string | null
          download_count?: number | null
          file_urls?: string[] | null
          id?: string
          is_active?: boolean | null
          is_virtual?: boolean | null
          item_location?: string | null
          license_type?: string | null
          listing_type?: string
          pickup_location?: string | null
          preview_urls?: string[] | null
          price: number
          product_type: string
          review_count?: number | null
          service_duration?: string | null
          service_format?: string | null
          shipping_method?: string | null
          shipping_price?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability_info?: string | null
          average_rating?: number | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          demo_url?: string | null
          description?: string | null
          download_count?: number | null
          file_urls?: string[] | null
          id?: string
          is_active?: boolean | null
          is_virtual?: boolean | null
          item_location?: string | null
          license_type?: string | null
          listing_type?: string
          pickup_location?: string | null
          preview_urls?: string[] | null
          price?: number
          product_type?: string
          review_count?: number | null
          service_duration?: string | null
          service_format?: string | null
          shipping_method?: string | null
          shipping_price?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          body: string
          click_count: number
          created_at: string
          failed_count: number
          id: string
          name: string
          open_count: number
          scheduled_for: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          total_recipients: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          click_count?: number
          created_at?: string
          failed_count?: number
          id?: string
          name: string
          open_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          total_recipients?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          click_count?: number
          created_at?: string
          failed_count?: number
          id?: string
          name?: string
          open_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          total_recipients?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          email: string
          id: string
          reason: string | null
          sender_id: string
          unsubscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          reason?: string | null
          sender_id: string
          unsubscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          reason?: string | null
          sender_id?: string
          unsubscribed_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          currency: string
          date: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          payment_method: string | null
          project_id: string | null
          receipt_url: string | null
          recurring_interval: string | null
          status: string
          subcategory: string | null
          tags: string[] | null
          tax_deductible: boolean | null
          title: string
          updated_at: string | null
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string | null
          currency?: string
          date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          receipt_url?: string | null
          recurring_interval?: string | null
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          tax_deductible?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          currency?: string
          date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          receipt_url?: string | null
          recurring_interval?: string | null
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          tax_deductible?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_clips: {
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
            foreignKeyName: "feed_clips_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
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
          auto_activity_message: string | null
          category: string | null
          content: string | null
          created_at: string
          id: string
          is_portfolio_item: boolean | null
          link_title: string | null
          link_url: string | null
          media_type: string | null
          media_urls: Json | null
          portfolio_item_id: string | null
          post_type: string
          prompt_id: string | null
          source_id: string | null
          source_type: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_activity_message?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_portfolio_item?: boolean | null
          link_title?: string | null
          link_url?: string | null
          media_type?: string | null
          media_urls?: Json | null
          portfolio_item_id?: string | null
          post_type?: string
          prompt_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_activity_message?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_portfolio_item?: boolean | null
          link_title?: string | null
          link_url?: string | null
          media_type?: string | null
          media_urls?: Json | null
          portfolio_item_id?: string | null
          post_type?: string
          prompt_id?: string | null
          source_id?: string | null
          source_type?: string | null
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
      feedback: {
        Row: {
          action_taken: string | null
          admin_notes: string | null
          category: string
          created_at: string
          id: string
          message: string
          page_url: string | null
          priority: string | null
          screenshot_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          page_url?: string | null
          priority?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          page_url?: string | null
          priority?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      founder_circle_purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          purchased_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          purchased_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          purchased_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      income_goals: {
        Row: {
          created_at: string
          currency: string
          id: string
          period: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          period?: string
          target_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          period?: string
          target_amount?: number
          updated_at?: string
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
          brand_address: string | null
          brand_color: string | null
          brand_email: string | null
          brand_logo_url: string | null
          brand_name: string | null
          brand_website: string | null
          created_at: string | null
          currency: string
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          due_date: string | null
          id: string
          invoice_number: string
          issued_by: string
          issued_to: string | null
          line_items: Json | null
          milestone_id: string | null
          notes: string | null
          paid_at: string | null
          payment_details: Json | null
          payment_link_url: string | null
          payment_method: string | null
          project_id: string | null
          recipient_address: string | null
          recipient_email: string | null
          recipient_name: string | null
          reminder_count: number | null
          reminder_sent_at: string | null
          sent_at: string | null
          status: string
          tax_amount: number | null
          tax_rate: number | null
          terms_conditions: string | null
          total_amount: number | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          amount: number
          brand_address?: string | null
          brand_color?: string | null
          brand_email?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_website?: string | null
          created_at?: string | null
          currency?: string
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_by: string
          issued_to?: string | null
          line_items?: Json | null
          milestone_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_details?: Json | null
          payment_link_url?: string | null
          payment_method?: string | null
          project_id?: string | null
          recipient_address?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          reminder_count?: number | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          status?: string
          tax_amount?: number | null
          tax_rate?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          amount?: number
          brand_address?: string | null
          brand_color?: string | null
          brand_email?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_website?: string | null
          created_at?: string | null
          currency?: string
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_by?: string
          issued_to?: string | null
          line_items?: Json | null
          milestone_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_details?: Json | null
          payment_link_url?: string | null
          payment_method?: string | null
          project_id?: string | null
          recipient_address?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          reminder_count?: number | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          status?: string
          tax_amount?: number | null
          tax_rate?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          viewed_at?: string | null
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
      jam_participants: {
        Row: {
          id: string
          jam_id: string
          joined_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          jam_id: string
          joined_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          jam_id?: string
          joined_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jam_participants_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "creative_jams"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          last_contacted_at: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          priority: string | null
          profile_url: string | null
          role: string | null
          source: string | null
          stage: string
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          priority?: string | null
          profile_url?: string | null
          role?: string | null
          source?: string | null
          stage?: string
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          priority?: string | null
          profile_url?: string | null
          role?: string | null
          source?: string | null
          stage?: string
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_orders: {
        Row: {
          amount: number
          auto_release_at: string | null
          buyer_confirmed_at: string | null
          buyer_id: string
          checkout_session_id: string | null
          created_at: string
          currency: string | null
          delivered_at: string | null
          delivery_notes: string | null
          delivery_status: string | null
          dispute_reason: string | null
          download_urls: string[] | null
          escrow_released_at: string | null
          id: string
          listing_id: string
          listing_type: string
          payment_intent_id: string | null
          platform_fee: number | null
          seller_id: string
          shipped_at: string | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          auto_release_at?: string | null
          buyer_confirmed_at?: string | null
          buyer_id: string
          checkout_session_id?: string | null
          created_at?: string
          currency?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_status?: string | null
          dispute_reason?: string | null
          download_urls?: string[] | null
          escrow_released_at?: string | null
          id?: string
          listing_id: string
          listing_type?: string
          payment_intent_id?: string | null
          platform_fee?: number | null
          seller_id: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_release_at?: string | null
          buyer_confirmed_at?: string | null
          buyer_id?: string
          checkout_session_id?: string | null
          created_at?: string
          currency?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_status?: string | null
          dispute_reason?: string | null
          download_urls?: string[] | null
          escrow_released_at?: string | null
          id?: string
          listing_id?: string
          listing_type?: string
          payment_intent_id?: string | null
          platform_fee?: number | null
          seller_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
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
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "project_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_message_request: boolean | null
          match_id: string | null
          read: boolean | null
          receiver_id: string
          reply_to_content: string | null
          reply_to_id: string | null
          reply_to_sender_name: string | null
          sender_id: string
          typing_at: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_message_request?: boolean | null
          match_id?: string | null
          read?: boolean | null
          receiver_id: string
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender_name?: string | null
          sender_id: string
          typing_at?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_message_request?: boolean | null
          match_id?: string | null
          read?: boolean | null
          receiver_id?: string
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender_name?: string | null
          sender_id?: string
          typing_at?: string | null
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
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "conversation_list"
            referencedColumns: ["message_id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
            referencedRelation: "feed_profiles"
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
            referencedRelation: "public_profiles_discovery"
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
      oauth_apps: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          redirect_uris: string[]
          updated_at: string
        }
        Insert: {
          client_id?: string
          client_secret?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          redirect_uris?: string[]
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          redirect_uris?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      oauth_codes: {
        Row: {
          app_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          scopes: string[]
          used: boolean
          user_id: string
        }
        Insert: {
          app_id: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri: string
          scopes?: string[]
          used?: boolean
          user_id: string
        }
        Update: {
          app_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          scopes?: string[]
          used?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_codes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_codes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps_public"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_tokens: {
        Row: {
          access_token: string
          app_id: string
          created_at: string
          expires_at: string
          id: string
          revoked: boolean
          scopes: string[]
          user_id: string
        }
        Insert: {
          access_token?: string
          app_id: string
          created_at?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          scopes?: string[]
          user_id: string
        }
        Update: {
          access_token?: string
          app_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          scopes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_tokens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps_public"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          barter_offering: string | null
          barter_requesting: string | null
          compensation: string | null
          content_deliverables: Json | null
          created_at: string | null
          created_by: string | null
          deliverables: string | null
          description: string
          duration: string | null
          guest_company_name: string | null
          guest_email: string | null
          guest_logo_url: string | null
          guest_profile_id: string | null
          id: string
          image_url: string | null
          is_guest_post: boolean | null
          is_priority: boolean | null
          location: string | null
          location_city: string | null
          location_country: string | null
          min_followers: number | null
          platform_requirements: string[] | null
          posted_by_manager_id: string | null
          priority_expires_at: string | null
          requirements: string | null
          skills: string[] | null
          status: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          verification_token: string | null
          verified_at: string | null
          view_count: number
        }
        Insert: {
          barter_offering?: string | null
          barter_requesting?: string | null
          compensation?: string | null
          content_deliverables?: Json | null
          created_at?: string | null
          created_by?: string | null
          deliverables?: string | null
          description: string
          duration?: string | null
          guest_company_name?: string | null
          guest_email?: string | null
          guest_logo_url?: string | null
          guest_profile_id?: string | null
          id?: string
          image_url?: string | null
          is_guest_post?: boolean | null
          is_priority?: boolean | null
          location?: string | null
          location_city?: string | null
          location_country?: string | null
          min_followers?: number | null
          platform_requirements?: string[] | null
          posted_by_manager_id?: string | null
          priority_expires_at?: string | null
          requirements?: string | null
          skills?: string[] | null
          status?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
          view_count?: number
        }
        Update: {
          barter_offering?: string | null
          barter_requesting?: string | null
          compensation?: string | null
          content_deliverables?: Json | null
          created_at?: string | null
          created_by?: string | null
          deliverables?: string | null
          description?: string
          duration?: string | null
          guest_company_name?: string | null
          guest_email?: string | null
          guest_logo_url?: string | null
          guest_profile_id?: string | null
          id?: string
          image_url?: string | null
          is_guest_post?: boolean | null
          is_priority?: boolean | null
          location?: string | null
          location_city?: string | null
          location_country?: string | null
          min_followers?: number | null
          platform_requirements?: string[] | null
          posted_by_manager_id?: string | null
          priority_expires_at?: string | null
          requirements?: string | null
          skills?: string[] | null
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_posted_by_manager_id_fkey"
            columns: ["posted_by_manager_id"]
            isOneToOne: false
            referencedRelation: "talent_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_views: {
        Row: {
          id: string
          opportunity_id: string
          referrer: string | null
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          opportunity_id: string
          referrer?: string | null
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          opportunity_id?: string
          referrer?: string | null
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_views_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_sequences: {
        Row: {
          completed_steps: number | null
          created_at: string
          description: string | null
          id: string
          lead_id: string | null
          name: string
          recipient_email: string | null
          status: string
          total_steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_steps?: number | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          name: string
          recipient_email?: string | null
          status?: string
          total_steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_steps?: number | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          recipient_email?: string | null
          status?: string
          total_steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_sequences_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      partner_invite_links: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          current_uses: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          partner_code: string
          partner_name: string
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          partner_code: string
          partner_name: string
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          partner_code?: string
          partner_name?: string
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
      partner_signups: {
        Row: {
          id: string
          partner_link_id: string
          signed_up_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          partner_link_id: string
          signed_up_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          partner_link_id?: string
          signed_up_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_signups_partner_link_id_fkey"
            columns: ["partner_link_id"]
            isOneToOne: false
            referencedRelation: "partner_invite_links"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
          collection_name: string | null
          collection_order: number | null
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
          collection_name?: string | null
          collection_order?: number | null
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
          collection_name?: string | null
          collection_order?: number | null
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
      product_purchases: {
        Row: {
          amount: number
          buyer_id: string
          completed_at: string | null
          created_at: string
          currency: string | null
          download_count: number | null
          download_url: string | null
          id: string
          platform_fee: number | null
          product_id: string
          seller_amount: number
          seller_id: string
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
        }
        Insert: {
          amount: number
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          download_count?: number | null
          download_url?: string | null
          id?: string
          platform_fee?: number | null
          product_id: string
          seller_amount: number
          seller_id: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          download_count?: number | null
          download_url?: string | null
          id?: string
          platform_fee?: number | null
          product_id?: string
          seller_amount?: number
          seller_id?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          helpful_count: number | null
          id: string
          is_verified_purchase: boolean | null
          product_id: string
          purchase_id: string | null
          rating: number
          review_text: string | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          product_id: string
          purchase_id?: string | null
          rating: number
          review_text?: string | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          product_id?: string
          purchase_id?: string | null
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "product_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_claim_requests: {
        Row: {
          admin_notes: string | null
          claimant_email: string
          claimant_user_id: string | null
          created_at: string
          id: string
          profile_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          verification_method: string
          verification_proof: string | null
        }
        Insert: {
          admin_notes?: string | null
          claimant_email: string
          claimant_user_id?: string | null
          created_at?: string
          id?: string
          profile_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          verification_method: string
          verification_proof?: string | null
        }
        Update: {
          admin_notes?: string | null
          claimant_email?: string
          claimant_user_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          verification_method?: string
          verification_proof?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_claim_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_claim_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_claim_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_claim_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_discovery"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_claim_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_claim_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          achievement_badges: string[] | null
          availability_note: string | null
          availability_status: string | null
          available_from: string | null
          available_invites: number | null
          avatar_url: string | null
          average_rating: number | null
          avg_response_hours: number | null
          avg_views: number | null
          awards: Json | null
          badge: Database["public"]["Enums"]["user_badge"] | null
          behance_url: string | null
          bio: string | null
          boost_expires_at: string | null
          calendly_url: string | null
          claim_token: string | null
          claimed_at: string | null
          claimed_by: string | null
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
          company_tagline: string | null
          cover_image_url: string | null
          created_at: string | null
          credit_score: number | null
          daily_swipes: number | null
          discogs_verified: boolean | null
          double_xp_expires_at: string | null
          email_verified: boolean
          full_name: string
          google_maps_place_id: string | null
          hourly_rate: number | null
          id: string
          id_verified: boolean
          id_verified_at: string | null
          imdb_url: string | null
          imdb_verified: boolean | null
          imported_data: Json | null
          imported_from_url: string | null
          industry: string | null
          instagram_followers: number | null
          instagram_url: string | null
          instagram_verified: boolean | null
          invite_code_used: string | null
          invited_by: string | null
          is_claimed: boolean | null
          is_manager_mode: boolean | null
          job_title: string | null
          last_active_date: string | null
          last_swipe_reset: string | null
          latitude: number | null
          level: number | null
          linkedin_connections: number | null
          linkedin_url: string | null
          location: string | null
          location_precision:
            | Database["public"]["Enums"]["location_precision"]
            | null
          location_updated_at: string | null
          location_visible: boolean | null
          longest_streak: number | null
          longitude: number | null
          membership_number: string | null
          og_promotion_expires_at: string | null
          og_promotion_used: boolean | null
          onboarding_completed: boolean
          onboarding_reminder_sent: boolean | null
          onboarding_started_at: string | null
          onboarding_step: number | null
          partner_code_used: string | null
          partner_location_id: string | null
          passion_skills: Json | null
          payment_verified: boolean
          phone_number: string | null
          phone_otp: string | null
          phone_otp_expires_at: string | null
          phone_verified: boolean
          portfolio_verified: boolean | null
          preferred_currency: string
          press_links: Json | null
          professional_skills: Json | null
          profile_frame: string | null
          profile_source: string | null
          project_credits: number | null
          project_rate: number | null
          rate_currency: string | null
          rate_range: string | null
          review_share_token: string | null
          role: string
          section_order: Json | null
          social_verified: boolean | null
          soundcloud_url: string | null
          spotify_listeners: number | null
          spotify_url: string | null
          spotify_verified: boolean | null
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
          team_member_ids: string[] | null
          tiktok_followers: number | null
          tiktok_url: string | null
          total_engagement_rate: number | null
          total_reviews: number | null
          tour_completed: boolean | null
          twitter_followers: number | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          verification_breakdown: Json | null
          verification_notes: string | null
          verification_score: number | null
          verification_status: string | null
          verification_tier: string | null
          verified_at: string | null
          verified_credentials: Json | null
          verified_metrics: boolean | null
          video_intro_url: string | null
          website: string | null
          xp: number | null
          youtube_subscribers: number | null
          youtube_url: string | null
          youtube_verified: boolean | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          achievement_badges?: string[] | null
          availability_note?: string | null
          availability_status?: string | null
          available_from?: string | null
          available_invites?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          avg_response_hours?: number | null
          avg_views?: number | null
          awards?: Json | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          boost_expires_at?: string | null
          calendly_url?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
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
          company_tagline?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          credit_score?: number | null
          daily_swipes?: number | null
          discogs_verified?: boolean | null
          double_xp_expires_at?: string | null
          email_verified?: boolean
          full_name: string
          google_maps_place_id?: string | null
          hourly_rate?: number | null
          id?: string
          id_verified?: boolean
          id_verified_at?: string | null
          imdb_url?: string | null
          imdb_verified?: boolean | null
          imported_data?: Json | null
          imported_from_url?: string | null
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          instagram_verified?: boolean | null
          invite_code_used?: string | null
          invited_by?: string | null
          is_claimed?: boolean | null
          is_manager_mode?: boolean | null
          job_title?: string | null
          last_active_date?: string | null
          last_swipe_reset?: string | null
          latitude?: number | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          location_precision?:
            | Database["public"]["Enums"]["location_precision"]
            | null
          location_updated_at?: string | null
          location_visible?: boolean | null
          longest_streak?: number | null
          longitude?: number | null
          membership_number?: string | null
          og_promotion_expires_at?: string | null
          og_promotion_used?: boolean | null
          onboarding_completed?: boolean
          onboarding_reminder_sent?: boolean | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          partner_code_used?: string | null
          partner_location_id?: string | null
          passion_skills?: Json | null
          payment_verified?: boolean
          phone_number?: string | null
          phone_otp?: string | null
          phone_otp_expires_at?: string | null
          phone_verified?: boolean
          portfolio_verified?: boolean | null
          preferred_currency?: string
          press_links?: Json | null
          professional_skills?: Json | null
          profile_frame?: string | null
          profile_source?: string | null
          project_credits?: number | null
          project_rate?: number | null
          rate_currency?: string | null
          rate_range?: string | null
          review_share_token?: string | null
          role: string
          section_order?: Json | null
          social_verified?: boolean | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          spotify_verified?: boolean | null
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
          team_member_ids?: string[] | null
          tiktok_followers?: number | null
          tiktok_url?: string | null
          total_engagement_rate?: number | null
          total_reviews?: number | null
          tour_completed?: boolean | null
          twitter_followers?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          verification_breakdown?: Json | null
          verification_notes?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verification_tier?: string | null
          verified_at?: string | null
          verified_credentials?: Json | null
          verified_metrics?: boolean | null
          video_intro_url?: string | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
          youtube_verified?: boolean | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          achievement_badges?: string[] | null
          availability_note?: string | null
          availability_status?: string | null
          available_from?: string | null
          available_invites?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          avg_response_hours?: number | null
          avg_views?: number | null
          awards?: Json | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          behance_url?: string | null
          bio?: string | null
          boost_expires_at?: string | null
          calendly_url?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
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
          company_tagline?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          credit_score?: number | null
          daily_swipes?: number | null
          discogs_verified?: boolean | null
          double_xp_expires_at?: string | null
          email_verified?: boolean
          full_name?: string
          google_maps_place_id?: string | null
          hourly_rate?: number | null
          id?: string
          id_verified?: boolean
          id_verified_at?: string | null
          imdb_url?: string | null
          imdb_verified?: boolean | null
          imported_data?: Json | null
          imported_from_url?: string | null
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          instagram_verified?: boolean | null
          invite_code_used?: string | null
          invited_by?: string | null
          is_claimed?: boolean | null
          is_manager_mode?: boolean | null
          job_title?: string | null
          last_active_date?: string | null
          last_swipe_reset?: string | null
          latitude?: number | null
          level?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          location?: string | null
          location_precision?:
            | Database["public"]["Enums"]["location_precision"]
            | null
          location_updated_at?: string | null
          location_visible?: boolean | null
          longest_streak?: number | null
          longitude?: number | null
          membership_number?: string | null
          og_promotion_expires_at?: string | null
          og_promotion_used?: boolean | null
          onboarding_completed?: boolean
          onboarding_reminder_sent?: boolean | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          partner_code_used?: string | null
          partner_location_id?: string | null
          passion_skills?: Json | null
          payment_verified?: boolean
          phone_number?: string | null
          phone_otp?: string | null
          phone_otp_expires_at?: string | null
          phone_verified?: boolean
          portfolio_verified?: boolean | null
          preferred_currency?: string
          press_links?: Json | null
          professional_skills?: Json | null
          profile_frame?: string | null
          profile_source?: string | null
          project_credits?: number | null
          project_rate?: number | null
          rate_currency?: string | null
          rate_range?: string | null
          review_share_token?: string | null
          role?: string
          section_order?: Json | null
          social_verified?: boolean | null
          soundcloud_url?: string | null
          spotify_listeners?: number | null
          spotify_url?: string | null
          spotify_verified?: boolean | null
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
          team_member_ids?: string[] | null
          tiktok_followers?: number | null
          tiktok_url?: string | null
          total_engagement_rate?: number | null
          total_reviews?: number | null
          tour_completed?: boolean | null
          twitter_followers?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          verification_breakdown?: Json | null
          verification_notes?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verification_tier?: string | null
          verified_at?: string | null
          verified_credentials?: Json | null
          verified_metrics?: boolean | null
          video_intro_url?: string | null
          website?: string | null
          xp?: number | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
          youtube_verified?: boolean | null
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
      project_credits: {
        Row: {
          assigned_by: string
          confirmed_at: string | null
          created_at: string
          credit_id: string | null
          id: string
          project_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          confirmed_at?: string | null
          created_at?: string
          credit_id?: string | null
          id?: string
          project_id: string
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          confirmed_at?: string | null
          created_at?: string
          credit_id?: string | null
          id?: string
          project_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_credits_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_credits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deliverables: {
        Row: {
          created_at: string
          description: string | null
          file_id: string | null
          file_url: string | null
          id: string
          media_type: string | null
          project_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_id?: string | null
          file_url?: string | null
          id?: string
          media_type?: string | null
          project_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          file_id?: string | null
          file_url?: string | null
          id?: string
          media_type?: string | null
          project_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_project_id_fkey"
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
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
            referencedRelation: "public_profiles_discovery"
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
          is_pinned: boolean | null
          message: string
          project_id: string
          reply_to: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_pinned?: boolean | null
          message: string
          project_id: string
          reply_to?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_pinned?: boolean | null
          message?: string
          project_id?: string
          reply_to?: string | null
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
            foreignKeyName: "project_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "project_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
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
            referencedRelation: "public_profiles_discovery"
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
          color: string | null
          complexity: string | null
          created_at: string | null
          created_by: string
          description: string | null
          estimated_duration: string | null
          icon: string | null
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
          color?: string | null
          complexity?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          estimated_duration?: string | null
          icon?: string | null
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
          color?: string | null
          complexity?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          estimated_duration?: string | null
          icon?: string | null
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
      referral_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          currency: string
          gross_amount: number
          id: string
          manager_id: string
          paid_at: string | null
          source_id: string | null
          source_type: string
          status: string
          talent_user_id: string
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string
          currency?: string
          gross_amount: number
          id?: string
          manager_id: string
          paid_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          talent_user_id: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          manager_id?: string
          paid_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          talent_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "talent_managers"
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
          personal_message: string | null
          profile_id: string
          project_name: string | null
          reviewer_email: string | null
          reviewer_name: string | null
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
          reviewer_email?: string | null
          reviewer_name?: string | null
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
          reviewer_email?: string | null
          reviewer_name?: string | null
          share_token?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
            referencedRelation: "feed_profiles"
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
            referencedRelation: "public_profiles_discovery"
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
      sequence_emails: {
        Row: {
          body: string
          created_at: string
          delay_days: number | null
          id: string
          opened_at: string | null
          replied_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          sequence_id: string
          status: string
          step_number: number
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          delay_days?: number | null
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sequence_id: string
          status?: string
          step_number?: number
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delay_days?: number | null
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sequence_id?: string
          status?: string
          step_number?: number
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_emails_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "outreach_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string | null
          currency: string
          delivery_days: number | null
          description: string | null
          display_order: number | null
          features: string[] | null
          id: string
          is_active: boolean | null
          price: number
          revisions: number | null
          tier: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string
          delivery_days?: number | null
          description?: string | null
          display_order?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          price?: number
          revisions?: number | null
          tier?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          delivery_days?: number | null
          description?: string | null
          display_order?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          price?: number
          revisions?: number | null
          tier?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_discovery"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "creative_jams"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
      spark_room_members: {
        Row: {
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spark_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "spark_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      spark_room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          media_url: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_url?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spark_room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "spark_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      spark_rooms: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          member_count: number
          message_count: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          member_count?: number
          message_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          member_count?: number
          message_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      talent_managers: {
        Row: {
          commission_rate: number
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          manager_user_id: string
          organization: string | null
          referral_code: string
          total_earned: number
          total_referred: number
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          manager_user_id: string
          organization?: string | null
          referral_code: string
          total_earned?: number
          total_referred?: number
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          manager_user_id?: string
          organization?: string | null
          referral_code?: string
          total_earned?: number
          total_referred?: number
          updated_at?: string
        }
        Relationships: []
      }
      talent_referrals: {
        Row: {
          id: string
          manager_id: string
          referred_at: string
          status: string
          talent_user_id: string
        }
        Insert: {
          id?: string
          manager_id: string
          referred_at?: string
          status?: string
          talent_user_id: string
        }
        Update: {
          id?: string
          manager_id?: string
          referred_at?: string
          status?: string
          talent_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_referrals_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "talent_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_shortlist: {
        Row: {
          company_user_id: string
          created_at: string
          id: string
          match_reasons: Json | null
          match_score: number | null
          notes: string | null
          opportunity_id: string | null
          status: string
          talent_user_id: string
          updated_at: string
        }
        Insert: {
          company_user_id: string
          created_at?: string
          id?: string
          match_reasons?: Json | null
          match_score?: number | null
          notes?: string | null
          opportunity_id?: string | null
          status?: string
          talent_user_id: string
          updated_at?: string
        }
        Update: {
          company_user_id?: string
          created_at?: string
          id?: string
          match_reasons?: Json | null
          match_score?: number | null
          notes?: string | null
          opportunity_id?: string | null
          status?: string
          talent_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_shortlist_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
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
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
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
      user_email_settings: {
        Row: {
          created_at: string
          gmail_app_password: string | null
          gmail_email: string | null
          id: string
          is_configured: boolean
          last_tested_at: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gmail_app_password?: string | null
          gmail_email?: string | null
          id?: string
          is_configured?: boolean
          last_tested_at?: string | null
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gmail_app_password?: string | null
          gmail_email?: string | null
          id?: string
          is_configured?: boolean
          last_tested_at?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      verified_credits: {
        Row: {
          created_at: string | null
          credit_type: string
          id: string
          metadata: Json | null
          role: string | null
          source: string
          source_id: string | null
          title: string
          user_id: string
          verification_url: string | null
          verified_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          credit_type: string
          id?: string
          metadata?: Json | null
          role?: string | null
          source: string
          source_id?: string | null
          title: string
          user_id: string
          verification_url?: string | null
          verified_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          credit_type?: string
          id?: string
          metadata?: Json | null
          role?: string | null
          source?: string
          source_id?: string | null
          title?: string
          user_id?: string
          verification_url?: string | null
          verified_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "verified_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verified_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verified_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verified_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_discovery"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verified_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verified_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
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
      wallet_connections: {
        Row: {
          chain_id: number
          connected_at: string
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          last_used_at: string | null
          updated_at: string
          user_id: string
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          chain_id?: number
          connected_at?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          last_used_at?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
          wallet_type?: string
        }
        Update: {
          chain_id?: number
          connected_at?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          last_used_at?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
          wallet_type?: string
        }
        Relationships: []
      }
      wallet_topups: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          gateway_payment_id: string | null
          gateway_session_id: string | null
          id: string
          payment_gateway: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          gateway_payment_id?: string | null
          gateway_session_id?: string | null
          id?: string
          payment_gateway?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          gateway_payment_id?: string | null
          gateway_session_id?: string | null
          id?: string
          payment_gateway?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_discovery"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wallet_transfer_limits: {
        Row: {
          daily_limit_ttd: number
          daily_limit_usd: number
          id: string
          monthly_limit_ttd: number
          monthly_limit_usd: number
          per_transaction_limit_ttd: number
          per_transaction_limit_usd: number
          tier: string
        }
        Insert: {
          daily_limit_ttd?: number
          daily_limit_usd?: number
          id?: string
          monthly_limit_ttd?: number
          monthly_limit_usd?: number
          per_transaction_limit_ttd?: number
          per_transaction_limit_usd?: number
          tier: string
        }
        Update: {
          daily_limit_ttd?: number
          daily_limit_usd?: number
          id?: string
          monthly_limit_ttd?: number
          monthly_limit_usd?: number
          per_transaction_limit_ttd?: number
          per_transaction_limit_usd?: number
          tier?: string
        }
        Relationships: []
      }
      wallet_transfers: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          recipient_id: string
          sender_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          recipient_id: string
          sender_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          recipient_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transfers_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_discovery"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_discovery"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_transfers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          credits: number | null
          currency: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          credits?: number | null
          currency?: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          credits?: number | null
          currency?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
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
      connected_platforms_public: {
        Row: {
          created_at: string | null
          id: string | null
          last_synced_at: string | null
          platform: string | null
          platform_data: Json | null
          platform_user_id: string | null
          platform_username: string | null
          updated_at: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          last_synced_at?: string | null
          platform?: string | null
          platform_data?: Json | null
          platform_user_id?: string | null
          platform_username?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          last_synced_at?: string | null
          platform?: string | null
          platform_data?: Json | null
          platform_user_id?: string | null
          platform_username?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_discovery"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connected_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["user_id"]
          },
        ]
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
      feed_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      oauth_apps_public: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          owner_id: string | null
          redirect_uris: string[] | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          redirect_uris?: string[] | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          redirect_uris?: string[] | null
        }
        Relationships: []
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
      public_profiles_discovery: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          badge: Database["public"]["Enums"]["user_badge"] | null
          bio: string | null
          collab_intent: string | null
          company_logo_url: string | null
          company_name: string | null
          created_at: string | null
          full_name: string | null
          industry: string | null
          job_title: string | null
          level: number | null
          location: string | null
          onboarding_completed: boolean | null
          passion_skills: Json | null
          professional_skills: Json | null
          role: string | null
          user_id: string | null
          verification_score: number | null
          xp: number | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          bio?: string | null
          collab_intent?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          industry?: string | null
          job_title?: string | null
          level?: number | null
          location?: string | null
          onboarding_completed?: boolean | null
          passion_skills?: Json | null
          professional_skills?: Json | null
          role?: string | null
          user_id?: string | null
          verification_score?: number | null
          xp?: number | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          bio?: string | null
          collab_intent?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          industry?: string | null
          job_title?: string | null
          level?: number | null
          location?: string | null
          onboarding_completed?: boolean | null
          passion_skills?: Json | null
          professional_skills?: Json | null
          role?: string | null
          user_id?: string | null
          verification_score?: number | null
          xp?: number | null
        }
        Relationships: []
      }
      public_profiles_safe: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          badge: Database["public"]["Enums"]["user_badge"] | null
          bio: string | null
          collab_intent: string | null
          company_logo_url: string | null
          company_name: string | null
          full_name: string | null
          industry: string | null
          job_title: string | null
          level: number | null
          location: string | null
          passion_skills: Json | null
          professional_skills: Json | null
          role: string | null
          subscription_tier: string | null
          user_id: string | null
          verification_score: number | null
          xp: number | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          bio?: string | null
          collab_intent?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          full_name?: string | null
          industry?: string | null
          job_title?: string | null
          level?: number | null
          location?: string | null
          passion_skills?: Json | null
          professional_skills?: Json | null
          role?: string | null
          subscription_tier?: string | null
          user_id?: string | null
          verification_score?: number | null
          xp?: number | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          badge?: Database["public"]["Enums"]["user_badge"] | null
          bio?: string | null
          collab_intent?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          full_name?: string | null
          industry?: string | null
          job_title?: string | null
          level?: number | null
          location?: string | null
          passion_skills?: Json | null
          professional_skills?: Json | null
          role?: string | null
          subscription_tier?: string | null
          user_id?: string | null
          verification_score?: number | null
          xp?: number | null
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
            referencedRelation: "feed_profiles"
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
            referencedRelation: "public_profiles_discovery"
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
      reviews_public: {
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
        }
        Relationships: [
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
            referencedRelation: "feed_profiles"
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
            referencedRelation: "public_profiles_discovery"
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
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
      skill_endorsements_public: {
        Row: {
          created_at: string | null
          endorser_company: string | null
          endorser_name: string | null
          id: string | null
          proficiency_level: string | null
          profile_id: string | null
          project_name: string | null
          relationship: string | null
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
          skill_name?: string | null
          testimonial?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "feed_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles_discovery"
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
      check_transfer_limit: {
        Args: { p_amount: number; p_currency?: string; p_user_id: string }
        Returns: Json
      }
      claim_profile: {
        Args: { p_claim_token: string; p_user_id: string }
        Returns: boolean
      }
      create_bidirectional_connection: {
        Args: {
          connection_status?: string
          user1_uuid: string
          user2_uuid: string
        }
        Returns: undefined
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
      create_unclaimed_profile: {
        Args: {
          p_avatar_url?: string
          p_bio?: string
          p_full_name: string
          p_imported_data?: Json
          p_imported_from_url?: string
          p_location?: string
          p_professional_skills?: Json
          p_role: string
          p_source?: string
        }
        Returns: string
      }
      find_matching_unclaimed_profiles: {
        Args: { p_full_name: string; p_limit?: number }
        Returns: {
          avatar_url: string
          bio: string
          claim_token: string
          full_name: string
          imported_data: Json
          imported_from_url: string
          location: string
          professional_skills: Json
          role: string
          similarity_score: number
          user_id: string
        }[]
      }
      generate_claim_token: { Args: never; Returns: string }
      generate_invite_codes: {
        Args: { num_codes?: number; user_id_param: string }
        Returns: undefined
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_membership_number: { Args: never; Returns: string }
      generate_secure_token: { Args: never; Returns: string }
      generate_unsubscribe_token: { Args: never; Returns: string }
      get_connection_path: {
        Args: { from_user_id: string; to_user_id: string }
        Returns: {
          degree: number
          path_user_ids: string[]
          path_user_names: string[]
        }[]
      }
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
      get_founder_circle_count: { Args: never; Returns: number }
      get_mutual_connections: {
        Args: { user1_id: string; user2_id: string }
        Returns: {
          avatar_url: string
          connection_id: string
          full_name: string
          role: string
        }[]
      }
      get_nearby_creators: {
        Args: {
          limit_count?: number
          radius_km?: number
          user_lat: number
          user_lon: number
        }
        Returns: {
          avatar_url: string
          bio: string
          distance_km: number
          full_name: string
          latitude: number
          location: string
          longitude: number
          professional_skills: Json
          role: string
          user_id: string
        }[]
      }
      get_nearby_jams: {
        Args: {
          limit_count?: number
          radius_km?: number
          user_lat: number
          user_lon: number
        }
        Returns: {
          category: string
          cover_image_url: string
          created_at: string
          created_by: string
          creator_avatar: string
          creator_name: string
          description: string
          distance_km: number
          end_time: string
          id: string
          is_public: boolean
          latitude: number
          longitude: number
          max_participants: number
          participant_count: number
          start_time: string
          status: string
          tags: string[]
          title: string
          venue_address: string
          venue_name: string
        }[]
      }
      get_network_health: {
        Args: { p_user_id: string }
        Returns: {
          active_connections: number
          connectivity_score: number
          diversity_score: number
          growth_potential: number
          overall_score: number
          pending_requests: number
          unique_roles: number
        }[]
      }
      get_network_industry_breakdown: {
        Args: { p_user_id: string }
        Returns: {
          count: number
          role_category: string
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
      get_profiles_by_degree: {
        Args: {
          p_degree: number
          p_limit?: number
          p_offset?: number
          p_user_id: string
        }
        Returns: {
          avatar_url: string
          badge: Database["public"]["Enums"]["user_badge"]
          bio: string
          full_name: string
          location: string
          professional_skills: Json
          role: string
          user_id: string
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
      increment_endorsement_count: {
        Args: { credit_id_param: string }
        Returns: undefined
      }
      is_profile_owner: { Args: { _profile_user_id: string }; Returns: boolean }
      send_opportunity_alerts: {
        Args: { opportunity_id_param: string }
        Returns: undefined
      }
      update_my_location: {
        Args: { lat: number; lon: number }
        Returns: boolean
      }
      use_invite_code:
        | { Args: { code: string; user_email: string }; Returns: boolean }
        | {
            Args: { code: string; new_user_id?: string; user_email: string }
            Returns: boolean
          }
      use_partner_code: {
        Args: { p_code: string; p_user_id: string }
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
      location_precision: "exact" | "approximate" | "area_only"
      user_badge: "og" | "beta" | "official" | "founder" | "odos"
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
      location_precision: ["exact", "approximate", "area_only"],
      user_badge: ["og", "beta", "official", "founder", "odos"],
    },
  },
} as const
