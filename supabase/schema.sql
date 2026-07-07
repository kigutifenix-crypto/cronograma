-- ============================================================
-- SHOPPING DAS ACADEMIAS — CRONOGRAMA
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Tabela de perfis/usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome      text NOT NULL DEFAULT '',
  email     text NOT NULL DEFAULT '',
  papel     text NOT NULL CHECK (papel IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Tabela principal do cronograma
CREATE TABLE IF NOT EXISTS public.cronograma (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data         date,
  pedido       text DEFAULT '',
  cliente      text DEFAULT '',
  rota         text DEFAULT '',
  placa        text DEFAULT '',
  motorista    text DEFAULT '',
  frete        text DEFAULT 'CIF',
  status       text DEFAULT 'Pendente',
  observacoes  text DEFAULT '',
  criado_em    timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  criado_por   uuid REFERENCES auth.users
);

-- Tabela de pedidos aguardando definição
CREATE TABLE IF NOT EXISTS public.aguardando (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido        text NOT NULL DEFAULT '',
  cliente       text NOT NULL DEFAULT '',
  observacoes   text DEFAULT '',
  adicionado_em timestamptz DEFAULT now(),
  adicionado_por uuid REFERENCES auth.users
);

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Cria perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cronograma_set_atualizado ON public.cronograma;
CREATE TRIGGER cronograma_set_atualizado
  BEFORE UPDATE ON public.cronograma
  FOR EACH ROW EXECUTE PROCEDURE public.set_atualizado_em();

-- Helper: retorna papel do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT papel FROM public.profiles WHERE id = auth.uid() AND ativo = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aguardando ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.get_user_role() = 'admin');

-- CRONOGRAMA
DROP POLICY IF EXISTS "cronograma_select" ON public.cronograma;
CREATE POLICY "cronograma_select" ON public.cronograma
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cronograma_insert" ON public.cronograma;
CREATE POLICY "cronograma_insert" ON public.cronograma
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "cronograma_update" ON public.cronograma;
CREATE POLICY "cronograma_update" ON public.cronograma
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "cronograma_delete" ON public.cronograma;
CREATE POLICY "cronograma_delete" ON public.cronograma
  FOR DELETE USING (public.get_user_role() = 'admin');

-- AGUARDANDO
DROP POLICY IF EXISTS "aguardando_select" ON public.aguardando;
CREATE POLICY "aguardando_select" ON public.aguardando
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "aguardando_all" ON public.aguardando;
CREATE POLICY "aguardando_all" ON public.aguardando
  FOR ALL USING (public.get_user_role() IN ('admin', 'editor'));

-- ============================================================
-- APÓS CRIAR SUA PRIMEIRA CONTA, DEFINA-A COMO ADMIN:
-- UPDATE public.profiles SET papel = 'admin' WHERE email = 'seu-email@aqui.com';
-- ============================================================

-- ============================================================
-- ATIVAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME) DE FORMA SEGURA
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'cronograma'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cronograma;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'aguardando'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aguardando;
  END IF;
END;
$$;


