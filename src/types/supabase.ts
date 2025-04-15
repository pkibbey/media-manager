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
      file_types: {
        Row: {
          id: number;
          extension: string;
          mime_type: string | null;
          category: string;
          can_display_natively: boolean;
          needs_conversion: boolean;
          ignore: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          extension: string;
          mime_type?: string | null;
          category: string;
          can_display_natively?: boolean;
          needs_conversion?: boolean;
          ignore?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          extension?: string;
          mime_type?: string | null;
          category?: string;
          can_display_natively?: boolean;
          needs_conversion?: boolean;
          ignore?: boolean;
          created_at?: string;
        };
      };
      media_items: {
        Row: {
          id: string;
          file_path: string;
          file_name: string;
          extension: string;
          folder_path: string;
          size_bytes: number;
          created_date: string | null;
          modified_date: string;
          media_date: string | null;
          has_exif: boolean;
          exif_data: Json | null;
          thumbnail_path: string | null;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          processed: boolean;
          organized: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          file_path: string;
          file_name: string;
          extension: string;
          folder_path: string;
          size_bytes: number;
          created_date?: string | null;
          modified_date: string;
          media_date?: string | null;
          has_exif?: boolean;
          exif_data?: Json | null;
          thumbnail_path?: string | null;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          processed?: boolean;
          organized?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          file_path?: string;
          file_name?: string;
          extension?: string;
          folder_path?: string;
          size_bytes?: number;
          created_date?: string | null;
          modified_date?: string;
          media_date?: string | null;
          has_exif?: boolean;
          exif_data?: Json | null;
          thumbnail_path?: string | null;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          processed?: boolean;
          organized?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      scan_folders: {
        Row: {
          id: number;
          path: string;
          include_subfolders: boolean;
          last_scanned: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          path: string;
          include_subfolders?: boolean;
          last_scanned?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          path?: string;
          include_subfolders?: boolean;
          last_scanned?: string | null;
          created_at?: string;
        };
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

// Type shortcuts for our tables
export type FileType = Database['public']['Tables']['file_types']['Row'];
export type MediaItem = Database['public']['Tables']['media_items']['Row'];
export type ScanFolder = Database['public']['Tables']['scan_folders']['Row'];
