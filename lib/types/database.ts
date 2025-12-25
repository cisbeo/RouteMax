export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string;
          lat: number;
          lng: number;
          geocoded_at: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address: string;
          lat: number;
          lng: number;
          geocoded_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string;
          lat?: number;
          lng?: number;
          geocoded_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      routes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_address: string;
          start_lat: number;
          start_lng: number;
          start_datetime: string;
          end_address: string;
          end_lat: number;
          end_lng: number;
          end_datetime: string;
          total_distance_km: number | null;
          total_duration_minutes: number | null;
          total_visits: number;
          lunch_break_start_time: string | null;
          lunch_break_duration_minutes: number | null;
          vehicle_type: string;
          optimization_method: string;
          optimization_metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          start_address: string;
          start_lat: number;
          start_lng: number;
          start_datetime: string;
          end_address: string;
          end_lat: number;
          end_lng: number;
          end_datetime: string;
          total_distance_km?: number | null;
          total_duration_minutes?: number | null;
          total_visits?: number;
          lunch_break_start_time?: string | null;
          lunch_break_duration_minutes?: number | null;
          vehicle_type?: string;
          optimization_method?: string;
          optimization_metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          start_address?: string;
          start_lat?: number;
          start_lng?: number;
          start_datetime?: string;
          end_address?: string;
          end_lat?: number;
          end_lng?: number;
          end_datetime?: string;
          total_distance_km?: number | null;
          total_duration_minutes?: number | null;
          total_visits?: number;
          lunch_break_start_time?: string | null;
          lunch_break_duration_minutes?: number | null;
          vehicle_type?: string;
          optimization_method?: string;
          optimization_metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      route_stops: {
        Row: {
          id: string;
          route_id: string;
          client_id: string | null;
          address: string;
          lat: number;
          lng: number;
          stop_order: number;
          estimated_arrival: string | null;
          estimated_departure: string | null;
          duration_from_previous_minutes: number;
          distance_from_previous_km: number;
          visit_duration_minutes: number;
          is_included: boolean;
          stop_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          client_id?: string | null;
          address: string;
          lat: number;
          lng: number;
          stop_order: number;
          estimated_arrival?: string | null;
          estimated_departure?: string | null;
          duration_from_previous_minutes?: number;
          distance_from_previous_km?: number;
          visit_duration_minutes?: number;
          is_included?: boolean;
          stop_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          route_id?: string;
          client_id?: string | null;
          address?: string;
          lat?: number;
          lng?: number;
          stop_order?: number;
          estimated_arrival?: string | null;
          estimated_departure?: string | null;
          duration_from_previous_minutes?: number;
          distance_from_previous_km?: number;
          visit_duration_minutes?: number;
          is_included?: boolean;
          stop_type?: string;
          created_at?: string;
        };
      };
    };
  };
}
