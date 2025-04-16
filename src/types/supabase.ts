export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      file_types: {
        Row: {
          can_display_natively: boolean | null
          category: string
          created_at: string
          extension: string
          id: number
          ignore: boolean | null
          mime_type: string | null
          needs_conversion: boolean | null
        }
        Insert: {
          can_display_natively?: boolean | null
          category: string
          created_at?: string
          extension: string
          id?: number
          ignore?: boolean | null
          mime_type?: string | null
          needs_conversion?: boolean | null
        }
        Update: {
          can_display_natively?: boolean | null
          category?: string
          created_at?: string
          extension?: string
          id?: number
          ignore?: boolean | null
          mime_type?: string | null
          needs_conversion?: boolean | null
        }
        Relationships: []
      }
      media_items: {
        Row: {
          created_at: string
          created_date: string | null
          duration_seconds: number | null
          exif_data: Json | null
          extension: string
          file_name: string
          file_path: string
          folder_path: string
          has_exif: boolean
          height: number | null
          id: string
          media_date: string | null
          modified_date: string
          organized: boolean
          processed: boolean
          size_bytes: number
          thumbnail_path: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          created_at?: string
          created_date?: string | null
          duration_seconds?: number | null
          exif_data?: Json | null
          extension: string
          file_name: string
          file_path: string
          folder_path: string
          has_exif?: boolean
          height?: number | null
          id?: string
          media_date?: string | null
          modified_date: string
          organized?: boolean
          processed?: boolean
          size_bytes: number
          thumbnail_path?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          created_at?: string
          created_date?: string | null
          duration_seconds?: number | null
          exif_data?: Json | null
          extension?: string
          file_name?: string
          file_path?: string
          folder_path?: string
          has_exif?: boolean
          height?: number | null
          id?: string
          media_date?: string | null
          modified_date?: string
          organized?: boolean
          processed?: boolean
          size_bytes?: number
          thumbnail_path?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      scan_folders: {
        Row: {
          created_at: string
          id: number
          include_subfolders: boolean | null
          last_scanned: string | null
          path: string
        }
        Insert: {
          created_at?: string
          id?: number
          include_subfolders?: boolean | null
          last_scanned?: string | null
          path: string
        }
        Update: {
          created_at?: string
          id?: number
          include_subfolders?: boolean | null
          last_scanned?: string | null
          path?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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

