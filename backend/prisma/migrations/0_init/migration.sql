--
-- PostgreSQL database dump
--

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id integer NOT NULL,
    action character varying(50) NOT NULL,
    changed_by integer,
    source character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    source_pdf_upload_id integer,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: COLUMN audit_log.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.source IS 'Source of change: manual, pdf_import, image_import, or document_import';


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: cms_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_blocks (
    id integer NOT NULL,
    page_id integer,
    block_type character varying(50) NOT NULL,
    sort_order integer NOT NULL,
    content jsonb NOT NULL,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cms_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cms_blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cms_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cms_blocks_id_seq OWNED BY public.cms_blocks.id;


--
-- Name: cms_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_pages (
    id integer NOT NULL,
    slug character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cms_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cms_pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cms_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cms_pages_id_seq OWNED BY public.cms_pages.id;


--
-- Name: document_extraction_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_extraction_items (
    id integer NOT NULL,
    extraction_id integer NOT NULL,
    record_type character varying(50) NOT NULL,
    extracted_data jsonb NOT NULL,
    confidence_score numeric(3,2),
    user_modified_data jsonb,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_record_id integer,
    created_record_type character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: document_extraction_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_extraction_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_extraction_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_extraction_items_id_seq OWNED BY public.document_extraction_items.id;


--
-- Name: document_extractions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_extractions (
    id integer NOT NULL,
    document_upload_id integer NOT NULL,
    raw_extraction jsonb,
    mapped_data jsonb,
    extraction_model character varying(100),
    tokens_used integer,
    status character varying(50) DEFAULT 'pending_review'::character varying NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: document_extractions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_extractions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_extractions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_extractions_id_seq OWNED BY public.document_extractions.id;


--
-- Name: document_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_uploads (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    uploaded_by integer NOT NULL,
    filename character varying(255) NOT NULL,
    original_filename character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) NOT NULL,
    media_type character varying(20) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    detected_type character varying(100),
    classification_confidence integer,
    classification_explanation text,
    processing_started_at timestamp with time zone,
    processing_completed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_tag character varying(100),
    user_description text,
    date_taken timestamp with time zone,
    body_area character varying(100),
    document_group_id uuid,
    page_number integer DEFAULT 1,
    group_name character varying(255) DEFAULT NULL::character varying,
    deleted_at timestamp with time zone
);


--
-- Name: document_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_uploads_id_seq OWNED BY public.document_uploads.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    email_type character varying(100) NOT NULL,
    brevo_template_id integer NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer
);


--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: image_extraction_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_extraction_items (
    id integer NOT NULL,
    extraction_id integer NOT NULL,
    record_type character varying(50) NOT NULL,
    extracted_data jsonb NOT NULL,
    confidence_score numeric(3,2),
    user_modified_data jsonb,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_record_id integer,
    created_record_type character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: image_extraction_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.image_extraction_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: image_extraction_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.image_extraction_items_id_seq OWNED BY public.image_extraction_items.id;


--
-- Name: image_extractions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_extractions (
    id integer NOT NULL,
    image_upload_id integer NOT NULL,
    raw_extraction jsonb,
    mapped_data jsonb,
    extraction_model character varying(100),
    tokens_used integer,
    status character varying(50) DEFAULT 'pending_review'::character varying NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: image_extractions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.image_extractions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: image_extractions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.image_extractions_id_seq OWNED BY public.image_extractions.id;


--
-- Name: image_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_uploads (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    uploaded_by integer NOT NULL,
    filename character varying(255) NOT NULL,
    original_filename character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    document_type character varying(100),
    processing_started_at timestamp with time zone,
    processing_completed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: image_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.image_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: image_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.image_uploads_id_seq OWNED BY public.image_uploads.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: pdf_extraction_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdf_extraction_items (
    id integer NOT NULL,
    extraction_id integer NOT NULL,
    record_type character varying(50) NOT NULL,
    extracted_data jsonb NOT NULL,
    confidence_score numeric(3,2),
    user_modified_data jsonb,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_record_id integer,
    created_record_type character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pdf_extraction_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pdf_extraction_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pdf_extraction_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pdf_extraction_items_id_seq OWNED BY public.pdf_extraction_items.id;


--
-- Name: pdf_extractions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdf_extractions (
    id integer NOT NULL,
    pdf_upload_id integer NOT NULL,
    raw_extraction jsonb,
    mapped_data jsonb,
    extraction_model character varying(100),
    tokens_used integer,
    status character varying(50) DEFAULT 'pending_review'::character varying NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pdf_extractions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pdf_extractions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pdf_extractions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pdf_extractions_id_seq OWNED BY public.pdf_extractions.id;


--
-- Name: pdf_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdf_uploads (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    uploaded_by integer NOT NULL,
    filename character varying(255) NOT NULL,
    original_filename character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    document_type character varying(100),
    processing_started_at timestamp with time zone,
    processing_completed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pdf_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pdf_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pdf_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pdf_uploads_id_seq OWNED BY public.pdf_uploads.id;


--
-- Name: pet_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_alerts (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    alert_text character varying(200) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pet_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_alerts_id_seq OWNED BY public.pet_alerts.id;


--
-- Name: pet_allergies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_allergies (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    allergen character varying(255) NOT NULL,
    reaction text,
    severity character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    show_on_card boolean DEFAULT false NOT NULL
);


--
-- Name: pet_allergies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_allergies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_allergies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_allergies_id_seq OWNED BY public.pet_allergies.id;


--
-- Name: pet_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_conditions (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    name character varying(255) NOT NULL,
    diagnosed_date date,
    notes text,
    severity character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    show_on_card boolean DEFAULT false NOT NULL,
    diagnosed_date_precision character varying(10) DEFAULT 'day'::character varying
);


--
-- Name: pet_conditions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_conditions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_conditions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_conditions_id_seq OWNED BY public.pet_conditions.id;


--
-- Name: pet_emergency_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_emergency_contacts (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    name character varying(255) NOT NULL,
    relationship character varying(100),
    phone character varying(50) NOT NULL,
    email character varying(255),
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pet_emergency_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_emergency_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_emergency_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_emergency_contacts_id_seq OWNED BY public.pet_emergency_contacts.id;


--
-- Name: pet_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_invitations (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'viewer'::character varying NOT NULL,
    invite_code character varying(32) NOT NULL,
    invited_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone
);


--
-- Name: pet_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_invitations_id_seq OWNED BY public.pet_invitations.id;


--
-- Name: pet_medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_medications (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    name character varying(255) NOT NULL,
    dosage character varying(100),
    frequency character varying(100),
    start_date date,
    end_date date,
    prescribing_vet character varying(255),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    show_on_card boolean DEFAULT false NOT NULL,
    start_date_precision character varying(10) DEFAULT 'day'::character varying,
    end_date_precision character varying(10) DEFAULT 'day'::character varying
);


--
-- Name: pet_medications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_medications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_medications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_medications_id_seq OWNED BY public.pet_medications.id;


--
-- Name: pet_owners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_owners (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) DEFAULT 'viewer'::character varying NOT NULL,
    invited_by integer,
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone
);


--
-- Name: pet_owners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_owners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_owners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_owners_id_seq OWNED BY public.pet_owners.id;


--
-- Name: pet_reminder_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_reminder_notifications (
    id integer NOT NULL,
    reminder_rule_id integer NOT NULL,
    recipient_user_id integer NOT NULL,
    pet_id integer NOT NULL,
    record_type character varying(20) NOT NULL,
    record_id integer NOT NULL,
    due_date date NOT NULL,
    channel character varying(20) DEFAULT 'email'::character varying NOT NULL,
    status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
    queued_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    provider_message_id text,
    error_message text,
    CONSTRAINT pet_reminder_notifications_channel_check CHECK (((channel)::text = 'email'::text)),
    CONSTRAINT pet_reminder_notifications_record_type_check CHECK (((record_type)::text = ANY ((ARRAY['vaccination'::character varying, 'medication'::character varying])::text[]))),
    CONSTRAINT pet_reminder_notifications_status_check CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'sent'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: pet_reminder_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_reminder_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_reminder_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_reminder_notifications_id_seq OWNED BY public.pet_reminder_notifications.id;


--
-- Name: pet_reminder_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_reminder_rules (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    record_type character varying(20) NOT NULL,
    record_id integer NOT NULL,
    channel character varying(20) DEFAULT 'email'::character varying NOT NULL,
    lead_time_value integer NOT NULL,
    lead_time_unit character varying(20) NOT NULL,
    next_due_date date NOT NULL,
    recurrence_value integer,
    recurrence_unit character varying(20),
    is_enabled boolean DEFAULT true NOT NULL,
    created_by_user_id integer,
    updated_by_user_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pet_reminder_rules_channel_check CHECK (((channel)::text = 'email'::text)),
    CONSTRAINT pet_reminder_rules_lead_time_unit_check CHECK (((lead_time_unit)::text = ANY ((ARRAY['days'::character varying, 'weeks'::character varying])::text[]))),
    CONSTRAINT pet_reminder_rules_lead_time_value_check CHECK ((lead_time_value > 0)),
    CONSTRAINT pet_reminder_rules_record_type_check CHECK (((record_type)::text = ANY ((ARRAY['vaccination'::character varying, 'medication'::character varying])::text[]))),
    CONSTRAINT pet_reminder_rules_recurrence_pair_check CHECK ((((recurrence_value IS NULL) AND (recurrence_unit IS NULL)) OR ((recurrence_value IS NOT NULL) AND (recurrence_unit IS NOT NULL)))),
    CONSTRAINT pet_reminder_rules_recurrence_unit_check CHECK (((recurrence_unit IS NULL) OR ((recurrence_unit)::text = ANY ((ARRAY['months'::character varying, 'years'::character varying])::text[])))),
    CONSTRAINT pet_reminder_rules_recurrence_value_check CHECK (((recurrence_value IS NULL) OR (recurrence_value > 0)))
);


--
-- Name: pet_reminder_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_reminder_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_reminder_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_reminder_rules_id_seq OWNED BY public.pet_reminder_rules.id;


--
-- Name: pet_vaccinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_vaccinations (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    name character varying(255) NOT NULL,
    administered_date date NOT NULL,
    expiration_date date,
    administered_by character varying(255),
    lot_number character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    administered_date_precision character varying(10) DEFAULT 'day'::character varying,
    expiration_date_precision character varying(10) DEFAULT 'day'::character varying,
    show_on_card boolean DEFAULT false NOT NULL
);


--
-- Name: pet_vaccinations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_vaccinations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_vaccinations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_vaccinations_id_seq OWNED BY public.pet_vaccinations.id;


--
-- Name: pet_vets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_vets (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    clinic_name character varying(255) NOT NULL,
    vet_name character varying(255),
    phone character varying(50),
    email character varying(255),
    address text,
    is_primary boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pet_vets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_vets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_vets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_vets_id_seq OWNED BY public.pet_vets.id;


--
-- Name: pets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    share_id character varying(21) NOT NULL,
    name character varying(255) NOT NULL,
    species character varying(50) NOT NULL,
    breed character varying(100),
    date_of_birth date,
    weight_kg numeric(5,2),
    sex character varying(20),
    microchip_id character varying(100),
    photo_url text,
    special_instructions text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    weight_unit character varying(3) DEFAULT 'kg'::character varying,
    is_fixed boolean DEFAULT false,
    age integer,
    color_markings character varying(255)
);


--
-- Name: pets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pets_id_seq OWNED BY public.pets.id;


--
-- Name: share_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.share_tokens (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    token character varying(32) NOT NULL,
    label character varying(100),
    pin_hash character varying(255),
    expires_at timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    access_count integer DEFAULT 0,
    last_accessed_at timestamp with time zone,
    is_active boolean DEFAULT true
);


--
-- Name: share_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.share_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: share_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.share_tokens_id_seq OWNED BY public.share_tokens.id;


--
-- Name: subscription_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_config (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer
);


--
-- Name: subscription_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_config_id_seq OWNED BY public.subscription_config.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_admin boolean DEFAULT false NOT NULL,
    stripe_customer_id character varying(255),
    subscription_status character varying(50) DEFAULT 'free'::character varying,
    subscription_tier character varying(50) DEFAULT 'free'::character varying,
    subscription_current_period_end timestamp with time zone,
    subscription_stripe_id character varying(255)
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: cms_blocks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_blocks ALTER COLUMN id SET DEFAULT nextval('public.cms_blocks_id_seq'::regclass);


--
-- Name: cms_pages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages ALTER COLUMN id SET DEFAULT nextval('public.cms_pages_id_seq'::regclass);


--
-- Name: document_extraction_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_extraction_items ALTER COLUMN id SET DEFAULT nextval('public.document_extraction_items_id_seq'::regclass);


--
-- Name: document_extractions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_extractions ALTER COLUMN id SET DEFAULT nextval('public.document_extractions_id_seq'::regclass);


--
-- Name: document_uploads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_uploads ALTER COLUMN id SET DEFAULT nextval('public.document_uploads_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: image_extraction_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_extraction_items ALTER COLUMN id SET DEFAULT nextval('public.image_extraction_items_id_seq'::regclass);


--
-- Name: image_extractions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_extractions ALTER COLUMN id SET DEFAULT nextval('public.image_extractions_id_seq'::regclass);


--
-- Name: image_uploads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_uploads ALTER COLUMN id SET DEFAULT nextval('public.image_uploads_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: pdf_extraction_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_extraction_items ALTER COLUMN id SET DEFAULT nextval('public.pdf_extraction_items_id_seq'::regclass);


--
-- Name: pdf_extractions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_extractions ALTER COLUMN id SET DEFAULT nextval('public.pdf_extractions_id_seq'::regclass);


--
-- Name: pdf_uploads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_uploads ALTER COLUMN id SET DEFAULT nextval('public.pdf_uploads_id_seq'::regclass);


--
-- Name: pet_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_alerts ALTER COLUMN id SET DEFAULT nextval('public.pet_alerts_id_seq'::regclass);


--
-- Name: pet_allergies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_allergies ALTER COLUMN id SET DEFAULT nextval('public.pet_allergies_id_seq'::regclass);


--
-- Name: pet_conditions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_conditions ALTER COLUMN id SET DEFAULT nextval('public.pet_conditions_id_seq'::regclass);


--
-- Name: pet_emergency_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_emergency_contacts ALTER COLUMN id SET DEFAULT nextval('public.pet_emergency_contacts_id_seq'::regclass);


--
-- Name: pet_invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_invitations ALTER COLUMN id SET DEFAULT nextval('public.pet_invitations_id_seq'::regclass);


--
-- Name: pet_medications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_medications ALTER COLUMN id SET DEFAULT nextval('public.pet_medications_id_seq'::regclass);


--
-- Name: pet_owners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_owners ALTER COLUMN id SET DEFAULT nextval('public.pet_owners_id_seq'::regclass);


--
-- Name: pet_reminder_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_notifications ALTER COLUMN id SET DEFAULT nextval('public.pet_reminder_notifications_id_seq'::regclass);


--
-- Name: pet_reminder_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_rules ALTER COLUMN id SET DEFAULT nextval('public.pet_reminder_rules_id_seq'::regclass);


--
-- Name: pet_vaccinations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_vaccinations ALTER COLUMN id SET DEFAULT nextval('public.pet_vaccinations_id_seq'::regclass);


--
-- Name: pet_vets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_vets ALTER COLUMN id SET DEFAULT nextval('public.pet_vets_id_seq'::regclass);


--
-- Name: pets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets ALTER COLUMN id SET DEFAULT nextval('public.pets_id_seq'::regclass);


--
-- Name: share_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_tokens ALTER COLUMN id SET DEFAULT nextval('public.share_tokens_id_seq'::regclass);


--
-- Name: subscription_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_config ALTER COLUMN id SET DEFAULT nextval('public.subscription_config_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: cms_blocks cms_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_blocks
    ADD CONSTRAINT cms_blocks_pkey PRIMARY KEY (id);


--
-- Name: cms_pages cms_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_pkey PRIMARY KEY (id);


--
-- Name: cms_pages cms_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_slug_key UNIQUE (slug);


--
-- Name: document_extraction_items document_extraction_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_extraction_items
    ADD CONSTRAINT document_extraction_items_pkey PRIMARY KEY (id);


--
-- Name: document_extractions document_extractions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_extractions
    ADD CONSTRAINT document_extractions_pkey PRIMARY KEY (id);


--
-- Name: document_uploads document_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_uploads
    ADD CONSTRAINT document_uploads_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_email_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_email_type_key UNIQUE (email_type);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: image_extraction_items image_extraction_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_extraction_items
    ADD CONSTRAINT image_extraction_items_pkey PRIMARY KEY (id);


--
-- Name: image_extractions image_extractions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_extractions
    ADD CONSTRAINT image_extractions_pkey PRIMARY KEY (id);


--
-- Name: image_uploads image_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_uploads
    ADD CONSTRAINT image_uploads_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: pdf_extraction_items pdf_extraction_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_extraction_items
    ADD CONSTRAINT pdf_extraction_items_pkey PRIMARY KEY (id);


--
-- Name: pdf_extractions pdf_extractions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_extractions
    ADD CONSTRAINT pdf_extractions_pkey PRIMARY KEY (id);


--
-- Name: pdf_uploads pdf_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_uploads
    ADD CONSTRAINT pdf_uploads_pkey PRIMARY KEY (id);


--
-- Name: pet_alerts pet_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_alerts
    ADD CONSTRAINT pet_alerts_pkey PRIMARY KEY (id);


--
-- Name: pet_allergies pet_allergies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_allergies
    ADD CONSTRAINT pet_allergies_pkey PRIMARY KEY (id);


--
-- Name: pet_conditions pet_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_conditions
    ADD CONSTRAINT pet_conditions_pkey PRIMARY KEY (id);


--
-- Name: pet_emergency_contacts pet_emergency_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_emergency_contacts
    ADD CONSTRAINT pet_emergency_contacts_pkey PRIMARY KEY (id);


--
-- Name: pet_invitations pet_invitations_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_invitations
    ADD CONSTRAINT pet_invitations_invite_code_key UNIQUE (invite_code);


--
-- Name: pet_invitations pet_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_invitations
    ADD CONSTRAINT pet_invitations_pkey PRIMARY KEY (id);


--
-- Name: pet_medications pet_medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_medications
    ADD CONSTRAINT pet_medications_pkey PRIMARY KEY (id);


--
-- Name: pet_owners pet_owners_pet_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_owners
    ADD CONSTRAINT pet_owners_pet_id_user_id_key UNIQUE (pet_id, user_id);


--
-- Name: pet_owners pet_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_owners
    ADD CONSTRAINT pet_owners_pkey PRIMARY KEY (id);


--
-- Name: pet_reminder_notifications pet_reminder_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_notifications
    ADD CONSTRAINT pet_reminder_notifications_pkey PRIMARY KEY (id);


--
-- Name: pet_reminder_notifications pet_reminder_notifications_unique_send; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_notifications
    ADD CONSTRAINT pet_reminder_notifications_unique_send UNIQUE (reminder_rule_id, recipient_user_id, due_date, channel);


--
-- Name: pet_reminder_rules pet_reminder_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_rules
    ADD CONSTRAINT pet_reminder_rules_pkey PRIMARY KEY (id);


--
-- Name: pet_reminder_rules pet_reminder_rules_unique_record_channel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_rules
    ADD CONSTRAINT pet_reminder_rules_unique_record_channel UNIQUE (record_type, record_id, channel);


--
-- Name: pet_vaccinations pet_vaccinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_vaccinations
    ADD CONSTRAINT pet_vaccinations_pkey PRIMARY KEY (id);


--
-- Name: pet_vets pet_vets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_vets
    ADD CONSTRAINT pet_vets_pkey PRIMARY KEY (id);


--
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);


--
-- Name: pets pets_share_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_share_id_key UNIQUE (share_id);


--
-- Name: share_tokens share_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT share_tokens_pkey PRIMARY KEY (id);


--
-- Name: share_tokens share_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT share_tokens_token_key UNIQUE (token);


--
-- Name: subscription_config subscription_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_config
    ADD CONSTRAINT subscription_config_key_key UNIQUE (key);


--
-- Name: subscription_config subscription_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_config
    ADD CONSTRAINT subscription_config_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_log_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_changed_by ON public.audit_log USING btree (changed_by);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_log_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_source ON public.audit_log USING btree (source);


--
-- Name: idx_cms_blocks_page_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_blocks_page_id ON public.cms_blocks USING btree (page_id);


--
-- Name: idx_cms_blocks_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_blocks_sort_order ON public.cms_blocks USING btree (page_id, sort_order);


--
-- Name: idx_cms_pages_is_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_pages_is_published ON public.cms_pages USING btree (is_published);


--
-- Name: idx_cms_pages_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_pages_slug ON public.cms_pages USING btree (slug);


--
-- Name: idx_document_extraction_items_extraction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_extraction_items_extraction_id ON public.document_extraction_items USING btree (extraction_id);


--
-- Name: idx_document_extraction_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_extraction_items_status ON public.document_extraction_items USING btree (status);


--
-- Name: idx_document_extractions_document_upload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_extractions_document_upload_id ON public.document_extractions USING btree (document_upload_id);


--
-- Name: idx_document_extractions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_extractions_status ON public.document_extractions USING btree (status);


--
-- Name: idx_document_uploads_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_uploads_deleted_at ON public.document_uploads USING btree (deleted_at);


--
-- Name: idx_document_uploads_detected_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_uploads_detected_type ON public.document_uploads USING btree (detected_type);


--
-- Name: idx_document_uploads_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_uploads_group_id ON public.document_uploads USING btree (document_group_id) WHERE (document_group_id IS NOT NULL);


--
-- Name: idx_document_uploads_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_uploads_media_type ON public.document_uploads USING btree (media_type);


--
-- Name: idx_document_uploads_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_uploads_pet_id ON public.document_uploads USING btree (pet_id);


--
-- Name: idx_document_uploads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_uploads_status ON public.document_uploads USING btree (status);


--
-- Name: idx_document_uploads_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_uploads_uploaded_by ON public.document_uploads USING btree (uploaded_by);


--
-- Name: idx_email_templates_email_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_templates_email_type ON public.email_templates USING btree (email_type);


--
-- Name: idx_image_extraction_items_extraction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_extraction_items_extraction_id ON public.image_extraction_items USING btree (extraction_id);


--
-- Name: idx_image_extraction_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_extraction_items_status ON public.image_extraction_items USING btree (status);


--
-- Name: idx_image_extractions_image_upload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_extractions_image_upload_id ON public.image_extractions USING btree (image_upload_id);


--
-- Name: idx_image_extractions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_extractions_status ON public.image_extractions USING btree (status);


--
-- Name: idx_image_uploads_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_uploads_pet_id ON public.image_uploads USING btree (pet_id);


--
-- Name: idx_image_uploads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_uploads_status ON public.image_uploads USING btree (status);


--
-- Name: idx_image_uploads_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_uploads_uploaded_by ON public.image_uploads USING btree (uploaded_by);


--
-- Name: idx_password_reset_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_pdf_extraction_items_extraction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_extraction_items_extraction_id ON public.pdf_extraction_items USING btree (extraction_id);


--
-- Name: idx_pdf_extraction_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_extraction_items_status ON public.pdf_extraction_items USING btree (status);


--
-- Name: idx_pdf_extractions_pdf_upload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_extractions_pdf_upload_id ON public.pdf_extractions USING btree (pdf_upload_id);


--
-- Name: idx_pdf_extractions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_extractions_status ON public.pdf_extractions USING btree (status);


--
-- Name: idx_pdf_uploads_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_uploads_pet_id ON public.pdf_uploads USING btree (pet_id);


--
-- Name: idx_pdf_uploads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_uploads_status ON public.pdf_uploads USING btree (status);


--
-- Name: idx_pdf_uploads_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_uploads_uploaded_by ON public.pdf_uploads USING btree (uploaded_by);


--
-- Name: idx_pet_alerts_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_alerts_pet_id ON public.pet_alerts USING btree (pet_id);


--
-- Name: idx_pet_allergies_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_allergies_pet_id ON public.pet_allergies USING btree (pet_id);


--
-- Name: idx_pet_conditions_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_conditions_pet_id ON public.pet_conditions USING btree (pet_id);


--
-- Name: idx_pet_emergency_contacts_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_emergency_contacts_pet_id ON public.pet_emergency_contacts USING btree (pet_id);


--
-- Name: idx_pet_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_invitations_email ON public.pet_invitations USING btree (email);


--
-- Name: idx_pet_invitations_invite_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_invitations_invite_code ON public.pet_invitations USING btree (invite_code);


--
-- Name: idx_pet_medications_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_medications_pet_id ON public.pet_medications USING btree (pet_id);


--
-- Name: idx_pet_owners_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_owners_pet_id ON public.pet_owners USING btree (pet_id);


--
-- Name: idx_pet_owners_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_owners_user_id ON public.pet_owners USING btree (user_id);


--
-- Name: idx_pet_reminder_notifications_rule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_reminder_notifications_rule_id ON public.pet_reminder_notifications USING btree (reminder_rule_id);


--
-- Name: idx_pet_reminder_notifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_reminder_notifications_status ON public.pet_reminder_notifications USING btree (status, queued_at);


--
-- Name: idx_pet_reminder_rules_due_scan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_reminder_rules_due_scan ON public.pet_reminder_rules USING btree (is_enabled, next_due_date, record_type, channel);


--
-- Name: idx_pet_reminder_rules_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_reminder_rules_pet_id ON public.pet_reminder_rules USING btree (pet_id);


--
-- Name: idx_pet_vaccinations_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_vaccinations_pet_id ON public.pet_vaccinations USING btree (pet_id);


--
-- Name: idx_pet_vets_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_vets_pet_id ON public.pet_vets USING btree (pet_id);


--
-- Name: idx_pets_share_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pets_share_id ON public.pets USING btree (share_id);


--
-- Name: idx_pets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pets_user_id ON public.pets USING btree (user_id);


--
-- Name: idx_share_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_tokens_expires_at ON public.share_tokens USING btree (expires_at);


--
-- Name: idx_share_tokens_pet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_tokens_pet_id ON public.share_tokens USING btree (pet_id);


--
-- Name: idx_share_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_tokens_token ON public.share_tokens USING btree (token);


--
-- Name: idx_subscription_config_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_config_key ON public.subscription_config USING btree (key);


--
-- Name: idx_users_is_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_admin ON public.users USING btree (is_admin) WHERE (is_admin = true);


--
-- Name: idx_users_stripe_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_stripe_customer_id ON public.users USING btree (stripe_customer_id);


--
-- Name: idx_users_subscription_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_subscription_status ON public.users USING btree (subscription_status);


--
-- Name: audit_log audit_log_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: audit_log audit_log_source_pdf_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_source_pdf_upload_id_fkey FOREIGN KEY (source_pdf_upload_id) REFERENCES public.pdf_uploads(id);


--
-- Name: cms_blocks cms_blocks_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_blocks
    ADD CONSTRAINT cms_blocks_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.cms_pages(id) ON DELETE CASCADE;


--
-- Name: document_extraction_items document_extraction_items_extraction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_extraction_items
    ADD CONSTRAINT document_extraction_items_extraction_id_fkey FOREIGN KEY (extraction_id) REFERENCES public.document_extractions(id) ON DELETE CASCADE;


--
-- Name: document_extractions document_extractions_document_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_extractions
    ADD CONSTRAINT document_extractions_document_upload_id_fkey FOREIGN KEY (document_upload_id) REFERENCES public.document_uploads(id) ON DELETE CASCADE;


--
-- Name: document_extractions document_extractions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_extractions
    ADD CONSTRAINT document_extractions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: document_uploads document_uploads_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_uploads
    ADD CONSTRAINT document_uploads_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: document_uploads document_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_uploads
    ADD CONSTRAINT document_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: email_templates email_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: image_extraction_items image_extraction_items_extraction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_extraction_items
    ADD CONSTRAINT image_extraction_items_extraction_id_fkey FOREIGN KEY (extraction_id) REFERENCES public.image_extractions(id) ON DELETE CASCADE;


--
-- Name: image_extractions image_extractions_image_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_extractions
    ADD CONSTRAINT image_extractions_image_upload_id_fkey FOREIGN KEY (image_upload_id) REFERENCES public.image_uploads(id) ON DELETE CASCADE;


--
-- Name: image_extractions image_extractions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_extractions
    ADD CONSTRAINT image_extractions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: image_uploads image_uploads_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_uploads
    ADD CONSTRAINT image_uploads_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: image_uploads image_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_uploads
    ADD CONSTRAINT image_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pdf_extraction_items pdf_extraction_items_extraction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_extraction_items
    ADD CONSTRAINT pdf_extraction_items_extraction_id_fkey FOREIGN KEY (extraction_id) REFERENCES public.pdf_extractions(id) ON DELETE CASCADE;


--
-- Name: pdf_extractions pdf_extractions_pdf_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_extractions
    ADD CONSTRAINT pdf_extractions_pdf_upload_id_fkey FOREIGN KEY (pdf_upload_id) REFERENCES public.pdf_uploads(id) ON DELETE CASCADE;


--
-- Name: pdf_extractions pdf_extractions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_extractions
    ADD CONSTRAINT pdf_extractions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: pdf_uploads pdf_uploads_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_uploads
    ADD CONSTRAINT pdf_uploads_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pdf_uploads pdf_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_uploads
    ADD CONSTRAINT pdf_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: pet_alerts pet_alerts_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_alerts
    ADD CONSTRAINT pet_alerts_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_allergies pet_allergies_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_allergies
    ADD CONSTRAINT pet_allergies_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_conditions pet_conditions_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_conditions
    ADD CONSTRAINT pet_conditions_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_emergency_contacts pet_emergency_contacts_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_emergency_contacts
    ADD CONSTRAINT pet_emergency_contacts_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_invitations pet_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_invitations
    ADD CONSTRAINT pet_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: pet_invitations pet_invitations_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_invitations
    ADD CONSTRAINT pet_invitations_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_medications pet_medications_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_medications
    ADD CONSTRAINT pet_medications_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_owners pet_owners_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_owners
    ADD CONSTRAINT pet_owners_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: pet_owners pet_owners_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_owners
    ADD CONSTRAINT pet_owners_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_owners pet_owners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_owners
    ADD CONSTRAINT pet_owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pet_reminder_notifications pet_reminder_notifications_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_notifications
    ADD CONSTRAINT pet_reminder_notifications_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_reminder_notifications pet_reminder_notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_notifications
    ADD CONSTRAINT pet_reminder_notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pet_reminder_notifications pet_reminder_notifications_reminder_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_notifications
    ADD CONSTRAINT pet_reminder_notifications_reminder_rule_id_fkey FOREIGN KEY (reminder_rule_id) REFERENCES public.pet_reminder_rules(id) ON DELETE CASCADE;


--
-- Name: pet_reminder_rules pet_reminder_rules_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_rules
    ADD CONSTRAINT pet_reminder_rules_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pet_reminder_rules pet_reminder_rules_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_rules
    ADD CONSTRAINT pet_reminder_rules_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_reminder_rules pet_reminder_rules_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_reminder_rules
    ADD CONSTRAINT pet_reminder_rules_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pet_vaccinations pet_vaccinations_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_vaccinations
    ADD CONSTRAINT pet_vaccinations_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_vets pet_vets_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_vets
    ADD CONSTRAINT pet_vets_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pets pets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: share_tokens share_tokens_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT share_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: share_tokens share_tokens_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT share_tokens_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: subscription_config subscription_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_config
    ADD CONSTRAINT subscription_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

SELECT pg_catalog.set_config('search_path', 'public', false);
