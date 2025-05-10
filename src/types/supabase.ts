export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      analysis_data: {
        Row: {
          colors: string[];
          created_date: string;
          faces: Json[];
          id: string;
          image_description: string | null;
          media_id: string;
          objects: Json[];
          quality_score: number;
          safety_level: number;
          scene_types: string[];
          sentiment: number;
          tags: string[];
        };
        Insert: {
          colors?: string[];
          created_date?: string;
          faces?: Json[];
          id: string;
          image_description?: string | null;
          media_id: string;
          objects?: Json[];
          quality_score?: number;
          safety_level?: number;
          scene_types?: string[];
          sentiment?: number;
          tags?: string[];
        };
        Update: {
          colors?: string[];
          created_date?: string;
          faces?: Json[];
          id?: string;
          image_description?: string | null;
          media_id?: string;
          objects?: Json[];
          quality_score?: number;
          safety_level?: number;
          scene_types?: string[];
          sentiment?: number;
          tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'analysis_results_file_id_fkey';
            columns: ['media_id'];
            isOneToOne: true;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
        ];
      };
      exif_data: {
        Row: {
          aperture: number | null;
          camera_make: string | null;
          camera_model: string | null;
          created_date: string;
          depth_of_field: string | null;
          digital_zoom_ratio: number | null;
          exif_timestamp: string | null;
          exposure_time: string | null;
          field_of_view: string | null;
          flash: string | null;
          focal_length_35mm: number | null;
          gps_latitude: number | null;
          gps_longitude: number | null;
          height: number;
          id: string;
          iso: number | null;
          lens_id: string | null;
          lens_spec: string | null;
          light_source: string | null;
          media_id: string;
          metering_mode: string | null;
          orientation: number | null;
          scene_capture_type: string | null;
          subject_distance: number | null;
          width: number;
        };
        Insert: {
          aperture?: number | null;
          camera_make?: string | null;
          camera_model?: string | null;
          created_date?: string;
          depth_of_field?: string | null;
          digital_zoom_ratio?: number | null;
          exif_timestamp?: string | null;
          exposure_time?: string | null;
          field_of_view?: string | null;
          flash?: string | null;
          focal_length_35mm?: number | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          height: number;
          id: string;
          iso?: number | null;
          lens_id?: string | null;
          lens_spec?: string | null;
          light_source?: string | null;
          media_id: string;
          metering_mode?: string | null;
          orientation?: number | null;
          scene_capture_type?: string | null;
          subject_distance?: number | null;
          width?: number;
        };
        Update: {
          aperture?: number | null;
          camera_make?: string | null;
          camera_model?: string | null;
          created_date?: string;
          depth_of_field?: string | null;
          digital_zoom_ratio?: number | null;
          exif_timestamp?: string | null;
          exposure_time?: string | null;
          field_of_view?: string | null;
          flash?: string | null;
          focal_length_35mm?: number | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          height?: number;
          id?: string;
          iso?: number | null;
          lens_id?: string | null;
          lens_spec?: string | null;
          light_source?: string | null;
          media_id?: string;
          metering_mode?: string | null;
          orientation?: number | null;
          scene_capture_type?: string | null;
          subject_distance?: number | null;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'exif_data_file_id_fkey';
            columns: ['media_id'];
            isOneToOne: true;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
        ];
      };
      media: {
        Row: {
          created_date: string;
          id: string;
          is_analysis_processed: boolean;
          is_deleted: boolean;
          is_exif_processed: boolean;
          is_hidden: boolean;
          is_thumbnail_processed: boolean;
          media_path: string;
          media_type_id: string;
          size_bytes: number;
        };
        Insert: {
          created_date?: string;
          id: string;
          is_analysis_processed?: boolean;
          is_deleted?: boolean;
          is_exif_processed?: boolean;
          is_hidden?: boolean;
          is_thumbnail_processed?: boolean;
          media_path: string;
          media_type_id: string;
          size_bytes: number;
        };
        Update: {
          created_date?: string;
          id?: string;
          is_analysis_processed?: boolean;
          is_deleted?: boolean;
          is_exif_processed?: boolean;
          is_hidden?: boolean;
          is_thumbnail_processed?: boolean;
          media_path?: string;
          media_type_id?: string;
          size_bytes?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'files_file_type_id_fkey';
            columns: ['media_type_id'];
            isOneToOne: false;
            referencedRelation: 'media_types';
            referencedColumns: ['id'];
          },
        ];
      };
      media_types: {
        Row: {
          created_date: string;
          id: string;
          is_ignored: boolean;
          is_native: boolean;
          mime_type: string | null;
          type_description: string | null;
          type_name: string;
        };
        Insert: {
          created_date?: string;
          id: string;
          is_ignored?: boolean;
          is_native?: boolean;
          mime_type?: string | null;
          type_description?: string | null;
          type_name: string;
        };
        Update: {
          created_date?: string;
          id?: string;
          is_ignored?: boolean;
          is_native?: boolean;
          mime_type?: string | null;
          type_description?: string | null;
          type_name?: string;
        };
        Relationships: [];
      };
      thumbnail_data: {
        Row: {
          created_date: string;
          id: string;
          media_id: string;
          thumbnail_url: string;
        };
        Insert: {
          created_date?: string;
          id: string;
          media_id: string;
          thumbnail_url: string;
        };
        Update: {
          created_date?: string;
          id?: string;
          media_id?: string;
          thumbnail_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'thumbnails_file_id_fkey';
            columns: ['media_id'];
            isOneToOne: true;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
