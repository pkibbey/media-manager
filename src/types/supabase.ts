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
          can_display_natively: boolean | null;
          category: string;
          created_at: string;
          extension: string;
          id: number;
          ignore: boolean | null;
          mime_type: string | null;
          needs_conversion: boolean | null;
        };
        Insert: {
          can_display_natively?: boolean | null;
          category: string;
          created_at?: string;
          extension: string;
          id?: number;
          ignore?: boolean | null;
          mime_type?: string | null;
          needs_conversion?: boolean | null;
        };
        Update: {
          can_display_natively?: boolean | null;
          category?: string;
          created_at?: string;
          extension?: string;
          id?: number;
          ignore?: boolean | null;
          mime_type?: string | null;
          needs_conversion?: boolean | null;
        };
        Relationships: [];
      };
      media_items: {
        Row: {
          created_date: string | null;
          exif_data: Json | null;
          file_name: string;
          file_path: string;
          file_type_id: number;
          folder_path: string;
          id: string;
          media_date: string | null;
          modified_date: string;
          size_bytes: number;
          thumbnail_path: string | null;
        };
        Insert: {
          created_date?: string | null;
          exif_data?: Json | null;
          file_name: string;
          file_path: string;
          file_type_id: number;
          folder_path: string;
          id?: string;
          media_date?: string | null;
          modified_date: string;
          size_bytes: number;
          thumbnail_path?: string | null;
        };
        Update: {
          created_date?: string | null;
          exif_data?: Json | null;
          file_name?: string;
          file_path?: string;
          file_type_id?: number;
          folder_path?: string;
          id?: string;
          media_date?: string | null;
          modified_date?: string;
          size_bytes?: number;
          thumbnail_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'media_items_file_type_id_fkey';
            columns: ['file_type_id'];
            isOneToOne: false;
            referencedRelation: 'file_types';
            referencedColumns: ['id'];
          },
        ];
      };
      processing_states: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: number;
          media_item_id: string | null;
          processed_at: string | null;
          status: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: number;
          media_item_id?: string | null;
          processed_at?: string | null;
          status: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: number;
          media_item_id?: string | null;
          processed_at?: string | null;
          status?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'processing_states_media_item_id_fkey';
            columns: ['media_item_id'];
            isOneToOne: false;
            referencedRelation: 'media_items';
            referencedColumns: ['id'];
          },
        ];
      };
      scan_folders: {
        Row: {
          created_at: string;
          id: number;
          include_subfolders: boolean | null;
          last_scanned: string | null;
          path: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          include_subfolders?: boolean | null;
          last_scanned?: string | null;
          path: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          include_subfolders?: boolean | null;
          last_scanned?: string | null;
          path?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      count_compatible_media_items: {
        Args: { compatible_extensions?: string[] };
        Returns: {
          total_count: number;
          by_extension: Json;
        }[];
      };
      count_folder_media: {
        Args: { target_folder: string; include_subfolders: boolean };
        Returns: {
          current_folder_count: number;
          subfolder_count: number;
        }[];
      };
      count_unprocessed_exif_files: {
        Args: { exif_supported_ids: number[]; ignored_ids?: number[] };
        Returns: number;
      };
      get_exif_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total: number;
          success: number;
          failed: number;
          skipped: number;
        }[];
      };
      get_extension_statistics: {
        Args: Record<PropertyKey, never>;
        Returns: {
          extension: string;
          count: number;
          category: string;
        }[];
      };
      get_media_statistics: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_count: number;
          total_size_bytes: number;
          processed_count: number;
          unprocessed_count: number;
          organized_count: number;
          unorganized_count: number;
        }[];
      };
      get_unprocessed_exif_files: {
        Args: {
          exif_supported_ids: number[];
          ignored_ids?: number[];
          page_number?: number;
          page_size?: number;
        };
        Returns: {
          id: string;
          file_path: string;
          file_type_id: number;
          file_name: string;
        }[];
      };
      sum_file_sizes: {
        Args: Record<PropertyKey, never>;
        Returns: {
          sum: number;
        }[];
      };
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
