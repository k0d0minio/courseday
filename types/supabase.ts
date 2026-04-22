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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity: {
        Row: {
          allergens: string[]
          created_at: string
          day_id: string
          description: string | null
          end_time: string | null
          expected_covers: number | null
          id: string
          is_recurring: boolean
          notes: string | null
          poc_id: string | null
          recurrence_frequency: string | null
          recurrence_group_id: string | null
          start_time: string | null
          tenant_id: string
          title: string
          updated_at: string
          venue_type_id: string | null
        }
        Insert: {
          allergens?: string[]
          created_at?: string
          day_id: string
          description?: string | null
          end_time?: string | null
          expected_covers?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          poc_id?: string | null
          recurrence_frequency?: string | null
          recurrence_group_id?: string | null
          start_time?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          venue_type_id?: string | null
        }
        Update: {
          allergens?: string[]
          created_at?: string
          day_id?: string
          description?: string | null
          end_time?: string | null
          expected_covers?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          poc_id?: string | null
          recurrence_frequency?: string | null
          recurrence_group_id?: string | null
          start_time?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          venue_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_item_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_item_poc_id_fkey"
            columns: ["poc_id"]
            isOneToOne: false
            referencedRelation: "point_of_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_item_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_item_venue_type_id_fkey"
            columns: ["venue_type_id"]
            isOneToOne: false
            referencedRelation: "venue_type"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_checklist_item: {
        Row: {
          activity_id: string
          created_at: string
          day_id: string
          done_at: string | null
          done_by: string | null
          id: string
          is_done: boolean
          label: string
          position: number
          tenant_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          day_id: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          label: string
          position?: number
          tenant_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          day_id?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          label?: string
          position?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_checklist_item_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_checklist_item_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_checklist_item_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_tag: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_tag_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_tag_assignment: {
        Row: {
          activity_id: string
          tag_id: string
        }
        Insert: {
          activity_id: string
          tag_id: string
        }
        Update: {
          activity_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_tag_assignment_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_tag_assignment_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "activity_tag"
            referencedColumns: ["id"]
          },
        ]
      }
      breakfast_configuration: {
        Row: {
          allergens: string[]
          breakfast_date: string
          created_at: string
          day_id: string
          group_name: string | null
          id: string
          notes: string | null
          start_time: string | null
          table_breakdown: Json | null
          tenant_id: string
          total_guests: number
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          breakfast_date: string
          created_at?: string
          day_id: string
          group_name?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          table_breakdown?: Json | null
          tenant_id: string
          total_guests?: number
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          breakfast_date?: string
          created_at?: string
          day_id?: string
          group_name?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          table_breakdown?: Json | null
          tenant_id?: string
          total_guests?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakfast_configuration_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakfast_configuration_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template: {
        Row: {
          activity_tag_id: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
          venue_type_id: string | null
        }
        Insert: {
          activity_tag_id?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
          venue_type_id?: string | null
        }
        Update: {
          activity_tag_id?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
          venue_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_activity_tag_id_fkey"
            columns: ["activity_tag_id"]
            isOneToOne: false
            referencedRelation: "activity_tag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_venue_type_id_fkey"
            columns: ["venue_type_id"]
            isOneToOne: false
            referencedRelation: "venue_type"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_item: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_item_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_template"
            referencedColumns: ["id"]
          },
        ]
      }
      day: {
        Row: {
          created_at: string
          date_iso: string
          id: string
          tenant_id: string
          weekday: string
        }
        Insert: {
          created_at?: string
          date_iso: string
          id?: string
          tenant_id: string
          weekday: string
        }
        Update: {
          created_at?: string
          date_iso?: string
          id?: string
          tenant_id?: string
          weekday?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      day_notes: {
        Row: {
          author_name: string
          content: string
          created_at: string
          day_id: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          day_id: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          day_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_notes_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          enabled: boolean
          flag_key: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          flag_key: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          flag_key?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          tenant_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          tenant_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      point_of_contact: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_of_contact_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation: {
        Row: {
          allergens: string[]
          created_at: string
          day_id: string
          end_time: string | null
          guest_count: number | null
          guest_name: string | null
          id: string
          notes: string | null
          start_time: string | null
          table_breakdown: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          created_at?: string
          day_id: string
          end_time?: string | null
          guest_count?: number | null
          guest_name?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          table_breakdown?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          created_at?: string
          day_id?: string
          end_time?: string | null
          guest_count?: number | null
          guest_name?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          table_breakdown?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift: {
        Row: {
          created_at: string
          day_id: string
          end_time: string | null
          id: string
          notes: string | null
          role: string
          staff_member_id: string
          start_time: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_id: string
          end_time?: string | null
          id?: string
          notes?: string | null
          role?: string
          staff_member_id: string
          start_time?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          role?: string
          staff_member_id?: string
          start_time?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_member: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          role: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          role?: string
          tenant_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_member_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_role: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          accent_color: string | null
          created_at: string
          id: string
          language: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          onboarding_completed: boolean
          slug: string
          status: string
          theme_palette: string
          timezone: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          id?: string
          language?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          onboarding_completed?: boolean
          slug: string
          status?: string
          theme_palette?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          id?: string
          language?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          onboarding_completed?: boolean
          slug?: string
          status?: string
          theme_palette?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      venue_type: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_type_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      is_tenant_editor: { Args: { t_id: string }; Returns: boolean }
      is_tenant_member: { Args: { t_id: string }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
