-- ═══════════════════════════════════════════════════════════════════════════
-- 💸 SPLITZY — SUPABASE DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enable UUID extension ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: users
-- Mirrors Supabase Auth; stores display info
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL UNIQUE,
  full_name    TEXT        NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: groups
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.groups (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  description  TEXT,
  emoji        TEXT        DEFAULT '👥',
  created_by   UUID        NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for fast lookup by creator
CREATE INDEX idx_groups_created_by ON public.groups(created_by);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: group_members
-- Junction table — who belongs to which group
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.group_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group  ON public.group_members(group_id);
CREATE INDEX idx_group_members_user   ON public.group_members(user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: expenses
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID        NOT NULL REFERENCES public.groups(id)  ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category    TEXT        NOT NULL DEFAULT 'others',
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  paid_by     UUID        NOT NULL REFERENCES public.users(id)   ON DELETE SET NULL,
  split_type  TEXT        NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'percentage')),
  notes       TEXT,
  created_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_expenses_group   ON public.expenses(group_id);
CREATE INDEX idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX idx_expenses_date    ON public.expenses(date DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: expense_splits
-- How each expense is split among members
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id  UUID        NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  is_settled  BOOLEAN     DEFAULT FALSE,
  settled_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (expense_id, user_id)
);

CREATE INDEX idx_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX idx_splits_user    ON public.expense_splits(user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits  ENABLE ROW LEVEL SECURITY;

-- ── USERS policies ───────────────────────────────────────────────────────────
CREATE POLICY "Users can view all profiles"
  ON public.users FOR SELECT
  USING (TRUE);  -- needed for member lookups

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── GROUPS policies ──────────────────────────────────────────────────────────
CREATE POLICY "Members can view their groups"
  ON public.groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON public.groups FOR UPDATE
  USING (
    id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Group admins can delete groups"
  ON public.groups FOR DELETE
  USING (auth.uid() = created_by);

-- ── GROUP_MEMBERS policies ───────────────────────────────────────────────────
CREATE POLICY "Members can view group membership"
  ON public.group_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()  -- allow self-join when creating group
  );

CREATE POLICY "Group admins can remove members"
  ON public.group_members FOR DELETE
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()  -- members can leave
  );

-- ── EXPENSES policies ────────────────────────────────────────────────────────
CREATE POLICY "Group members can view expenses"
  ON public.expenses FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can add expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Expense creator or payer can update"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = paid_by OR auth.uid() = created_by);

CREATE POLICY "Expense creator or payer can delete"
  ON public.expenses FOR DELETE
  USING (auth.uid() = paid_by OR auth.uid() = created_by);

-- ── EXPENSE_SPLITS policies ──────────────────────────────────────────────────
CREATE POLICY "Group members can view splits"
  ON public.expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT e.id FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can add splits"
  ON public.expense_splits FOR INSERT
  WITH CHECK (
    expense_id IN (
      SELECT e.id FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own splits"
  ON public.expense_splits FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Expense owners can delete splits"
  ON public.expense_splits FOR DELETE
  USING (
    expense_id IN (
      SELECT id FROM public.expenses
      WHERE paid_by = auth.uid() OR created_by = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- REAL-TIME (enable for live updates)
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;
  -- Add tables to Realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- USEFUL VIEWS (optional but handy)
-- ════════════════════════════════════════════════════════════════════════════

-- Group summary view
CREATE OR REPLACE VIEW public.group_summaries AS
SELECT
  g.id,
  g.name,
  g.emoji,
  g.description,
  g.created_by,
  COUNT(DISTINCT gm.user_id)  AS member_count,
  COUNT(DISTINCT e.id)        AS expense_count,
  COALESCE(SUM(e.amount), 0)  AS total_amount
FROM public.groups      g
LEFT JOIN public.group_members gm ON gm.group_id = g.id
LEFT JOIN public.expenses      e  ON e.group_id  = g.id
GROUP BY g.id;

-- ════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA (optional — remove in production)
-- ════════════════════════════════════════════════════════════════════════════
/*
-- Insert test after creating auth users manually:
INSERT INTO public.groups (name, emoji, description, created_by)
VALUES ('Beach Trip 🏖️', '🏖️', 'Boracay 2024 crew', '<your-user-id>');
*/

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ Schema setup complete!
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'Splitzy schema installed successfully! 🎉' AS status;
