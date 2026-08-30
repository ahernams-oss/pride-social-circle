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
  public: {
    Tables: {
      access_level_audit: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_level: string
          old_level: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_level: string
          old_level: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_level?: string
          old_level?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      ballot_choices: {
        Row: {
          ballot_id: string
          candidate_id: string | null
          created_at: string
          id: string
          position_id: string | null
          value: string | null
        }
        Insert: {
          ballot_id: string
          candidate_id?: string | null
          created_at?: string
          id?: string
          position_id?: string | null
          value?: string | null
        }
        Update: {
          ballot_id?: string
          candidate_id?: string | null
          created_at?: string
          id?: string
          position_id?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ballot_choices_ballot_id_fkey"
            columns: ["ballot_id"]
            isOneToOne: false
            referencedRelation: "election_ballots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballot_choices_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "election_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballot_choices_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "election_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      club_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          city: string
          created_at: string
          created_by: string | null
          description: string
          district: string
          founded_year: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string
          district?: string
          founded_year?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string
          district?: string
          founded_year?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Relationships: []
      }
      district_roles: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "district_roles_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      election_ballots: {
        Row: {
          election_id: string
          id: string
          kiosk_session_id: string | null
          submitted_at: string
          voter_id: string
        }
        Insert: {
          election_id: string
          id?: string
          kiosk_session_id?: string | null
          submitted_at?: string
          voter_id: string
        }
        Update: {
          election_id?: string
          id?: string
          kiosk_session_id?: string | null
          submitted_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "election_ballots_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_ballots_kiosk_session_id_fkey"
            columns: ["kiosk_session_id"]
            isOneToOne: false
            referencedRelation: "kiosk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      election_candidates: {
        Row: {
          created_at: string
          description: string | null
          election_id: string
          id: string
          name: string
          order_index: number
          photo_url: string | null
          position_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          election_id: string
          id?: string
          name: string
          order_index?: number
          photo_url?: string | null
          position_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          election_id?: string
          id?: string
          name?: string
          order_index?: number
          photo_url?: string | null
          position_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "election_candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_candidates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "election_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      election_positions: {
        Row: {
          created_at: string
          election_id: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          election_id: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          election_id?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "election_positions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          allow_kiosk: boolean
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          max_choices: number
          starts_at: string | null
          status: Database["public"]["Enums"]["election_status"]
          title: string
          type: Database["public"]["Enums"]["election_type"]
          updated_at: string
        }
        Insert: {
          allow_kiosk?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          max_choices?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["election_status"]
          title: string
          type: Database["public"]["Enums"]["election_type"]
          updated_at?: string
        }
        Update: {
          allow_kiosk?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          max_choices?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["election_status"]
          title?: string
          type?: Database["public"]["Enums"]["election_type"]
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          location: string
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          location?: string
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          location?: string
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      kiosk_sessions: {
        Row: {
          active: boolean
          closed_at: string | null
          election_id: string
          id: string
          opened_at: string
          opened_by: string
        }
        Insert: {
          active?: boolean
          closed_at?: string | null
          election_id: string
          id?: string
          opened_at?: string
          opened_by: string
        }
        Update: {
          active?: boolean
          closed_at?: string | null
          election_id?: string
          id?: string
          opened_at?: string
          opened_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_sessions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_completions: {
        Row: {
          created_at: string
          id: string
          mission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_completions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          points: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          points?: number
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          points?: number
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          conversation_id: string | null
          created_at: string
          id: string
          post_id: string | null
          read: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profile_educations: {
        Row: {
          course: string
          created_at: string
          id: string
          institution: string
          level: string
          updated_at: string
          user_id: string
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          course?: string
          created_at?: string
          id?: string
          institution?: string
          level?: string
          updated_at?: string
          user_id: string
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          institution?: string
          level?: string
          updated_at?: string
          user_id?: string
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bairro: string
          bio: string
          birth_date: string | null
          cep: string
          city: string
          club_name: string
          complemento: string
          cover_url: string | null
          created_at: string
          email: string | null
          estado: string
          full_name: string
          id: string
          is_active: boolean
          logradouro: string
          numero: string
          phone: string | null
          role_in_club: string
          role_in_district: string
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bairro?: string
          bio?: string
          birth_date?: string | null
          cep?: string
          city?: string
          club_name?: string
          complemento?: string
          cover_url?: string | null
          created_at?: string
          email?: string | null
          estado?: string
          full_name?: string
          id: string
          is_active?: boolean
          logradouro?: string
          numero?: string
          phone?: string | null
          role_in_club?: string
          role_in_district?: string
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bairro?: string
          bio?: string
          birth_date?: string | null
          cep?: string
          city?: string
          club_name?: string
          complemento?: string
          cover_url?: string | null
          created_at?: string
          email?: string | null
          estado?: string
          full_name?: string
          id?: string
          is_active?: boolean
          logradouro?: string
          numero?: string
          phone?: string | null
          role_in_club?: string
          role_in_district?: string
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_activation_audit: {
        Row: {
          active: boolean
          changed_by: string | null
          created_at: string
          id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          active: boolean
          changed_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          active?: boolean
          changed_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      user_role_history: {
        Row: {
          created_at: string
          end_date: string | null
          end_year: number | null
          id: string
          role_name: string
          scope: string
          start_date: string
          start_year: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          end_year?: number | null
          id?: string
          role_name: string
          scope: string
          start_date: string
          start_year?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          end_year?: number | null
          id?: string
          role_name?: string
          scope?: string
          start_date?: string
          start_year?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vf_auditoria: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          dispositivo: string | null
          entidade: string | null
          entidade_id: string | null
          id: string
          modulo: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          dispositivo?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          modulo: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          dispositivo?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          modulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vf_candidaturas: {
        Row: {
          associado_id: string | null
          cargo: string
          created_at: string
          eleicao_id: string
          foto_url: string | null
          id: string
          nome: string
          numero: string | null
          proposta: string | null
          status: Database["public"]["Enums"]["vf_status_candidatura"]
          updated_at: string
        }
        Insert: {
          associado_id?: string | null
          cargo: string
          created_at?: string
          eleicao_id: string
          foto_url?: string | null
          id?: string
          nome: string
          numero?: string | null
          proposta?: string | null
          status?: Database["public"]["Enums"]["vf_status_candidatura"]
          updated_at?: string
        }
        Update: {
          associado_id?: string | null
          cargo?: string
          created_at?: string
          eleicao_id?: string
          foto_url?: string | null
          id?: string
          nome?: string
          numero?: string | null
          proposta?: string | null
          status?: Database["public"]["Enums"]["vf_status_candidatura"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vf_candidaturas_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vf_candidaturas_eleicao_id_fkey"
            columns: ["eleicao_id"]
            isOneToOne: false
            referencedRelation: "vf_eleicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      vf_comissao: {
        Row: {
          associado_id: string | null
          created_at: string
          eleicao_id: string
          funcao: Database["public"]["Enums"]["vf_funcao_comissao"]
          id: string
          nome: string
        }
        Insert: {
          associado_id?: string | null
          created_at?: string
          eleicao_id: string
          funcao: Database["public"]["Enums"]["vf_funcao_comissao"]
          id?: string
          nome: string
        }
        Update: {
          associado_id?: string | null
          created_at?: string
          eleicao_id?: string
          funcao?: Database["public"]["Enums"]["vf_funcao_comissao"]
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "vf_comissao_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vf_comissao_eleicao_id_fkey"
            columns: ["eleicao_id"]
            isOneToOne: false
            referencedRelation: "vf_eleicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      vf_delegados: {
        Row: {
          associado_id: string | null
          clube: string | null
          codigo_acesso: string
          created_at: string
          credenciado: boolean
          eleicao_id: string
          habilitado_votar: boolean
          id: string
          ja_votou: boolean
          nome: string
          presente: boolean
          suplente_acionado: boolean
          tipo: Database["public"]["Enums"]["vf_tipo_delegado"]
          updated_at: string
        }
        Insert: {
          associado_id?: string | null
          clube?: string | null
          codigo_acesso: string
          created_at?: string
          credenciado?: boolean
          eleicao_id: string
          habilitado_votar?: boolean
          id?: string
          ja_votou?: boolean
          nome: string
          presente?: boolean
          suplente_acionado?: boolean
          tipo?: Database["public"]["Enums"]["vf_tipo_delegado"]
          updated_at?: string
        }
        Update: {
          associado_id?: string | null
          clube?: string | null
          codigo_acesso?: string
          created_at?: string
          credenciado?: boolean
          eleicao_id?: string
          habilitado_votar?: boolean
          id?: string
          ja_votou?: boolean
          nome?: string
          presente?: boolean
          suplente_acionado?: boolean
          tipo?: Database["public"]["Enums"]["vf_tipo_delegado"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vf_delegados_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vf_delegados_eleicao_id_fkey"
            columns: ["eleicao_id"]
            isOneToOne: false
            referencedRelation: "vf_eleicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      vf_eleicoes: {
        Row: {
          created_at: string
          created_by: string | null
          data_eleicao: string
          descricao: string | null
          distrito: string | null
          id: string
          status: Database["public"]["Enums"]["vf_status_eleicao"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_eleicao: string
          descricao?: string | null
          distrito?: string | null
          id?: string
          status?: Database["public"]["Enums"]["vf_status_eleicao"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_eleicao?: string
          descricao?: string | null
          distrito?: string | null
          id?: string
          status?: Database["public"]["Enums"]["vf_status_eleicao"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      vf_votos: {
        Row: {
          candidatura_id: string | null
          cargo: string
          created_at: string
          delegado_id: string
          dispositivo: string | null
          eleicao_id: string
          id: string
          tipo: Database["public"]["Enums"]["vf_tipo_voto"]
        }
        Insert: {
          candidatura_id?: string | null
          cargo: string
          created_at?: string
          delegado_id: string
          dispositivo?: string | null
          eleicao_id: string
          id?: string
          tipo: Database["public"]["Enums"]["vf_tipo_voto"]
        }
        Update: {
          candidatura_id?: string | null
          cargo?: string
          created_at?: string
          delegado_id?: string
          dispositivo?: string | null
          eleicao_id?: string
          id?: string
          tipo?: Database["public"]["Enums"]["vf_tipo_voto"]
        }
        Relationships: [
          {
            foreignKeyName: "vf_votos_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "vf_candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vf_votos_delegado_id_fkey"
            columns: ["delegado_id"]
            isOneToOne: false
            referencedRelation: "vf_delegados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vf_votos_eleicao_id_fkey"
            columns: ["eleicao_id"]
            isOneToOne: false
            referencedRelation: "vf_eleicoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_is_active: { Args: { _user_id: string }; Returns: boolean }
      admin_set_access_level: {
        Args: { _level: string; _reason?: string; _user_id: string }
        Returns: string
      }
      admin_set_user_active: {
        Args: { _active: boolean; _reason?: string; _user_id: string }
        Returns: boolean
      }
      current_access_level: { Args: { _user_id: string }; Returns: string }
      election_results: {
        Args: { _election_id: string }
        Returns: {
          candidate_id: string
          candidate_name: string
          position_id: string
          position_name: string
          value: string
          votes: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      vf_apuracao: {
        Args: { _eleicao_id: string }
        Returns: {
          candidato: string
          candidatura_id: string
          cargo: string
          tipo: Database["public"]["Enums"]["vf_tipo_voto"]
          votos: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "member"
      election_status: "draft" | "open" | "closed"
      election_type: "single" | "yes_no" | "multiple_choice" | "multi_position"
      notification_type: "like" | "comment" | "message" | "approved" | "mention"
      profile_status: "pending" | "approved" | "rejected"
      vf_funcao_comissao: "presidente" | "vice_presidente" | "membro" | "vogal"
      vf_status_candidatura: "ativa" | "indeferida" | "desistencia"
      vf_status_eleicao:
        | "configurando"
        | "credenciamento"
        | "votacao_aberta"
        | "votacao_encerrada"
        | "apurada"
      vf_tipo_delegado: "titular" | "suplente" | "nato"
      vf_tipo_voto: "sim" | "nao" | "nulo" | "candidato"
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
  public: {
    Enums: {
      app_role: ["admin", "member"],
      election_status: ["draft", "open", "closed"],
      election_type: ["single", "yes_no", "multiple_choice", "multi_position"],
      notification_type: ["like", "comment", "message", "approved", "mention"],
      profile_status: ["pending", "approved", "rejected"],
      vf_funcao_comissao: ["presidente", "vice_presidente", "membro", "vogal"],
      vf_status_candidatura: ["ativa", "indeferida", "desistencia"],
      vf_status_eleicao: [
        "configurando",
        "credenciamento",
        "votacao_aberta",
        "votacao_encerrada",
        "apurada",
      ],
      vf_tipo_delegado: ["titular", "suplente", "nato"],
      vf_tipo_voto: ["sim", "nao", "nulo", "candidato"],
    },
  },
} as const
