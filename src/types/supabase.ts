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
      image_analysis: {
        Row: {
          camera_info: string | null
          colors: string[]
          created_at: string | null
          full_analysis: string | null
          gps_location: Json | null
          id: number
          keywords: string[]
          media_item_id: string
          objects: string[]
          processing_completed: string | null
          processing_error: string | null
          processing_started: string | null
          processing_state: string
          quality_score: number | null
          safety_issues: string[]
          scene_types: string[] | null
          sentiment: string | null
          updated_at: string | null
        }
        Insert: {
          camera_info?: string | null
          colors?: string[]
          created_at?: string | null
          full_analysis?: string | null
          gps_location?: Json | null
          id?: number
          keywords?: string[]
          media_item_id: string
          objects?: string[]
          processing_completed?: string | null
          processing_error?: string | null
          processing_started?: string | null
          processing_state?: string
          quality_score?: number | null
          safety_issues?: string[]
          scene_types?: string[] | null
          sentiment?: string | null
          updated_at?: string | null
        }
        Update: {
          camera_info?: string | null
          colors?: string[]
          created_at?: string | null
          full_analysis?: string | null
          gps_location?: Json | null
          id?: number
          keywords?: string[]
          media_item_id?: string
          objects?: string[]
          processing_completed?: string | null
          processing_error?: string | null
          processing_started?: string | null
          processing_state?: string
          quality_score?: number | null
          safety_issues?: string[]
          scene_types?: string[] | null
          sentiment?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_analysis_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          created_date: string | null
          exif_data: Json | null
          file_name: string
          file_path: string
          file_type_id: number
          folder_path: string
          id: string
          is_deleted: boolean
          is_hidden: boolean
          media_date: string | null
          modified_date: string
          size_bytes: number
          thumbnail_path: string | null
        }
        Insert: {
          created_date?: string | null
          exif_data?: Json | null
          file_name: string
          file_path: string
          file_type_id: number
          folder_path: string
          id?: string
          is_deleted?: boolean
          is_hidden?: boolean
          media_date?: string | null
          modified_date: string
          size_bytes: number
          thumbnail_path?: string | null
        }
        Update: {
          created_date?: string | null
          exif_data?: Json | null
          file_name?: string
          file_path?: string
          file_type_id?: number
          folder_path?: string
          id?: string
          is_deleted?: boolean
          is_hidden?: boolean
          media_date?: string | null
          modified_date?: string
          size_bytes?: number
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_items_file_type_id_fkey"
            columns: ["file_type_id"]
            isOneToOne: false
            referencedRelation: "file_types"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_states: {
        Row: {
          created_at: string
          error_message: string | null
          id: number
          media_item_id: string | null
          processed_at: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: number
          media_item_id?: string | null
          processed_at?: string | null
          status: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: number
          media_item_id?: string | null
          processed_at?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_states_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
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
      clear_all_exif_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          affected_rows: number
          status: string
        }[]
      }
      get_analysis_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total: number
          success: number
          failed: number
          pending: number
          completion_percentage: number
        }[]
      }
      get_exif_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total: number
          success: number
          failed: number
        }[]
      }
      get_media_items: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_type?: string
          p_date_from?: string
          p_date_to?: string
          p_min_size?: number
          p_max_size?: number
          p_sort_by?: string
          p_sort_order?: string
          p_has_exif?: string
          p_has_location?: string
          p_has_thumbnail?: string
          p_has_analysis?: string
          p_include_hidden?: boolean
          p_include_deleted?: boolean
        }
        Returns: {
          items: Json
          total_count: number
        }[]
      }
      get_media_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_count: number
          total_size_bytes: number
          processed_count: number
          unprocessed_count: number
          organized_count: number
          unorganized_count: number
        }[]
      }
      get_thumbnail_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total: number
          success: number
          failed: number
        }[]
      }
      get_unique_camera_models: {
        Args: Record<PropertyKey, never>
        Returns: {
          camera_model: string
        }[]
      }
      get_unprocessed_analysis_files: {
        Args: { limit_param: number }
        Returns: {
          id: string
          file_name: string
          file_path: string
          file_types: Json
        }[]
      }
      get_unprocessed_exif_files: {
        Args: { limit_count: number }
        Returns: {
          id: string
          file_name: string
          file_path: string
          file_type_id: number
          file_types: Json
        }[]
      }
      get_unprocessed_thumbnail_files: {
        Args: { limit_count: number }
        Returns: {
          id: string
          file_name: string
          file_path: string
          file_type_id: number
          thumbnail_path: string
          file_types: Json
        }[]
      }
      random_order_media_items: {
        Args: { limit_count?: number }
        Returns: {
          created_date: string | null
          exif_data: Json | null
          file_name: string
          file_path: string
          file_type_id: number
          folder_path: string
          id: string
          is_deleted: boolean
          is_hidden: boolean
          media_date: string | null
          modified_date: string
          size_bytes: number
          thumbnail_path: string | null
        }[]
      }
      sum_file_sizes: {
        Args: Record<PropertyKey, never>
        Returns: {
          sum: number
        }[]
      }
      update_media_visibility: {
        Args: {
          p_media_id: string
          p_is_deleted?: boolean
          p_is_hidden?: boolean
        }
        Returns: undefined
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

