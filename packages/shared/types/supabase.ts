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
          created_at: string | null
          duplicate_id: string
          hamming_distance: number
          media_id: string
          similarity_score: number
        }
        Insert: {
          created_at?: string | null
          duplicate_id: string
          hamming_distance: number
          media_id: string
          similarity_score: number
        }
        Update: {
          created_at?: string | null
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
          lens_spec: string | null
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
          lens_spec?: string | null
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
          lens_spec?: string | null
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
          file_hash: string | null
          id: string
          is_advanced_processed: boolean
          is_content_warnings_processed: boolean
          is_deleted: boolean
          is_duplicates_processed: boolean
          is_exif_processed: boolean
          is_hidden: boolean
          is_objects_processed: boolean
          is_thumbnail_processed: boolean
          media_path: string
          media_type_id: string
          size_bytes: number
          thumbnail_url: string | null
          visual_hash: string | null
        }
        Insert: {
          file_hash?: string | null
          id?: string
          is_advanced_processed?: boolean
          is_content_warnings_processed?: boolean
          is_deleted?: boolean
          is_duplicates_processed?: boolean
          is_exif_processed?: boolean
          is_hidden?: boolean
          is_objects_processed?: boolean
          is_thumbnail_processed?: boolean
          media_path: string
          media_type_id: string
          size_bytes: number
          thumbnail_url?: string | null
          visual_hash?: string | null
        }
        Update: {
          file_hash?: string | null
          id?: string
          is_advanced_processed?: boolean
          is_content_warnings_processed?: boolean
          is_deleted?: boolean
          is_duplicates_processed?: boolean
          is_exif_processed?: boolean
          is_hidden?: boolean
          is_objects_processed?: boolean
          is_thumbnail_processed?: boolean
          media_path?: string
          media_type_id?: string
          size_bytes?: number
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

