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
      analysis_data: {
        Row: {
          artistic_elements: Json | null
          colors: string[]
          content_warnings: Json[] | null
          emotions: string[]
          faces: Json[]
          id: string
          image_description: string | null
          keywords: string[]
          media_id: string
          objects: Json[]
          people: Json[] | null
          quality_assessment: Json | null
          scene_types: string[]
          setting: string | null
          text_content: string | null
          time_of_day: string | null
        }
        Insert: {
          artistic_elements?: Json | null
          colors?: string[]
          content_warnings?: Json[] | null
          emotions?: string[]
          faces?: Json[]
          id?: string
          image_description?: string | null
          keywords?: string[]
          media_id: string
          objects?: Json[]
          people?: Json[] | null
          quality_assessment?: Json | null
          scene_types?: string[]
          setting?: string | null
          text_content?: string | null
          time_of_day?: string | null
        }
        Update: {
          artistic_elements?: Json | null
          colors?: string[]
          content_warnings?: Json[] | null
          emotions?: string[]
          faces?: Json[]
          id?: string
          image_description?: string | null
          keywords?: string[]
          media_id?: string
          objects?: Json[]
          people?: Json[] | null
          quality_assessment?: Json | null
          scene_types?: string[]
          setting?: string | null
          text_content?: string | null
          time_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_data_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: true
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicates: {
        Row: {
          duplicate_id: string
          hamming_distance: number
          media_id: string
          similarity_score: number
        }
        Insert: {
          duplicate_id: string
          hamming_distance: number
          media_id: string
          similarity_score: number
        }
        Update: {
          duplicate_id?: string
          hamming_distance?: number
          media_id?: string
          similarity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_duplicate"
            columns: ["duplicate_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_media"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      exif_data: {
        Row: {
          aperture: number | null
          camera_make: string | null
          camera_model: string | null
          depth_of_field: string | null
          digital_zoom_ratio: number | null
          exif_timestamp: string | null
          exposure_time: string | null
          field_of_view: string | null
          flash: string | null
          focal_length_35mm: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          height: number
          id: string
          iso: number | null
          lens_id: string | null
          lens_model: string | null
          light_source: string | null
          media_id: string
          metering_mode: string | null
          orientation: number | null
          scene_capture_type: string | null
          subject_distance: number | null
          width: number
        }
        Insert: {
          aperture?: number | null
          camera_make?: string | null
          camera_model?: string | null
          depth_of_field?: string | null
          digital_zoom_ratio?: number | null
          exif_timestamp?: string | null
          exposure_time?: string | null
          field_of_view?: string | null
          flash?: string | null
          focal_length_35mm?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          height: number
          id?: string
          iso?: number | null
          lens_id?: string | null
          lens_model?: string | null
          light_source?: string | null
          media_id: string
          metering_mode?: string | null
          orientation?: number | null
          scene_capture_type?: string | null
          subject_distance?: number | null
          width?: number
        }
        Update: {
          aperture?: number | null
          camera_make?: string | null
          camera_model?: string | null
          depth_of_field?: string | null
          digital_zoom_ratio?: number | null
          exif_timestamp?: string | null
          exposure_time?: string | null
          field_of_view?: string | null
          flash?: string | null
          focal_length_35mm?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          height?: number
          id?: string
          iso?: number | null
          lens_id?: string | null
          lens_model?: string | null
          light_source?: string | null
          media_id?: string
          metering_mode?: string | null
          orientation?: number | null
          scene_capture_type?: string | null
          subject_distance?: number | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "exif_data_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: true
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          id: string
          is_deleted: boolean
          is_hidden: boolean
          media_path: string
          media_type_id: string
          size_bytes: number
          thumbnail_process: string | null
          thumbnail_url: string | null
          visual_hash: string | null
        }
        Insert: {
          id?: string
          is_deleted?: boolean
          is_hidden?: boolean
          media_path: string
          media_type_id: string
          size_bytes: number
          thumbnail_process?: string | null
          thumbnail_url?: string | null
          visual_hash?: string | null
        }
        Update: {
          id?: string
          is_deleted?: boolean
          is_hidden?: boolean
          media_path?: string
          media_type_id?: string
          size_bytes?: number
          thumbnail_process?: string | null
          thumbnail_url?: string | null
          visual_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_file_type_id_fkey"
            columns: ["media_type_id"]
            isOneToOne: false
            referencedRelation: "media_types"
            referencedColumns: ["id"]
          },
        ]
      }
      media_types: {
        Row: {
          description: string | null
          id: string
          is_ignored: boolean
          is_native: boolean
          mime_type: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_ignored?: boolean
          is_native?: boolean
          mime_type: string
        }
        Update: {
          description?: string | null
          id?: string
          is_ignored?: boolean
          is_native?: boolean
          mime_type?: string
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

