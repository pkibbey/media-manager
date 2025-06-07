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
          adult_content: boolean | null
          analysis_process: string | null
          confidence_score: number | null
          created_at: string | null
          faces: Json | null
          id: string
          image_description: string | null
          keywords: string[] | null
          media_id: string
          medical_content: boolean | null
          objects: Json | null
          racy_content: boolean | null
          spoofed: boolean | null
          tags: Json | null
          text: string | null
          updated_at: string | null
          violence: boolean | null
        }
        Insert: {
          adult_content?: boolean | null
          analysis_process?: string | null
          confidence_score?: number | null
          created_at?: string | null
          faces?: Json | null
          id?: string
          image_description?: string | null
          keywords?: string[] | null
          media_id: string
          medical_content?: boolean | null
          objects?: Json | null
          racy_content?: boolean | null
          spoofed?: boolean | null
          tags?: Json | null
          text?: string | null
          updated_at?: string | null
          violence?: boolean | null
        }
        Update: {
          adult_content?: boolean | null
          analysis_process?: string | null
          confidence_score?: number | null
          created_at?: string | null
          faces?: Json | null
          id?: string
          image_description?: string | null
          keywords?: string[] | null
          media_id?: string
          medical_content?: boolean | null
          objects?: Json | null
          racy_content?: boolean | null
          spoofed?: boolean | null
          tags?: Json | null
          text?: string | null
          updated_at?: string | null
          violence?: boolean | null
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
          created_at: string | null
          duplicate_id: string
          hamming_distance: number | null
          id: string
          media_id: string
          similarity_score: number | null
        }
        Insert: {
          created_at?: string | null
          duplicate_id: string
          hamming_distance?: number | null
          id?: string
          media_id: string
          similarity_score?: number | null
        }
        Update: {
          created_at?: string | null
          duplicate_id?: string
          hamming_distance?: number | null
          id?: string
          media_id?: string
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "duplicates_duplicate_id_fkey"
            columns: ["duplicate_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicates_media_id_fkey"
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
          color_space: string | null
          created_at: string | null
          depth_of_field: string | null
          digital_zoom_ratio: string | null
          exif_process: string | null
          exif_timestamp: string | null
          exposure_bias: number | null
          exposure_mode: string | null
          exposure_program: string | null
          exposure_time: string | null
          field_of_view: string | null
          fix_date_process: string | null
          flash: string | null
          focal_length_35mm: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          height: number | null
          id: string
          iso: number | null
          lens_id: string | null
          lens_model: string | null
          light_source: string | null
          media_id: string
          metering_mode: string | null
          orientation: number | null
          scene_capture_type: string | null
          shutter_speed: string | null
          subject_distance: number | null
          updated_at: string | null
          white_balance: string | null
          width: number | null
        }
        Insert: {
          aperture?: number | null
          camera_make?: string | null
          camera_model?: string | null
          color_space?: string | null
          created_at?: string | null
          depth_of_field?: string | null
          digital_zoom_ratio?: string | null
          exif_process?: string | null
          exif_timestamp?: string | null
          exposure_bias?: number | null
          exposure_mode?: string | null
          exposure_program?: string | null
          exposure_time?: string | null
          field_of_view?: string | null
          fix_date_process?: string | null
          flash?: string | null
          focal_length_35mm?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          height?: number | null
          id?: string
          iso?: number | null
          lens_id?: string | null
          lens_model?: string | null
          light_source?: string | null
          media_id: string
          metering_mode?: string | null
          orientation?: number | null
          scene_capture_type?: string | null
          shutter_speed?: string | null
          subject_distance?: number | null
          updated_at?: string | null
          white_balance?: string | null
          width?: number | null
        }
        Update: {
          aperture?: number | null
          camera_make?: string | null
          camera_model?: string | null
          color_space?: string | null
          created_at?: string | null
          depth_of_field?: string | null
          digital_zoom_ratio?: string | null
          exif_process?: string | null
          exif_timestamp?: string | null
          exposure_bias?: number | null
          exposure_mode?: string | null
          exposure_program?: string | null
          exposure_time?: string | null
          field_of_view?: string | null
          fix_date_process?: string | null
          flash?: string | null
          focal_length_35mm?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          height?: number | null
          id?: string
          iso?: number | null
          lens_id?: string | null
          lens_model?: string | null
          light_source?: string | null
          media_id?: string
          metering_mode?: string | null
          orientation?: number | null
          scene_capture_type?: string | null
          shutter_speed?: string | null
          subject_distance?: number | null
          updated_at?: string | null
          white_balance?: string | null
          width?: number | null
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
          blurry_photo_process: string | null
          created_at: string
          id: string
          is_deleted: boolean
          is_hidden: boolean
          media_path: string
          media_type_id: string
          size_bytes: number
          thumbnail_process: string | null
          thumbnail_url: string | null
          updated_at: string | null
          visual_hash: string | null
        }
        Insert: {
          blurry_photo_process?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_hidden?: boolean
          media_path: string
          media_type_id: string
          size_bytes: number
          thumbnail_process?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          visual_hash?: string | null
        }
        Update: {
          blurry_photo_process?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_hidden?: boolean
          media_path?: string
          media_type_id?: string
          size_bytes?: number
          thumbnail_process?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          visual_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_media_type_id_fkey"
            columns: ["media_type_id"]
            isOneToOne: false
            referencedRelation: "media_types"
            referencedColumns: ["id"]
          },
        ]
      }
      media_types: {
        Row: {
          id: string
          is_ignored: boolean | null
          is_native: boolean | null
          mime_type: string
        }
        Insert: {
          id?: string
          is_ignored?: boolean | null
          is_native?: boolean | null
          mime_type: string
        }
        Update: {
          id?: string
          is_ignored?: boolean | null
          is_native?: boolean | null
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

