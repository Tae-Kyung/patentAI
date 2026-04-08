export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'user' | 'mentor' | 'institution' | 'admin'
export type Locale = 'ko' | 'en' | 'ja' | 'zh'
export type Theme = 'light' | 'dark' | 'system'
export type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type ProjectType = 'pre_startup' | 'startup'
export type SupportType = 'personal' | 'institutional'
export type ProgramStatus = 'preparing' | 'active' | 'completed' | 'archived'
export type InstitutionType = 'center' | 'university' | 'other'
export type InstitutionRole = 'manager' | 'staff'
export type MentorPoolStatus = 'active' | 'inactive'
export type MappingStatus = 'pending' | 'approved' | 'rejected' | 'completed'
export type MentorMatchRole = 'primary' | 'secondary'
export type MentorMatchStatus = 'assigned' | 'in_progress' | 'review' | 'completed' | 'cancelled'
export type SessionType = 'review' | 'feedback' | 'revision' | 'final'
export type SessionStatus = 'draft' | 'submitted' | 'acknowledged'
export type ReportStatus = 'draft' | 'submitted' | 'confirmed' | 'rejected'
export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'cancelled'
export type FeedbackSource = 'general' | 'mentoring' | 'institution'
export type MessageRecipientType = 'mentors' | 'applicants' | 'all' | 'custom'
export type ProjectStage = 'idea' | 'evaluation' | 'document' | 'deploy' | 'done'
export type GateStatus = 'gate_1' | 'gate_2' | 'gate_3' | 'gate_4' | 'completed'
export type DocumentType = 'business_plan' | 'pitch' | 'landing' | 'ppt' | 'ppt_image' | 'leaflet' | 'infographic' | 'gtm_checklist' | 'startup_application' | 'u300_plan'
export type FeedbackType = 'comment' | 'approval' | 'rejection' | 'revision_request'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'
export type PromptCategory = 'ideation' | 'evaluation' | 'document' | 'marketing' | 'startup' | 'mentoring'

// PatentAI 전용 타입
export type PatentStatus = 'draft' | 'step1_done' | 'step2_done' | 'step3_done' | 'step4_done' | 'step5_done' | 'completed'
export type PatentInputType = 'idea' | 'prd' | 'paper' | 'mixed'
export type PatentClaimType = 'independent' | 'dependent'
export type PatentSectionType = 'title' | 'tech_field' | 'background' | 'problem' | 'solution' | 'effect' | 'drawing_desc' | 'detailed_desc' | 'abstract'
export type PatentDrawingType = 'system_architecture' | 'flowchart' | 'ui_wireframe' | 'data_flow' | 'other'
export type PriorArtRisk = 'high' | 'medium' | 'low'
export type PriorArtSource = 'kipris' | 'uspto'
export type PatentGateStatus = 'pending' | 'approved' | 'returned'

export interface Database {
  public: {
    Tables: {
      bi_users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: UserRole
          locale: Locale
          theme: Theme
          ai_credits: number
          is_approved: boolean
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: UserRole
          locale?: Locale
          theme?: Theme
          ai_credits?: number
          is_approved?: boolean
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: UserRole
          locale?: Locale
          theme?: Theme
          ai_credits?: number
          is_approved?: boolean
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_credit_logs: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance_after: number
          reason: string
          project_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          balance_after: number
          reason: string
          project_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          balance_after?: number
          reason?: string
          project_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bi_projects: {
        Row: {
          id: string
          user_id: string
          name: string
          project_type: ProjectType
          status: ProjectStatus
          current_stage: ProjectStage
          current_gate: GateStatus
          gate_1_passed_at: string | null
          gate_2_passed_at: string | null
          gate_3_passed_at: string | null
          gate_4_passed_at: string | null
          mentor_approval_required: boolean
          assigned_mentor_id: string | null
          visibility: 'public' | 'summary' | 'private'
          industry_tags: string[] | null
          support_type: SupportType
          program_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          project_type?: ProjectType
          status?: ProjectStatus
          current_stage?: ProjectStage
          current_gate?: GateStatus
          gate_1_passed_at?: string | null
          gate_2_passed_at?: string | null
          gate_3_passed_at?: string | null
          gate_4_passed_at?: string | null
          mentor_approval_required?: boolean
          assigned_mentor_id?: string | null
          visibility?: 'public' | 'summary' | 'private'
          industry_tags?: string[] | null
          support_type?: SupportType
          program_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          project_type?: ProjectType
          status?: ProjectStatus
          current_stage?: ProjectStage
          current_gate?: GateStatus
          gate_1_passed_at?: string | null
          gate_2_passed_at?: string | null
          gate_3_passed_at?: string | null
          gate_4_passed_at?: string | null
          mentor_approval_required?: boolean
          assigned_mentor_id?: string | null
          visibility?: 'public' | 'summary' | 'private'
          industry_tags?: string[] | null
          support_type?: SupportType
          program_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_idea_cards: {
        Row: {
          id: string
          project_id: string
          raw_input: string
          problem: string | null
          solution: string | null
          target: string | null
          differentiation: string | null
          uvp: string | null
          channels: string | null
          revenue_streams: string | null
          cost_structure: string | null
          key_metrics: string | null
          similar_companies: Json | null
          ai_expanded: Json | null
          ai_model_used: string
          is_confirmed: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          revision_count: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          raw_input: string
          problem?: string | null
          solution?: string | null
          target?: string | null
          differentiation?: string | null
          uvp?: string | null
          channels?: string | null
          revenue_streams?: string | null
          cost_structure?: string | null
          key_metrics?: string | null
          similar_companies?: Json | null
          ai_expanded?: Json | null
          ai_model_used?: string
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          revision_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          raw_input?: string
          problem?: string | null
          solution?: string | null
          target?: string | null
          differentiation?: string | null
          uvp?: string | null
          channels?: string | null
          revenue_streams?: string | null
          cost_structure?: string | null
          key_metrics?: string | null
          similar_companies?: Json | null
          ai_expanded?: Json | null
          ai_model_used?: string
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          revision_count?: number
          created_at?: string
        }
        Relationships: []
      }
      bi_evaluations: {
        Row: {
          id: string
          project_id: string
          investor_score: number | null
          investor_feedback: string | null
          investor_ai_model: string
          market_score: number | null
          market_feedback: string | null
          market_ai_model: string
          tech_score: number | null
          tech_feedback: string | null
          tech_ai_model: string
          total_score: number | null
          recommendations: Json | null
          debate_enabled: boolean
          debate_rounds: number
          debate_log: Json | null
          is_confirmed: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          dispute_comment: string | null
          reevaluation_count: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          investor_score?: number | null
          investor_feedback?: string | null
          investor_ai_model?: string
          market_score?: number | null
          market_feedback?: string | null
          market_ai_model?: string
          tech_score?: number | null
          tech_feedback?: string | null
          tech_ai_model?: string
          total_score?: number | null
          recommendations?: Json | null
          debate_enabled?: boolean
          debate_rounds?: number
          debate_log?: Json | null
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          dispute_comment?: string | null
          reevaluation_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          investor_score?: number | null
          investor_feedback?: string | null
          investor_ai_model?: string
          market_score?: number | null
          market_feedback?: string | null
          market_ai_model?: string
          tech_score?: number | null
          tech_feedback?: string | null
          tech_ai_model?: string
          total_score?: number | null
          recommendations?: Json | null
          debate_enabled?: boolean
          debate_rounds?: number
          debate_log?: Json | null
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          dispute_comment?: string | null
          reevaluation_count?: number
          created_at?: string
        }
        Relationships: []
      }
      bi_documents: {
        Row: {
          id: string
          project_id: string
          type: DocumentType
          title: string
          content: string | null
          storage_path: string | null
          file_name: string | null
          ai_model_used: string
          is_confirmed: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          revision_requests: Json | null
          revision_count: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: DocumentType
          title: string
          content?: string | null
          storage_path?: string | null
          file_name?: string | null
          ai_model_used?: string
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          revision_requests?: Json | null
          revision_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: DocumentType
          title?: string
          content?: string | null
          storage_path?: string | null
          file_name?: string | null
          ai_model_used?: string
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          revision_requests?: Json | null
          revision_count?: number
          created_at?: string
        }
        Relationships: []
      }
      bi_feedbacks: {
        Row: {
          id: string
          project_id: string
          user_id: string
          stage: ProjectStage
          gate: GateStatus | null
          feedback_type: FeedbackType
          comment: string
          is_resolved: boolean
          resolved_at: string | null
          session_id: string | null
          feedback_source: FeedbackSource
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          stage: ProjectStage
          gate?: GateStatus | null
          feedback_type?: FeedbackType
          comment: string
          is_resolved?: boolean
          resolved_at?: string | null
          session_id?: string | null
          feedback_source?: FeedbackSource
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          stage?: ProjectStage
          gate?: GateStatus | null
          feedback_type?: FeedbackType
          comment?: string
          is_resolved?: boolean
          resolved_at?: string | null
          session_id?: string | null
          feedback_source?: FeedbackSource
          parent_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bi_approvals: {
        Row: {
          id: string
          project_id: string
          gate: GateStatus
          requested_by: string
          requested_at: string
          request_comment: string | null
          approved_by: string | null
          approved_at: string | null
          approval_comment: string | null
          status: ApprovalStatus
          rejection_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          gate: GateStatus
          requested_by: string
          requested_at?: string
          request_comment?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_comment?: string | null
          status?: ApprovalStatus
          rejection_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          gate?: GateStatus
          requested_by?: string
          requested_at?: string
          request_comment?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_comment?: string | null
          status?: ApprovalStatus
          rejection_reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bi_prompts: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          category: PromptCategory
          system_prompt: string
          user_prompt_template: string
          model: string
          temperature: number
          max_tokens: number
          credit_cost: number
          version: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          category: PromptCategory
          system_prompt: string
          user_prompt_template: string
          model?: string
          temperature?: number
          max_tokens?: number
          credit_cost?: number
          version?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          category?: PromptCategory
          system_prompt?: string
          user_prompt_template?: string
          model?: string
          temperature?: number
          max_tokens?: number
          credit_cost?: number
          version?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bi_prompt_versions: {
        Row: {
          id: string
          prompt_id: string
          version: number
          system_prompt: string
          user_prompt_template: string
          model: string
          temperature: number | null
          max_tokens: number | null
          change_note: string | null
          changed_by: string | null
          created_at: string
          usage_count: number
          avg_rating: number | null
        }
        Insert: {
          id?: string
          prompt_id: string
          version: number
          system_prompt: string
          user_prompt_template: string
          model: string
          temperature?: number | null
          max_tokens?: number | null
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          usage_count?: number
          avg_rating?: number | null
        }
        Update: {
          id?: string
          prompt_id?: string
          version?: number
          system_prompt?: string
          user_prompt_template?: string
          model?: string
          temperature?: number | null
          max_tokens?: number | null
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          usage_count?: number
          avg_rating?: number | null
        }
        Relationships: []
      }
      bi_business_reviews: {
        Row: {
          id: string
          project_id: string
          business_plan_text: string | null
          company_name: string | null
          industry: string | null
          founded_year: number | null
          employee_count: number | null
          annual_revenue: string | null
          funding_stage: string | null
          ai_review: Json | null
          review_score: number | null
          swot_analysis: Json | null
          diagnosis_result: Json | null
          strategy_result: Json | null
          action_items: Json | null
          report_content: string | null
          executive_summary: string | null
          is_review_confirmed: boolean
          review_confirmed_at: string | null
          is_diagnosis_confirmed: boolean
          diagnosis_confirmed_at: string | null
          is_strategy_confirmed: boolean
          strategy_confirmed_at: string | null
          ai_model_used: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          business_plan_text?: string | null
          company_name?: string | null
          industry?: string | null
          founded_year?: number | null
          employee_count?: number | null
          annual_revenue?: string | null
          funding_stage?: string | null
          ai_review?: Json | null
          review_score?: number | null
          swot_analysis?: Json | null
          diagnosis_result?: Json | null
          strategy_result?: Json | null
          action_items?: Json | null
          report_content?: string | null
          executive_summary?: string | null
          is_review_confirmed?: boolean
          review_confirmed_at?: string | null
          is_diagnosis_confirmed?: boolean
          diagnosis_confirmed_at?: string | null
          is_strategy_confirmed?: boolean
          strategy_confirmed_at?: string | null
          ai_model_used?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          business_plan_text?: string | null
          company_name?: string | null
          industry?: string | null
          founded_year?: number | null
          employee_count?: number | null
          annual_revenue?: string | null
          funding_stage?: string | null
          ai_review?: Json | null
          review_score?: number | null
          swot_analysis?: Json | null
          diagnosis_result?: Json | null
          strategy_result?: Json | null
          action_items?: Json | null
          report_content?: string | null
          executive_summary?: string | null
          is_review_confirmed?: boolean
          review_confirmed_at?: string | null
          is_diagnosis_confirmed?: boolean
          diagnosis_confirmed_at?: string | null
          is_strategy_confirmed?: boolean
          strategy_confirmed_at?: string | null
          ai_model_used?: string
          created_at?: string
        }
        Relationships: []
      }
      bi_prompt_variables: {
        Row: {
          id: string
          prompt_id: string
          variable_name: string
          description: string | null
          is_required: boolean
          default_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prompt_id: string
          variable_name: string
          description?: string | null
          is_required?: boolean
          default_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prompt_id?: string
          variable_name?: string
          description?: string | null
          is_required?: boolean
          default_value?: string | null
          created_at?: string
        }
        Relationships: []
      }
      // ============================================
      // 확장판 (모두의 창업) 신규 테이블
      // ============================================
      bi_programs: {
        Row: {
          id: string
          name: string
          year: number
          round: number
          description: string | null
          start_date: string | null
          end_date: string | null
          status: ProgramStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          year: number
          round?: number
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: ProgramStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          year?: number
          round?: number
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: ProgramStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_institutions: {
        Row: {
          id: string
          name: string
          region: string
          type: InstitutionType
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          is_approved: boolean
          approved_at: string | null
          approved_by: string | null
          max_mentors: number
          max_projects: number
          session_unit_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          region: string
          type?: InstitutionType
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          is_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          max_mentors?: number
          max_projects?: number
          session_unit_price?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          region?: string
          type?: InstitutionType
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          is_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          max_mentors?: number
          max_projects?: number
          session_unit_price?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_institution_members: {
        Row: {
          id: string
          user_id: string
          institution_id: string
          role_in_institution: InstitutionRole
          is_approved: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          institution_id: string
          role_in_institution?: InstitutionRole
          is_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          institution_id?: string
          role_in_institution?: InstitutionRole
          is_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bi_mentor_profiles: {
        Row: {
          user_id: string
          resume_url: string | null
          bank_account_url: string | null
          bank_name: string | null
          account_number_masked: string | null
          account_number_encrypted: string | null
          account_holder: string | null
          specialty: string[]
          career_summary: string | null
          is_approved: boolean
          approved_at: string | null
          approved_by: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          resume_url?: string | null
          bank_account_url?: string | null
          bank_name?: string | null
          account_number_masked?: string | null
          account_number_encrypted?: string | null
          account_holder?: string | null
          specialty?: string[]
          career_summary?: string | null
          is_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          resume_url?: string | null
          bank_account_url?: string | null
          bank_name?: string | null
          account_number_masked?: string | null
          account_number_encrypted?: string | null
          account_holder?: string | null
          specialty?: string[]
          career_summary?: string | null
          is_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_mentor_institution_pool: {
        Row: {
          id: string
          mentor_id: string
          institution_id: string
          registered_by: string | null
          status: MentorPoolStatus
          created_at: string
        }
        Insert: {
          id?: string
          mentor_id: string
          institution_id: string
          registered_by?: string | null
          status?: MentorPoolStatus
          created_at?: string
        }
        Update: {
          id?: string
          mentor_id?: string
          institution_id?: string
          registered_by?: string | null
          status?: MentorPoolStatus
          created_at?: string
        }
        Relationships: []
      }
      bi_project_institution_maps: {
        Row: {
          id: string
          project_id: string
          institution_id: string
          program_id: string | null
          status: MappingStatus
          mapped_by: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          institution_id: string
          program_id?: string | null
          status?: MappingStatus
          mapped_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          institution_id?: string
          program_id?: string | null
          status?: MappingStatus
          mapped_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bi_mentor_matches: {
        Row: {
          id: string
          project_id: string
          mentor_id: string
          institution_id: string
          program_id: string | null
          mentor_role: MentorMatchRole
          status: MentorMatchStatus
          unit_price: number
          matched_by: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          mentor_id: string
          institution_id: string
          program_id?: string | null
          mentor_role?: MentorMatchRole
          status?: MentorMatchStatus
          unit_price?: number
          matched_by?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          mentor_id?: string
          institution_id?: string
          program_id?: string | null
          mentor_role?: MentorMatchRole
          status?: MentorMatchStatus
          unit_price?: number
          matched_by?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_mentoring_sessions: {
        Row: {
          id: string
          match_id: string
          round_number: number
          session_type: SessionType
          comments: Json
          revision_summary: string | null
          session_date: string | null
          duration_minutes: number | null
          status: SessionStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          round_number?: number
          session_type?: SessionType
          comments?: Json
          revision_summary?: string | null
          session_date?: string | null
          duration_minutes?: number | null
          status?: SessionStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          round_number?: number
          session_type?: SessionType
          comments?: Json
          revision_summary?: string | null
          session_date?: string | null
          duration_minutes?: number | null
          status?: SessionStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_mentoring_reports: {
        Row: {
          id: string
          match_id: string
          mentor_opinion: string | null
          strengths: string | null
          improvements: string | null
          overall_rating: number | null
          ai_summary: string | null
          ai_generated_report: string | null
          status: ReportStatus
          submitted_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          mentor_opinion?: string | null
          strengths?: string | null
          improvements?: string | null
          overall_rating?: number | null
          ai_summary?: string | null
          ai_generated_report?: string | null
          status?: ReportStatus
          submitted_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          mentor_opinion?: string | null
          strengths?: string | null
          improvements?: string | null
          overall_rating?: number | null
          ai_summary?: string | null
          ai_generated_report?: string | null
          status?: ReportStatus
          submitted_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_mentor_payouts: {
        Row: {
          id: string
          report_id: string
          mentor_id: string
          institution_id: string
          program_id: string | null
          amount: number | null
          total_sessions: number | null
          total_hours: number | null
          status: PayoutStatus
          approved_by: string | null
          approved_at: string | null
          paid_at: string | null
          payment_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          report_id: string
          mentor_id: string
          institution_id: string
          program_id?: string | null
          amount?: number | null
          total_sessions?: number | null
          total_hours?: number | null
          status?: PayoutStatus
          approved_by?: string | null
          approved_at?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          mentor_id?: string
          institution_id?: string
          program_id?: string | null
          amount?: number | null
          total_sessions?: number | null
          total_hours?: number | null
          status?: PayoutStatus
          approved_by?: string | null
          approved_at?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string | null
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      bi_messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          institution_id: string | null
          project_id: string | null
          thread_id: string | null
          subject: string | null
          content: string
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          institution_id?: string | null
          project_id?: string | null
          thread_id?: string | null
          subject?: string | null
          content: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          institution_id?: string | null
          project_id?: string | null
          thread_id?: string | null
          subject?: string | null
          content?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bi_message_batches: {
        Row: {
          id: string
          sender_id: string
          institution_id: string
          subject: string
          content: string
          recipient_type: MessageRecipientType
          recipient_count: number
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          institution_id: string
          subject: string
          content: string
          recipient_type: MessageRecipientType
          recipient_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          institution_id?: string
          subject?: string
          content?: string
          recipient_type?: MessageRecipientType
          recipient_count?: number
          created_at?: string
        }
        Relationships: []
      }
      bi_audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ─── PatentAI 전용 테이블 ───────────────────────────────────────
      patentai_prompts: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          category: string
          system_prompt: string
          user_prompt_template: string
          model: string
          temperature: number
          max_tokens: number
          credit_cost: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          category?: string
          system_prompt: string
          user_prompt_template: string
          model?: string
          temperature?: number
          max_tokens?: number
          credit_cost?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          category?: string
          system_prompt?: string
          user_prompt_template?: string
          model?: string
          temperature?: number
          max_tokens?: number
          credit_cost?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patentai_patent_projects: {
        Row: {
          id: string
          user_id: string
          title: string
          status: PatentStatus
          input_type: PatentInputType
          ipc_codes: Json
          tech_domain: string | null
          core_inventions: Json
          overall_prior_art_risk: PriorArtRisk | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          status?: PatentStatus
          input_type?: PatentInputType
          ipc_codes?: Json
          tech_domain?: string | null
          core_inventions?: Json
          overall_prior_art_risk?: PriorArtRisk | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          status?: PatentStatus
          input_type?: PatentInputType
          ipc_codes?: Json
          tech_domain?: string | null
          core_inventions?: Json
          overall_prior_art_risk?: PriorArtRisk | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patentai_patent_inputs: {
        Row: {
          id: string
          project_id: string
          type: 'text' | 'file'
          content: string | null
          file_name: string | null
          file_url: string | null
          file_size_bytes: number | null
          analysis_result: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'text' | 'file'
          content?: string | null
          file_name?: string | null
          file_url?: string | null
          file_size_bytes?: number | null
          analysis_result?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: 'text' | 'file'
          content?: string | null
          file_name?: string | null
          file_url?: string | null
          file_size_bytes?: number | null
          analysis_result?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      patentai_patent_components: {
        Row: {
          id: string
          project_id: string
          parent_id: string | null
          ref_number: string
          name: string
          description: string | null
          order_index: number
          has_prior_art_conflict: boolean
          conflict_risk: PriorArtRisk | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          parent_id?: string | null
          ref_number: string
          name: string
          description?: string | null
          order_index?: number
          has_prior_art_conflict?: boolean
          conflict_risk?: PriorArtRisk | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          parent_id?: string | null
          ref_number?: string
          name?: string
          description?: string | null
          order_index?: number
          has_prior_art_conflict?: boolean
          conflict_risk?: PriorArtRisk | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patentai_patent_prior_art: {
        Row: {
          id: string
          project_id: string
          source_db: PriorArtSource
          patent_number: string
          title: string
          abstract: string | null
          similarity_score: number | null
          risk_level: PriorArtRisk
          conflicting_component_ids: Json
          avoidance_suggestion: string | null
          searched_at: string
        }
        Insert: {
          id?: string
          project_id: string
          source_db: PriorArtSource
          patent_number: string
          title: string
          abstract?: string | null
          similarity_score?: number | null
          risk_level: PriorArtRisk
          conflicting_component_ids?: Json
          avoidance_suggestion?: string | null
          searched_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          source_db?: PriorArtSource
          patent_number?: string
          title?: string
          abstract?: string | null
          similarity_score?: number | null
          risk_level?: PriorArtRisk
          conflicting_component_ids?: Json
          avoidance_suggestion?: string | null
          searched_at?: string
        }
        Relationships: []
      }
      patentai_patent_claims: {
        Row: {
          id: string
          project_id: string
          claim_number: number
          claim_type: PatentClaimType
          parent_claim_id: string | null
          content: string
          strength_score: number | null
          strength_issues: Json
          is_confirmed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          claim_number: number
          claim_type?: PatentClaimType
          parent_claim_id?: string | null
          content: string
          strength_score?: number | null
          strength_issues?: Json
          is_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          claim_number?: number
          claim_type?: PatentClaimType
          parent_claim_id?: string | null
          content?: string
          strength_score?: number | null
          strength_issues?: Json
          is_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patentai_patent_sections: {
        Row: {
          id: string
          project_id: string
          section_type: PatentSectionType
          content: string | null
          version: number
          is_confirmed: boolean
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          section_type: PatentSectionType
          content?: string | null
          version?: number
          is_confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          section_type?: PatentSectionType
          content?: string | null
          version?: number
          is_confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patentai_patent_drawings: {
        Row: {
          id: string
          project_id: string
          drawing_number: number
          drawing_type: PatentDrawingType
          caption: string | null
          prompt_used: string | null
          image_url: string | null
          is_confirmed: boolean
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          drawing_number: number
          drawing_type: PatentDrawingType
          caption?: string | null
          prompt_used?: string | null
          image_url?: string | null
          is_confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          drawing_number?: number
          drawing_type?: PatentDrawingType
          caption?: string | null
          prompt_used?: string | null
          image_url?: string | null
          is_confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patentai_patent_gates: {
        Row: {
          id: string
          project_id: string
          gate_number: number
          status: PatentGateStatus
          approved_by: string | null
          notes: string | null
          approved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          gate_number: number
          status?: PatentGateStatus
          approved_by?: string | null
          notes?: string | null
          approved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          gate_number?: number
          status?: PatentGateStatus
          approved_by?: string | null
          notes?: string | null
          approved_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      patentai_user_credits: {
        Row: {
          user_id: string
          credits: number
          updated_at: string
        }
        Insert: {
          user_id: string
          credits?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          credits?: number
          updated_at?: string
        }
        Relationships: []
      }
      patentai_credit_logs: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance_after: number
          reason: string
          project_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          balance_after: number
          reason: string
          project_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          balance_after?: number
          reason?: string
          project_id?: string | null
          created_at?: string
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
      user_role: UserRole
      locale: Locale
      theme: Theme
      project_type: ProjectType
      project_status: ProjectStatus
      project_stage: ProjectStage
      gate_status: GateStatus
      document_type: DocumentType
      feedback_type: FeedbackType
      approval_status: ApprovalStatus
      prompt_category: PromptCategory
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// 편의 타입
export type User = Database['public']['Tables']['bi_users']['Row']
export type Project = Database['public']['Tables']['bi_projects']['Row']
export type IdeaCard = Database['public']['Tables']['bi_idea_cards']['Row']
export type Evaluation = Database['public']['Tables']['bi_evaluations']['Row']
export type Document = Database['public']['Tables']['bi_documents']['Row']
export type Feedback = Database['public']['Tables']['bi_feedbacks']['Row']
export type Approval = Database['public']['Tables']['bi_approvals']['Row']
export type Prompt = Database['public']['Tables']['bi_prompts']['Row']
export type PromptVersion = Database['public']['Tables']['bi_prompt_versions']['Row']
export type PromptVariable = Database['public']['Tables']['bi_prompt_variables']['Row']
export type BusinessReview = Database['public']['Tables']['bi_business_reviews']['Row']
export type CreditLog = Database['public']['Tables']['bi_credit_logs']['Row']

// 확장판 (모두의 창업) 편의 타입
export type Program = Database['public']['Tables']['bi_programs']['Row']
export type Institution = Database['public']['Tables']['bi_institutions']['Row']
export type InstitutionMember = Database['public']['Tables']['bi_institution_members']['Row']
export type MentorProfile = Database['public']['Tables']['bi_mentor_profiles']['Row']
export type MentorInstitutionPool = Database['public']['Tables']['bi_mentor_institution_pool']['Row']
export type ProjectInstitutionMap = Database['public']['Tables']['bi_project_institution_maps']['Row']
export type MentorMatch = Database['public']['Tables']['bi_mentor_matches']['Row']
export type MentoringSession = Database['public']['Tables']['bi_mentoring_sessions']['Row']
export type MentoringReport = Database['public']['Tables']['bi_mentoring_reports']['Row']
export type MentorPayout = Database['public']['Tables']['bi_mentor_payouts']['Row']
export type Notification = Database['public']['Tables']['bi_notifications']['Row']
export type Message = Database['public']['Tables']['bi_messages']['Row']
export type MessageBatch = Database['public']['Tables']['bi_message_batches']['Row']
export type AuditLog = Database['public']['Tables']['bi_audit_logs']['Row']

// PatentAI 편의 타입
export type PatentaiPrompt = Database['public']['Tables']['patentai_prompts']['Row']
export type PatentProject = Database['public']['Tables']['patentai_patent_projects']['Row']
export type PatentInput = Database['public']['Tables']['patentai_patent_inputs']['Row']
export type PatentComponent = Database['public']['Tables']['patentai_patent_components']['Row']
export type PatentPriorArt = Database['public']['Tables']['patentai_patent_prior_art']['Row']
export type PatentClaim = Database['public']['Tables']['patentai_patent_claims']['Row']
export type PatentSection = Database['public']['Tables']['patentai_patent_sections']['Row']
export type PatentDrawing = Database['public']['Tables']['patentai_patent_drawings']['Row']
export type PatentGate = Database['public']['Tables']['patentai_patent_gates']['Row']
export type PatentUserCredit = Database['public']['Tables']['patentai_user_credits']['Row']
export type PatentCreditLog = Database['public']['Tables']['patentai_credit_logs']['Row']
