import { useState, useEffect } from 'react'
import Header from '../components/Header'
import ComingUp from '../components/ComingUp'
import CodeBlock from '../components/CodeBlock'
import ModuleNav from '../components/ModuleNav'
import ExerciseCard from '../components/ExerciseCard'
import PromptCard from '../components/PromptCard'
import { useProgress } from '../hooks/useProgress'

// ── Component architecture tree ────────────────────────────────────────────
const ARCH_TREE = `ProfilePage  (src/pages/ProfilePage.jsx)
│  Route: /profile/:username — public, no auth required
│  Reads: username via useParams()
│  Supabase: SELECT profiles WHERE username = :username
│            SELECT links WHERE user_id = profile.id AND is_published = true
│
├── ProfileHeader  (src/components/ProfileHeader.jsx)
│     Renders: avatar, display name, bio — applies theme CSS variables on mount
│     Props: profile (object)
│     State: none
│     Supabase: none
│
├── LinkList  (src/components/LinkList.jsx)
│     Renders: ordered list of published links
│     Props: links (array)
│     State: none
│     Supabase: none
│     │
│     └── LinkItem  (src/components/LinkItem.jsx)
│           Renders: link title + URL — opens in new tab, increments counter
│           Props: link (object)
│           State: none
│           Supabase: UPDATE links SET click_count = click_count + 1 WHERE id = link.id
│
└── QRCode  (src/components/QRCode.jsx)
      Renders: canvas QR code of the profile URL + "Download PNG" button
      Props: url (string)
      State: none (canvas rendered via useEffect + qrcode library)
      Supabase: none

─────────────────────────────────────────────────────────
Dashboard  (src/pages/Dashboard.jsx)
│  Route: /dashboard — auth required, redirects to /login if no session
│  Supabase: supabase.auth.getSession() on mount
│
├── ProfileEditor  (src/components/ProfileEditor.jsx)
│     Renders: form — display name, bio, avatar URL, 5-theme colour picker
│     Props: profile (from useProfile hook), onSave
│     State: local form fields (controlled inputs)
│     Supabase: UPSERT profiles via useProfile.upsertProfile()
│
├── LinkEditor  (src/components/LinkEditor.jsx)
│     Renders: "Add link" form + draggable list of DraggableLinkItem rows
│     Props: via useLinks hook
│     State: newTitle, newUrl (add-form inputs)
│     Supabase: via useLinks hook
│     │
│     └── DraggableLinkItem  (src/components/DraggableLinkItem.jsx)
│           Renders: drag handle, title, URL, edit/delete buttons — inline edit
│           Props: link, index, onDragStart, onDragOver, onDrop, onUpdate, onDelete
│           State: isEditing (boolean), editTitle, editUrl
│           Supabase: none (delegates to useLinks)
│
└── StatsPanel  (src/components/StatsPanel.jsx)
      Renders: total click count, top-performing link, clicks in last 7 days
      Props: links (from useLinks)
      State: none (derived from links array passed as props)
      Supabase: none

─────────────────────────────────────────────────────────
Hooks

useProfile  (src/hooks/useProfile.js)
  Manages: profile (object), loading (boolean), error (string|null)
  Exposes: profile, loading, error, upsertProfile(data)
  Supabase: SELECT profiles WHERE username = :username (public fetch)
            UPSERT profiles WHERE id = auth.uid() (owner only)

useLinks  (src/hooks/useLinks.js)
  Manages: links (array), loading (boolean), error (string|null)
  Exposes: links, loading, error,
           addLink(data), updateLink(id, changes),
           deleteLink(id), reorderLinks(fromIndex, toIndex)
  Supabase: SELECT links WHERE user_id = :userId ORDER BY display_order
            INSERT / UPDATE / DELETE links (authenticated)
            UPDATE display_order on all links after a reorder

useClickTracking  (src/hooks/useClickTracking.js)
  Manages: none (fire-and-forget side effect)
  Exposes: trackClick(linkId)
  Supabase: supabase.rpc('increment_click_count', { link_id: id })

useTheme  (src/hooks/useTheme.js)
  Manages: active theme name (string)
  Exposes: applyTheme(themeName)
  Side effect: sets CSS variables on document.documentElement`

// ── Supabase schema SQL ────────────────────────────────────────────────────
const SQL_SCHEMA = `-- ─── profiles table ──────────────────────────────────────────────
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     text UNIQUE NOT NULL,
  display_name text,
  bio          text,
  avatar_url   text,
  theme        text DEFAULT 'default',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ─── links table ──────────────────────────────────────────────────
CREATE TABLE links (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  url           text NOT NULL,
  display_order integer DEFAULT 0,
  click_count   integer DEFAULT 0,
  is_published  boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- ─── RLS — profiles ───────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── RLS — links ──────────────────────────────────────────────────
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Anyone can read published links (for public profile pages)
CREATE POLICY "Published links are publicly readable"
  ON links FOR SELECT
  USING (is_published = true);

-- Owner can insert, update, and delete their own links
CREATE POLICY "Users can insert their own links"
  ON links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links"
  ON links FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
  ON links FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── Click tracking — separate UPDATE policy ──────────────────────
-- A Postgres function lets anonymous users increment click_count
-- without granting them broad UPDATE access to the links table.
CREATE OR REPLACE FUNCTION increment_click_count(link_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE links SET click_count = click_count + 1 WHERE id = link_id;
$$;
GRANT EXECUTE ON FUNCTION increment_click_count(uuid) TO anon;

-- Client call (no auth required):
-- supabase.rpc('increment_click_count', { link_id: id })

-- ─── Enable Real-time ─────────────────────────────────────────────
-- Dashboard → Database → Replication → Tables → enable links
-- Lets StatsPanel receive live click_count updates via
-- supabase.channel().on('postgres_changes', ...).subscribe()`

// ── Build guide steps ──────────────────────────────────────────────────────
const BUILD_STEPS = [
  {
    num: '01',
    title: 'Scaffold the link-in-bio project and add routes',
    desc: 'The Link-in-Bio app is completely separate from the course site — its own folder, its own GitHub repo, its own Vercel deployment. Scaffold it fresh with Vite, then add the four routes it needs.',
    prompt: `Scaffold a new React + Vite project for a standalone Link-in-Bio app.

Run these commands in your terminal (outside the vibe-advanced folder):
  npm create vite@latest link-in-bio -- --template react
  cd link-in-bio
  npm install
  npm install react-router-dom @supabase/supabase-js qrcode

Set up the project structure:
1. Delete src/App.css and src/assets/react.svg
2. Replace src/main.jsx — render <App /> inside <BrowserRouter> from react-router-dom
3. Replace src/App.jsx — add these routes:
   "/" → <Home /> (placeholder)
   "/profile/:username" → <ProfilePage />
   "/dashboard" → <Dashboard />
   "/login" → <Login />
4. Create placeholder page files:
   src/pages/Home.jsx — renders <h1>Link-in-Bio</h1>
   src/pages/ProfilePage.jsx — imports useParams, renders <h1>Profile: {username}</h1>
   src/pages/Dashboard.jsx — renders <h1>Dashboard</h1>
   src/pages/Login.jsx — renders <h1>Login</h1>
5. Create src/lib/supabase.js — initialises Supabase client from import.meta.env
6. Create .env.local:
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
7. Create src/index.css — blank file

Do not import or reference anything from the vibe-advanced codebase.`,
    doneWhen: 'npm run dev starts without errors. Navigate to /profile/yourname — it renders "Profile: yourname". Navigate to /dashboard — renders "Dashboard".',
  },
  {
    num: '02',
    title: 'Create Supabase tables and RLS policies',
    desc: 'Create a new Supabase project named "link-in-bio", run the full schema, and verify RLS is correctly configured before writing any app code.',
    prompt: `Set up the Supabase backend for my standalone link-in-bio React + Vite project.

1. Create a new Supabase project. Name it "link-in-bio".
   Copy the Project URL and anon key into .env.local.

2. In Supabase Dashboard → SQL Editor, run this SQL:

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text, bio text, avatar_url text,
  theme text DEFAULT 'default',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL, url text NOT NULL,
  display_order integer DEFAULT 0,
  click_count integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Published links are publicly readable" ON links FOR SELECT USING (is_published = true);
CREATE POLICY "Users can insert their own links" ON links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own links" ON links FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own links" ON links FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION increment_click_count(link_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE links SET click_count = click_count + 1 WHERE id = link_id;
$$;
GRANT EXECUTE ON FUNCTION increment_click_count(uuid) TO anon;

3. Enable real-time on the links table: Database → Replication → enable links.`,
    doneWhen: 'Both tables appear in Table Editor with lock icons. The increment_click_count function appears in Database → Functions.',
  },
  {
    num: '03',
    title: 'Build useProfile hook — fetch by username, upsert for owner',
    desc: 'The useProfile hook handles two distinct operations: fetching a profile by username (public, no auth) and upserting the signed-in user\'s own profile (auth-gated). One hook, two use cases.',
    prompt: `Create src/hooks/useProfile.js in my standalone link-in-bio React + Vite project.

The Supabase client is at src/lib/supabase.js (named export: supabase).

The hook accepts an optional username parameter:
- If username is provided: fetch the profile row WHERE username = :username
- If username is null: skip the fetch (dashboard will upsert without pre-fetching)

State to manage: profile (object|null), loading (boolean), error (string|null)

Expose:
- profile, loading, error
- upsertProfile(data) — UPSERT into profiles WHERE id = auth.uid()
  data shape: { username, display_name, bio, avatar_url, theme }
  Set updated_at to new Date().toISOString() on every upsert
  Return { error } so callers can handle failure

Add a JSDoc comment at the top. Use async/await. Handle errors — set error state on failure.`,
    doneWhen: 'Import the hook in ProfilePage.jsx with a test username. The profile object logs to the console after fetching from Supabase.',
  },
  {
    num: '04',
    title: 'Build ProfilePage — public view of a profile',
    desc: 'ProfilePage reads a username from the URL, fetches the matching profile and links from Supabase, and renders them. No auth required — this is the public-facing page anyone can visit.',
    prompt: `Build src/pages/ProfilePage.jsx in my standalone link-in-bio React + Vite project.

This page is public — no auth required.

Behaviour:
- Read username from the URL using useParams()
- Use the useProfile hook (src/hooks/useProfile.js) to fetch the profile
- Fetch the published links for this profile using a separate useEffect:
  SELECT * FROM links WHERE user_id = profile.id AND is_published = true ORDER BY display_order
- Show a loading state while fetching ("Loading profile...")
- Show a "Profile not found." message if the profile is null after loading
- Once loaded, render:
  - ProfileHeader component (create a placeholder: just renders display_name and bio)
  - An unordered list of links — each link opens in a new tab (_blank, rel="noopener noreferrer")
  - QRCode component (create a placeholder canvas div for now)

Use the supabase client directly for the links fetch (not through a hook yet — we'll add useLinks in step 10).
CSS classes only. No inline styles.`,
    doneWhen: 'Navigate to /profile/a-username-you-created-in-Supabase — the profile name and links render. Navigate to /profile/nobody — "Profile not found." appears.',
  },
  {
    num: '05',
    title: 'Build ProfileHeader with theme application via CSS variables',
    desc: 'ProfileHeader renders the avatar, display name, and bio. It also applies the profile\'s selected theme by writing CSS variables to the document root — so the entire page adopts the theme colours.',
    prompt: `Build src/components/ProfileHeader.jsx in my standalone link-in-bio React + Vite project.

Props: profile (object with display_name, bio, avatar_url, theme)

The 5 themes and their CSS variable values:
- default:  --theme-bg: #ffffff, --theme-text: #111111, --theme-accent: #c84b2f
- dark:     --theme-bg: #111111, --theme-text: #f5f5f5, --theme-accent: #e87c5e
- forest:   --theme-bg: #1a2e1a, --theme-text: #d4edda, --theme-accent: #52b788
- ocean:    --theme-bg: #0a1628, --theme-text: #caf0f8, --theme-accent: #48cae4
- rose:     --theme-bg: #fff0f3, --theme-text: #3d0017, --theme-accent: #e63362

In a useEffect, apply the theme:
  const root = document.documentElement
  root.style.setProperty('--theme-bg', THEMES[theme].bg)
  root.style.setProperty('--theme-text', THEMES[theme].text)
  root.style.setProperty('--theme-accent', THEMES[theme].accent)

Also apply background-color to document.body.

Render: avatar <img> (or a placeholder div if no avatar_url), display_name in an <h1>, bio in a <p>.
CSS classes only. Clean up the CSS variables on unmount (reset to default theme values).`,
    doneWhen: 'Visit a profile with theme set to "dark" in Supabase — the page background and text colours change to match. Navigating away resets the theme.',
  },
  {
    num: '06',
    title: 'Build LinkItem with click tracking',
    desc: 'LinkItem renders a single link and increments its click counter in Supabase whenever the user navigates to it. The increment uses the RPC function so no auth is required.',
    prompt: `Build src/components/LinkItem.jsx in my standalone link-in-bio React + Vite project.

Props: link (object with id, title, url, click_count)

Behaviour:
- Render an <a> tag that opens in a new tab (target="_blank", rel="noopener noreferrer")
- On click, call the increment_click_count Supabase RPC before navigating:
  await supabase.rpc('increment_click_count', { link_id: link.id })
  Do not await the result (fire-and-forget) — the user should not wait for the DB call
- Display the link title prominently and the URL in a smaller style below it

Also update src/components/LinkList.jsx to use LinkItem:
  Render an ordered list of <LinkItem> components.
  Props: links (array)

CSS classes only. No inline styles.`,
    doneWhen: 'Click a link on a public profile. Check the links table in the Supabase Table Editor — click_count increments for that row.',
  },
  {
    num: '07',
    title: 'Build QRCode component — canvas render + PNG download',
    desc: 'The QRCode component takes a URL, renders it as a QR code onto a canvas element using the qrcode library, and provides a download button that exports the canvas as a PNG file.',
    prompt: `Build src/components/QRCode.jsx in my standalone link-in-bio React + Vite project.

The qrcode package is already installed (npm install qrcode).

Props: url (string — the full public profile URL)

Implementation:
1. Use useRef to hold a reference to a <canvas> element
2. In a useEffect that depends on [url], call:
   import QRCodeLib from 'qrcode'
   QRCodeLib.toCanvas(canvasRef.current, url, { width: 200, margin: 2 })
3. Handle the case where url is empty or null — skip the render
4. Render a <canvas ref={canvasRef} /> element
5. Add a "Download PNG" button:
   const link = document.createElement('a')
   link.download = 'profile-qr.png'
   link.href = canvasRef.current.toDataURL('image/png')
   document.body.appendChild(link)
   link.click()
   document.body.removeChild(link)

Update ProfilePage to pass the correct public profile URL to QRCode:
  url={\`\${window.location.origin}/profile/\${profile.username}\`}

CSS classes only. No inline styles.`,
    doneWhen: 'The QR code renders on the profile page. Clicking "Download PNG" saves a file named profile-qr.png. Scanning it with a phone opens the correct profile URL.',
  },
  {
    num: '08',
    title: 'Build Dashboard — redirect to /login if not authenticated',
    desc: 'The Dashboard is the auth-gated editing interface. On mount, check the Supabase session. If there is no active session, redirect immediately to /login. Only show dashboard content to the signed-in profile owner.',
    prompt: `Build src/pages/Dashboard.jsx and src/pages/Login.jsx in my standalone link-in-bio project.

Dashboard.jsx:
- On mount, call supabase.auth.getSession() to get the current session
- While checking: show a loading indicator ("Checking session...")
- If no session: redirect to /login using useNavigate()
- If session exists: store the user in state and render the dashboard layout
- The dashboard should show:
  - A heading with the user's email
  - A "Sign out" button that calls supabase.auth.signOut() then redirects to /login
  - Placeholder sections for ProfileEditor, LinkEditor, and StatsPanel (just headings for now)

Login.jsx:
- Render an email + password form
- On submit, call supabase.auth.signInWithPassword({ email, password })
- On success, redirect to /dashboard
- On error, display the error message
- Add a "Sign up" toggle that calls supabase.auth.signUp({ email, password }) instead
- CSS classes only. No inline styles.`,
    doneWhen: 'Visit /dashboard without being signed in — it redirects to /login. Sign in with a valid Supabase account — it redirects to /dashboard and shows the user email.',
  },
  {
    num: '09',
    title: 'Build ProfileEditor — edit name, bio, avatar, theme picker',
    desc: 'ProfileEditor lets the signed-in user update their profile display fields and choose from 5 preset colour themes. Changes save to Supabase via the useProfile hook\'s upsertProfile function.',
    prompt: `Build src/components/ProfileEditor.jsx in my standalone link-in-bio React + Vite project.

Props: user (Supabase user object with user.id)

Behaviour:
1. Use the useProfile hook to fetch the current user's profile by their Supabase user ID
   (Add a fetchById option to useProfile: SELECT * FROM profiles WHERE id = :userId)
2. Initialise controlled form inputs from the fetched profile data
3. The 5 theme names: default, dark, forest, ocean, rose
   Render them as clickable swatches or buttons — highlight the active theme
4. On form submit, call upsertProfile({ username, display_name, bio, avatar_url, theme })
   Show "Saving..." while the upsert is in progress, "Saved!" on success, error on failure
5. The username field should be editable but warn if it changes:
   "Changing your username will break any links shared to your old URL."

CSS classes only. No inline styles. Render this component in Dashboard.jsx.`,
    doneWhen: 'Save a new display name and theme from the dashboard. Navigate to the public profile URL — the new name and theme are applied.',
  },
  {
    num: '10',
    title: 'Build useLinks hook — CRUD + optimistic updates + reorder',
    desc: 'The useLinks hook owns all link data and mutations. Every operation updates local state immediately (optimistic) and syncs to Supabase in the background, rolling back on failure.',
    prompt: `Create src/hooks/useLinks.js in my standalone link-in-bio React + Vite project.

The hook accepts userId (string) as a parameter.

On mount, fetch all links for this user:
  SELECT * FROM links WHERE user_id = :userId ORDER BY display_order

State: links (array), loading (boolean), error (string|null)

Implement these functions with optimistic updates:

addLink({ title, url }):
  1. Create an optimistic link object with a temp id (e.g. \`temp-\${Date.now()}\`)
  2. Append it to links state immediately
  3. INSERT into Supabase: { title, url, user_id: userId, display_order: links.length }
  4. On success: replace the temp item with the real row returned from Supabase
  5. On error: remove the temp item (rollback)

deleteLink(id):
  1. Save the deleted item before removing it
  2. Filter it out of links state immediately
  3. DELETE from Supabase WHERE id = :id
  4. On error: re-insert the saved item (rollback)

updateLink(id, changes):
  1. Update the item in links state immediately
  2. UPDATE in Supabase WHERE id = :id
  3. On error: revert to the previous value (rollback)

reorderLinks(fromIndex, toIndex):
  1. Splice the array locally: remove from fromIndex, insert at toIndex
  2. Update display_order on each affected link in local state
  3. Batch UPDATE display_order in Supabase for all moved links

Wire useLinks into LinkEditor (src/components/LinkEditor.jsx):
  Render a "New link" form (title + URL inputs) and a list of links from the hook.`,
    doneWhen: 'Add, edit, and delete links from the dashboard. Check the Supabase Table Editor after each operation — the DB reflects every change.',
  },
  {
    num: '11',
    title: 'Build DraggableLinkItem and wire drag-to-reorder into LinkEditor',
    desc: 'DraggableLinkItem adds a drag handle to each link row using the HTML5 drag-and-drop API. Dropping a link in a new position calls reorderLinks in useLinks, which persists the new order to Supabase.',
    prompt: `Build src/components/DraggableLinkItem.jsx in my standalone link-in-bio React + Vite project.

Props:
  link (object), index (integer)
  onDragStart(index), onDragOver(e), onDrop(index)
  onUpdate(id, changes), onDelete(id)

Render:
- A drag handle icon (use "⠿" or "≡") with draggable={true}
- The link title and URL (read-only mode)
- An "Edit" button that toggles into inline edit mode (controlled inputs for title and URL)
- A "Save" button (visible in edit mode) that calls onUpdate(link.id, { title, url })
- A "Delete" button that calls onDelete(link.id)
- Set draggable={true} on the outer div
- onDragStart: call onDragStart(index)
- onDragOver: call onDragOver(e) — must call e.preventDefault()
- onDrop: call onDrop(index)

Update LinkEditor.jsx to use DraggableLinkItem:
- Track dragIndex in state
- Pass onDragStart={i => setDragIndex(i)} to each item
- Pass onDrop={i => { reorderLinks(dragIndex, i); setDragIndex(null) }} to each item
- Pass onDragOver={e => e.preventDefault()}
- Pass onUpdate and onDelete from useLinks

CSS classes only. No inline styles.`,
    doneWhen: 'Drag a link to a different position in the list. Refresh the page — the order is preserved (fetched from Supabase in display_order sequence).',
  },
  {
    num: '12',
    title: 'Build StatsPanel — total clicks, top link, last 7 days',
    desc: 'StatsPanel derives all its data from the links array already fetched by useLinks — no extra Supabase calls. It shows total clicks, the top-performing link, and a count of links created in the last 7 days.',
    prompt: `Build src/components/StatsPanel.jsx in my standalone link-in-bio React + Vite project.

Props: links (array from useLinks)

Derive all stats from the links prop — no Supabase calls:

totalClicks:
  links.reduce((sum, l) => sum + (l.click_count ?? 0), 0)

topLink:
  [...links].sort((a, b) => b.click_count - a.click_count)[0] ?? null

recentLinks (created in the last 7 days):
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  links.filter(l => new Date(l.created_at) > cutoff).length

Render:
- "Total clicks" with the totalClicks count
- "Top link" with topLink.title and topLink.click_count (or "No clicks yet" if null)
- "Added this week" with the recentLinks count
- Show "—" for all stats if links is empty or still loading

Wire StatsPanel into Dashboard.jsx — pass the links array from useLinks.
CSS classes only. No inline styles.`,
    doneWhen: 'Click several links on the public profile. Open the dashboard — StatsPanel shows the updated total click count and the correct top link.',
  },
]

// ── Deployment checklist ───────────────────────────────────────────────────
const DEPLOY_ITEMS = [
  { key: 'env_vars',     label: 'Supabase env vars set in Vercel Dashboard → Settings → Environment Variables (not just .env.local)' },
  { key: 'rls_read',     label: 'RLS tested — anonymous user can read profiles and published links without errors' },
  { key: 'rls_write',    label: 'RLS tested — anonymous user cannot insert, update, or delete links or profiles' },
  { key: 'click_track',  label: 'Click tracking works on the public profile with no auth — click_count increments in Supabase Table Editor' },
  { key: 'dashboard',    label: 'Dashboard redirects to /login when not authenticated — tested in an incognito window' },
  { key: 'username',     label: 'Profile URL is unique — attempting to register a duplicate username returns an error' },
  { key: 'reorder',      label: 'Drag-to-reorder persists after a full page refresh — display_order stored correctly in Supabase' },
  { key: 'theme',        label: 'All 5 themes apply correctly on the public profile page — background, text, and accent colours change' },
  { key: 'qr_scan',      label: 'QR code scans correctly on a real phone — opens the correct public profile URL' },
  { key: 'qr_download',  label: 'QR code downloads as a PNG file named profile-qr.png' },
  { key: 'mobile',       label: 'App works on mobile — tested in Chrome DevTools device mode at 375px width' },
  { key: 'build',        label: 'npm run build completes locally with zero errors and zero TypeScript/lint warnings' },
  { key: 'incognito',    label: 'Live Vercel URL tested in an incognito window — auth flow works from a clean session' },
  { key: 'share',        label: 'Shared your public profile URL with at least one other person' },
]

// ── Self-assessment rubric ─────────────────────────────────────────────────
const RUBRIC_CRITERIA = [
  { key: 'routing',     label: 'Dynamic routing',    desc: 'Profile URLs work correctly for any username — /profile/:username renders the right data' },
  { key: 'crud',        label: 'CRUD',               desc: 'Add, edit, delete, and reorder all work — changes reflected in Supabase Table Editor' },
  { key: 'optimistic',  label: 'Optimistic updates', desc: 'UI feels instant — state updates before the DB call, rolls back cleanly on error' },
  { key: 'tracking',    label: 'Click tracking',     desc: 'Every link click increments click_count in Supabase — no auth required' },
  { key: 'theming',     label: 'Theming',            desc: 'All 5 themes apply correctly on the public profile — CSS variables set from Supabase data' },
  { key: 'qrcode',      label: 'QR code',            desc: 'Renders correctly, scans on a real phone, and downloads as a PNG file' },
  { key: 'security',    label: 'Security',           desc: 'RLS tested, no secrets in the codebase, dashboard is auth-protected, click tracking via RPC' },
  { key: 'polish',      label: 'Polish',             desc: 'Mobile responsive, loading states everywhere, error states handled, no console errors' },
]

const RUBRIC_LEVELS = [
  { value: 0, label: 'Not yet' },
  { value: 1, label: 'Partially' },
  { value: 2, label: 'Fully' },
]

function getGrade(score) {
  if (score === 16) return { grade: 'A+', msg: 'Ship it.' }
  if (score >= 13)  return { grade: 'A',  msg: 'Production ready.' }
  if (score >= 10)  return { grade: 'B',  msg: 'Solid. Fix the gaps.' }
  if (score >= 7)   return { grade: 'C',  msg: 'Working but needs polish.' }
  return                   { grade: 'D',  msg: 'Go back and close the open items.' }
}

// ── Exercises ──────────────────────────────────────────────────────────────
const EXERCISES = [
  {
    id: 'ex1',
    title: 'Add a dynamic profile route',
    duration: '20 min',
    desc: 'Add a /profile/:username route to your link-in-bio App.jsx. Create a bare ProfilePage component that reads the username from useParams() and displays it on screen. Confirm different usernames render without reloading the page.',
    steps: [
      'In App.jsx, add: <Route path="/profile/:username" element={<ProfilePage />} />',
      'Create src/pages/ProfilePage.jsx — import useParams from react-router-dom',
      'Destructure username from useParams() and render it in an <h1>',
      'Navigate to /profile/yourname in the browser — confirm it renders "yourname"',
      'Try /profile/alice, /profile/bob — confirm each renders the correct username',
    ],
    reflection: 'What happens if you visit /profile/ with no username? How would you add a fallback route to handle that case?',
  },
  {
    id: 'ex2',
    title: 'Build a useLinks hook with optimistic CRUD',
    duration: '30 min',
    desc: 'Build a useLinks hook that exposes addLink, updateLink, and deleteLink. Each function updates local state immediately (optimistic) and syncs to Supabase in the background, rolling back on error.',
    steps: [
      'Create src/hooks/useLinks.js — initialise links state from a Supabase SELECT on mount',
      'Implement addLink: append an optimistic item, INSERT to Supabase, replace with real row on success',
      'Implement deleteLink: remove from state immediately, DELETE from Supabase, re-insert on error',
      'Implement updateLink: update state immediately, UPDATE in Supabase, revert on error',
      'Test each operation — open the Supabase Table Editor and verify the DB reflects every change',
    ],
    reflection: 'What would the user experience look like if you waited for the Supabase response before updating the UI? How does optimistic updating change the feel of the app?',
  },
  {
    id: 'ex3',
    title: 'Make the link list draggable',
    duration: '25 min',
    desc: 'Make the link list draggable using the HTML5 drag-and-drop API — no libraries. Drag a link to a new position, confirm the order updates locally, then verify it persists after a page refresh.',
    steps: [
      'Add draggable={true} to each link row div in your LinkEditor',
      'Track dragIndex in React state — set it in onDragStart',
      'In onDragOver, call e.preventDefault() (required for drop to fire)',
      'In onDrop, splice the array: remove from dragIndex, insert at dropIndex, call reorderLinks',
      'Refresh the page after reordering — confirm the order is preserved (Supabase stored display_order)',
    ],
    reflection: 'What would break if you forgot to call e.preventDefault() in onDragOver? Why does the browser need that?',
  },
  {
    id: 'ex4',
    title: 'Build a QR code component with download',
    duration: '20 min',
    desc: 'Install qrcode, build a QRCode component that renders the user\'s public profile URL as a QR code on a canvas element, and add a button that downloads it as a PNG file.',
    steps: [
      'Install qrcode: npm install qrcode',
      'Create src/components/QRCode.jsx — use useRef for the canvas element',
      'In a useEffect, call QRCodeLib.toCanvas(canvasRef.current, url, { width: 200 })',
      'Add a download button: get the data URL from canvas.toDataURL("image/png"), create a temp <a>, trigger click',
      'Test by scanning the QR code with your phone — confirm it opens the correct profile URL',
    ],
    reflection: 'What happens if the url prop is an empty string or null? How would you handle that case gracefully?',
  },
]

// ── Prompt templates ───────────────────────────────────────────────────────
const PROMPTS = [
  {
    label: 'Dynamic route with URL parameter',
    technique: 'Routing',
    text: `I'm building a React app with react-router-dom. I need a route that renders different content based on a URL parameter.

Set up a route: /profile/:username
The ProfilePage component should:
1. Import useParams from react-router-dom
2. Destructure the username parameter
3. Fetch the matching profile from Supabase: SELECT * FROM profiles WHERE username = :username
4. Show "Loading..." while fetching, "Profile not found." if null
5. Render the profile data once loaded

Also show me how to navigate to a profile programmatically using useNavigate.

Tech stack: React 18, react-router-dom v6, Supabase JS client at src/lib/supabase.js.
No TypeScript. CSS classes only, no inline styles.`,
  },
  {
    label: 'Optimistic update for Supabase CRUD',
    technique: 'Optimistic UI',
    text: `I need to implement optimistic updates for a Supabase CRUD operation in React.

Specifically: a deleteLink function inside a custom hook.

Requirements:
1. Save the item to be deleted before removing it (for rollback)
2. Remove it from local state immediately — do not wait for Supabase
3. DELETE from Supabase in the background: supabase.from('links').delete().eq('id', id)
4. If the DELETE fails: re-insert the saved item back into state (rollback)
5. If the DELETE succeeds: do nothing extra — UI is already correct

Also show the same optimistic pattern for addLink:
1. Create a temp item with id: \`temp-\${Date.now()}\`
2. Append it to state immediately
3. INSERT to Supabase and replace the temp item with the real row on success
4. Remove the temp item if the INSERT fails

Tech stack: React 18 hooks (useState), Supabase JS client.`,
  },
  {
    label: 'Drag-to-reorder with HTML5 API',
    technique: 'Drag & Drop',
    text: `Build a draggable list in React using the native HTML5 drag-and-drop API. No libraries.

Requirements:
- A list of items where each item can be dragged to a new position
- Track dragIndex (the item being dragged) in React state
- On drop, reorder the array using splice and call an onReorder callback
- The dragged item should appear semi-transparent while dragging (opacity: 0.5)

The splice logic:
  const next = [...items]
  const [moved] = next.splice(dragIndex, 1)
  next.splice(dropIndex, 0, moved)
  onReorder(next)

Required event handlers:
- onDragStart={e => setDragIndex(i)} on each item
- onDragOver={e => e.preventDefault()} (required — without this, onDrop won't fire)
- onDrop={() => handleDrop(i)} on each item

After reordering locally, also update display_order in Supabase for all affected rows.

Tech stack: React 18, Supabase JS client. No drag libraries.`,
  },
  {
    label: 'Client-side click tracking with Supabase RPC',
    technique: 'Analytics',
    text: `I need to track link clicks in a React app. Every time a user clicks a link, the click_count column in Supabase should increment by 1 — with no auth required.

The Supabase function already exists:
  CREATE FUNCTION increment_click_count(link_id uuid)
  RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
    UPDATE links SET click_count = click_count + 1 WHERE id = link_id;
  $$;

Build a LinkItem component that:
1. Renders an <a> tag with the link title and URL (opens in new tab)
2. On click, calls supabase.rpc('increment_click_count', { link_id: link.id })
3. Does NOT await the call — fire and forget. The user navigates immediately.
4. Does NOT require any auth — anonymous users can trigger this

Also show me a useClickTracking hook that wraps this call for reuse.

Tech stack: React 18, Supabase JS client at src/lib/supabase.js.`,
  },
  {
    label: 'Theme system using CSS variables from Supabase',
    technique: 'Theming',
    text: `Build a theme system for a React profile page. The active theme is stored as a string in a Supabase profiles row (e.g. "dark", "forest"). On the public profile page, it should apply CSS variables to the document root.

Requirements:
1. Define 5 themes as a JS object:
   const THEMES = {
     default: { bg: '#ffffff', text: '#111111', accent: '#c84b2f' },
     dark:    { bg: '#111111', text: '#f5f5f5', accent: '#e87c5e' },
     forest:  { bg: '#1a2e1a', text: '#d4edda', accent: '#52b788' },
     ocean:   { bg: '#0a1628', text: '#caf0f8', accent: '#48cae4' },
     rose:    { bg: '#fff0f3', text: '#3d0017', accent: '#e63362' },
   }

2. A useTheme hook that applies the theme to document.documentElement:
   root.style.setProperty('--theme-bg', THEMES[theme].bg)
   root.style.setProperty('--theme-text', THEMES[theme].text)
   root.style.setProperty('--theme-accent', THEMES[theme].accent)
   Clean up on unmount (reset to default values).

3. A theme picker UI component for the dashboard (5 clickable swatches).

Tech stack: React 18, Supabase JS client. CSS variables only.`,
  },
  {
    label: 'Generate and download a QR code from canvas',
    technique: 'Canvas API',
    text: `Build a React component that renders a URL as a QR code on a <canvas> element using the qrcode library, with a button that downloads the canvas as a PNG.

The qrcode library is installed: npm install qrcode

Requirements:
1. Accept a url prop (string)
2. Use useRef to reference the canvas element
3. In useEffect (dependencies: [url]), call:
   import QRCodeLib from 'qrcode'
   QRCodeLib.toCanvas(canvasRef.current, url, { width: 200, margin: 2 })
4. Guard against null or empty url — skip the render
5. A download button that:
   - Gets the data URL: const dataUrl = canvasRef.current.toDataURL('image/png')
   - Creates a temp <a> element, sets href to dataUrl, sets download to 'profile-qr.png'
   - Appends it to body, clicks it, removes it

No external QR library other than qrcode. CSS classes only.`,
  },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function Module6() {
  const { markComplete } = useProgress()
  const [completedEx, setCompletedEx] = useState(() =>
    JSON.parse(localStorage.getItem('vibe-m6-ex') || '{}')
  )
  const [checks, setChecks] = useState(
    () => JSON.parse(localStorage.getItem('vibe-m6-deploy') || '{}')
  )
  const [rubric, setRubric] = useState(
    () => JSON.parse(localStorage.getItem('vibe-m6-rubric') || '{}')
  )

  function toggleExercise(id) {
    const next = { ...completedEx, [id]: !completedEx[id] }
    setCompletedEx(next)
    localStorage.setItem('vibe-m6-ex', JSON.stringify(next))
  }

  function toggleCheck(key) {
    const next = { ...checks, [key]: !checks[key] }
    setChecks(next)
    localStorage.setItem('vibe-m6-deploy', JSON.stringify(next))
  }

  function setLevel(key, value) {
    const next = { ...rubric, [key]: value }
    setRubric(next)
    localStorage.setItem('vibe-m6-rubric', JSON.stringify(next))
  }

  const checkedCount  = Object.values(checks).filter(Boolean).length
  const rubricTotal   = RUBRIC_CRITERIA.reduce((sum, c) => sum + (rubric[c.key] ?? 0), 0)
  const gradeInfo     = getGrade(rubricTotal)

  useEffect(() => {
    if (checkedCount === DEPLOY_ITEMS.length) markComplete(6)
  }, [checkedCount])

  return (
    <div className="wrap">
      <Header variant="module" />

      {/* HERO */}
      <div className="module-hero">
        <div className="module-kicker">Module 06 — Project II</div>
        <h1>Build: <em>Link-in-Bio</em></h1>
        <div className="hero-meta">
          <div className="meta-item"><strong>Estimated time</strong>10–14 hours</div>
          <div className="meta-item"><strong>Difficulty</strong>Advanced</div>
          <div className="meta-item"><strong>Stack</strong>React + Supabase + Vercel</div>
          <div className="meta-item"><strong>Type</strong>Full-stack project</div>
        </div>
      </div>

      {/* OBJECTIVES */}
      <div className="lesson-section">
        <div className="section-label">// learning objectives</div>
        <ul className="obj-list">
          <li>Understand dynamic routing — how a single route renders different content based on a URL parameter</li>
          <li>Build a full CRUD feature: create, read, update, and delete links</li>
          <li>Implement drag-to-reorder using only React state and the HTML5 drag-and-drop API</li>
          <li>Track and display analytics data (click counts) in real time</li>
          <li>Generate a QR code entirely client-side without external services</li>
          <li>Deploy a multi-page app where every public profile has its own URL</li>
        </ul>
      </div>

      {/* PROJECT BRIEF */}
      <div className="lesson-section">
        <div className="section-label">Project brief</div>
        <h2>What you're<br /><em>building</em></h2>
        <p>
          A full-stack Link-in-Bio app — your own version of Linktree, built from scratch, owned by you,
          deployed on your own domain. Every user gets a unique public profile URL. The owner manages their
          links from an auth-gated dashboard. Anyone can visit, click links, and scan a QR code — no account needed.
        </p>
        <div className="callout">
          <p><strong>Why this project:</strong> The Link-in-Bio app adds everything the Quiz App didn't cover — dynamic routing, optimistic CRUD, drag-to-reorder, click analytics, CSS theming from database data, and client-side QR generation. It's a genuinely useful tool you'll want to keep and share.</p>
        </div>
        <h2>Features<br /><em>to ship</em></h2>
        <ul className="obj-list">
          <li>Unique public profile URL per user: /profile/:username — shareable, no login required</li>
          <li>Link management: add, edit, delete, and drag-to-reorder links from the dashboard</li>
          <li>Click tracking: every link click increments a counter in Supabase in real time</li>
          <li>Custom themes: 5 preset colour themes stored in Supabase, applied via CSS variables</li>
          <li>QR code: generated client-side for the public profile URL, downloadable as PNG</li>
          <li>Auth-gated dashboard: only the profile owner can edit their links and settings</li>
          <li>Public profile: anyone can view, no auth required, themes and click counts visible</li>
          <li>Fully responsive — works on mobile without horizontal scrolling</li>
          <li>Deployed to Vercel with its own Supabase project and environment variables</li>
        </ul>
      </div>

      {/* COMPONENT ARCHITECTURE */}
      <div className="lesson-section">
        <div className="section-label">Component architecture</div>
        <h2>The full<br /><em>component tree</em></h2>
        <p>
          Two top-level pages: the public <code>ProfilePage</code> (no auth) and the auth-gated <code>Dashboard</code>.
          Each component owns exactly one responsibility. All Supabase calls are isolated to hooks —
          components stay thin and receive data via props.
        </p>
        <CodeBlock lang="tree">{ARCH_TREE}</CodeBlock>
      </div>

      {/* SUPABASE SCHEMA */}
      <div className="lesson-section">
        <div className="section-label">Supabase schema</div>
        <h2>Database<br /><em>setup</em></h2>
        <p>
          Two tables. Eight RLS policies. Run this SQL in the Supabase Dashboard → SQL Editor,
          then enable real-time on the links table in Database → Replication.
        </p>
        <CodeBlock lang="sql">{SQL_SCHEMA}</CodeBlock>
        <div className="callout">
          <p><strong>Why an RPC for click tracking:</strong> A broad UPDATE policy on links would let anonymous users change any column — title, URL, even user_id. The <code>increment_click_count</code> function is declared <code>SECURITY DEFINER</code>, so it runs with the privileges of its creator, bypassing RLS, but only does exactly one thing: increment a counter. Anon users can call the function — they still can't touch any other data.</p>
        </div>
      </div>

      {/* STEP-BY-STEP BUILD GUIDE */}
      <div className="challenge-section">
        <div className="section-label">Step-by-step build guide</div>
        <div className="build-guide">

          {/* ── Steps 01–03: Scaffold, Supabase setup, useProfile ── */}
          {BUILD_STEPS.slice(0, 3).map(step => (
            <div key={step.num} className="build-step">
              <div className="build-step-header">
                <span className="build-step-num">{step.num}</span>
                <span className="build-step-title">{step.title}</span>
              </div>
              <p className="build-step-desc">{step.desc}</p>
              <div className="build-step-prompt-label">// claude code prompt</div>
              <CodeBlock lang="prompt">{step.prompt}</CodeBlock>
              <div className="build-step-done">
                <span className="step-badge">Done when</span>
                <span>{step.doneWhen}</span>
              </div>
            </div>
          ))}

          {/* ── Step 04: ProfilePage — Dynamic routing concept ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">04</span>
              <span className="build-step-title">{BUILD_STEPS[3].title}</span>
            </div>
            <p className="build-step-desc">{BUILD_STEPS[3].desc}</p>

            <SectionLabel text="// concept: dynamic routing" />
            <LessonHeading main="Dynamic routing with" accent="React Router" />
            <LessonText>
              A URL parameter is a variable segment of a URL path. In <code>/profile/:username</code>, the <code>:username</code> part is a parameter — it matches anything. Visit <code>/profile/alice</code> and username is "alice". Visit <code>/profile/bob</code> and it's "bob". One route, infinite unique URLs.
            </LessonText>
            <LessonText>
              The <code>useParams()</code> hook reads whatever is in that segment. Call it inside any component that's rendered by a parameterised route and you get back an object with the parameter names as keys.
            </LessonText>
            <CodeBlock lang="jsx">{`// App.jsx — one route handles all profile URLs
<Route path="/profile/:username" element={<ProfilePage />} />

// ProfilePage.jsx — reads the parameter and fetches the right profile
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ProfilePage() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()
      setProfile(data)
    }
    load()
  }, [username])

  if (!profile) return <p>Profile not found.</p>
  return <h1>{profile.display_name}</h1>
}`}</CodeBlock>
            <LessonText>
              Notice that <code>username</code> is in the <code>useEffect</code> dependency array. If the user navigates directly from <code>/profile/alice</code> to <code>/profile/bob</code> without a page reload, the effect re-runs with the new username and fetches the correct profile.
            </LessonText>
            <LessonText>
              The difference between a route param (<code>:username</code>) and a query string (<code>?tab=links</code>) is where in the URL they live. Route params are part of the path — they identify the resource. Query strings are optional filters or view state. For a profile page, the username is the resource identifier, so it belongs in the path.
            </LessonText>
            <CodeBlock lang="jsx">{`// Navigating to a profile programmatically
import { useNavigate } from 'react-router-dom'

function UsernameForm() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')

  return (
    <form onSubmit={e => { e.preventDefault(); navigate(\`/profile/\${username}\`) }}>
      <input value={username} onChange={e => setUsername(e.target.value)} />
      <button type="submit">View profile →</button>
    </form>
  )
}`}</CodeBlock>
            <Callout>
              <strong>This is how every social platform works</strong> — Twitter, GitHub, LinkedIn. One component, infinite unique URLs. The component logic is the same for every profile; only the data changes based on the URL parameter.
            </Callout>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{BUILD_STEPS[3].prompt}</CodeBlock>
            <PromptCard label={PROMPTS[0].label} text={PROMPTS[0].text} tag={PROMPTS[0].technique} />
            <ExerciseCard
              ex={EXERCISES[0]}
              completed={completedEx['ex1']}
              onToggle={() => toggleExercise('ex1')}
            />
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>{BUILD_STEPS[3].doneWhen}</span>
            </div>
          </div>

          {/* ── Step 05: ProfileHeader — theme prompt ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">05</span>
              <span className="build-step-title">{BUILD_STEPS[4].title}</span>
            </div>
            <p className="build-step-desc">{BUILD_STEPS[4].desc}</p>
            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{BUILD_STEPS[4].prompt}</CodeBlock>
            <PromptCard label={PROMPTS[4].label} text={PROMPTS[4].text} tag={PROMPTS[4].technique} />
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>{BUILD_STEPS[4].doneWhen}</span>
            </div>
          </div>

          {/* ── Step 06: LinkItem — click tracking prompt ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">06</span>
              <span className="build-step-title">{BUILD_STEPS[5].title}</span>
            </div>
            <p className="build-step-desc">{BUILD_STEPS[5].desc}</p>
            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{BUILD_STEPS[5].prompt}</CodeBlock>
            <PromptCard label={PROMPTS[3].label} text={PROMPTS[3].text} tag={PROMPTS[3].technique} />
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>{BUILD_STEPS[5].doneWhen}</span>
            </div>
          </div>

          {/* ── Step 07: QRCode — QR code concept ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">07</span>
              <span className="build-step-title">{BUILD_STEPS[6].title}</span>
            </div>
            <p className="build-step-desc">{BUILD_STEPS[6].desc}</p>

            <SectionLabel text="// concept: client-side QR code" />
            <LessonHeading main="Client-side" accent="QR code generation" />
            <LessonText>
              A QR code is a matrix of black and white squares that encodes data — in our case, a URL. Scanning it with a phone camera reads the pattern and opens the URL. The entire encoding process happens mathematically: URL string → binary data → error-correction codes → grid layout.
            </LessonText>
            <LessonText>
              The <code>qrcode</code> package (npm install qrcode) handles all of that automatically. You pass it a string and a canvas element — it draws the QR code directly onto the canvas. No API call, no server, no cost.
            </LessonText>
            <CodeBlock lang="jsx">{`// src/components/QRCode.jsx
import { useEffect, useRef } from 'react'
import QRCodeLib from 'qrcode'

export default function QRCode({ url }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !url) return
    QRCodeLib.toCanvas(canvasRef.current, url, { width: 200, margin: 2 })
  }, [url])

  function download() {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = 'profile-qr.png'
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="qr-wrap">
      <canvas ref={canvasRef} />
      <button className="qr-download" onClick={download}>
        Download PNG
      </button>
    </div>
  )
}`}</CodeBlock>
            <LessonText>
              The download uses the Canvas API's <code>toDataURL()</code> method, which converts the canvas pixels into a base64-encoded PNG string. You attach that string as the <code>href</code> of a temporary anchor tag, set the <code>download</code> attribute, and programmatically click it — the browser triggers a file save without any server involvement.
            </LessonText>
            <Callout>
              <strong>The entire QR generation happens in the browser</strong> — no API call, no server, no cost. The canvas API lets you export it as a PNG instantly. This is a general pattern: canvas → toDataURL() → download link. It works for charts, screenshots, and any canvas-rendered content.
            </Callout>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{BUILD_STEPS[6].prompt}</CodeBlock>
            <PromptCard label={PROMPTS[5].label} text={PROMPTS[5].text} tag={PROMPTS[5].technique} />
            <ExerciseCard
              ex={EXERCISES[3]}
              completed={completedEx['ex4']}
              onToggle={() => toggleExercise('ex4')}
            />
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>{BUILD_STEPS[6].doneWhen}</span>
            </div>
          </div>

          {/* ── Steps 08–09: Dashboard, ProfileEditor ── */}
          {[BUILD_STEPS[7], BUILD_STEPS[8]].map(step => (
            <div key={step.num} className="build-step">
              <div className="build-step-header">
                <span className="build-step-num">{step.num}</span>
                <span className="build-step-title">{step.title}</span>
              </div>
              <p className="build-step-desc">{step.desc}</p>
              <div className="build-step-prompt-label">// claude code prompt</div>
              <CodeBlock lang="prompt">{step.prompt}</CodeBlock>
              <div className="build-step-done">
                <span className="step-badge">Done when</span>
                <span>{step.doneWhen}</span>
              </div>
            </div>
          ))}

          {/* ── Step 10: useLinks — CRUD with Supabase concept ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">10</span>
              <span className="build-step-title">{BUILD_STEPS[9].title}</span>
            </div>
            <p className="build-step-desc">{BUILD_STEPS[9].desc}</p>

            <SectionLabel text="// concept: CRUD with optimistic updates" />
            <LessonHeading main="CRUD with" accent="Supabase" />
            <LessonText>
              CRUD — create, read, update, delete — is the core of any data-driven app. Supabase makes all four operations straightforward. The pattern is always the same: chain <code>.from(table)</code>, specify the operation, optionally filter with <code>.eq()</code>, and destructure <code>{'{ data, error }'}</code>.
            </LessonText>
            <LessonText>
              For profile data, <strong>upsert</strong> is more useful than insert. A user has exactly one profile row. If it exists, update it. If it doesn't, create it. That's what upsert does — one call handles both cases.
            </LessonText>
            <LessonText>
              <strong>Optimistic updates</strong> are how you make a database-backed app feel instant. Instead of waiting for the Supabase response before updating the UI, you update the UI immediately and let the database write happen in the background. If the write fails, you silently roll back to the previous state.
            </LessonText>
            <CodeBlock lang="js">{`// Optimistic insert — UI updates before Supabase responds
async function addLink({ title, url }) {
  // 1. Create a temporary item with a fake ID
  const temp = { id: \`temp-\${Date.now()}\`, title, url, click_count: 0 }

  // 2. Append to UI immediately — no waiting
  setLinks(prev => [...prev, temp])

  // 3. Write to Supabase in the background
  const { data, error } = await supabase
    .from('links')
    .insert({ title, url, user_id: userId })
    .select()
    .single()

  if (error) {
    // 4. Rollback — remove the optimistic item
    setLinks(prev => prev.filter(l => l.id !== temp.id))
    return
  }

  // 5. Replace temp item with the real row from Supabase
  setLinks(prev => prev.map(l => l.id === temp.id ? data : l))
}`}</CodeBlock>
            <CodeBlock lang="js">{`// Optimistic delete with rollback
async function deleteLink(id) {
  // Save the item before removing it
  const removed = links.find(l => l.id === id)

  // Remove from UI immediately
  setLinks(prev => prev.filter(l => l.id !== id))

  const { error } = await supabase
    .from('links')
    .delete()
    .eq('id', id)

  if (error) {
    // Rollback — re-insert the removed item
    setLinks(prev =>
      [...prev, removed].sort((a, b) => a.display_order - b.display_order)
    )
  }
}`}</CodeBlock>
            <Callout>
              <strong>Optimistic updates make your app feel instant.</strong> The user never waits for a round trip. If the DB write fails, you silently restore the previous state. Most writes succeed — designing for the success path first is the right call.
            </Callout>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{BUILD_STEPS[9].prompt}</CodeBlock>
            <PromptCard label={PROMPTS[1].label} text={PROMPTS[1].text} tag={PROMPTS[1].technique} />
            <ExerciseCard
              ex={EXERCISES[1]}
              completed={completedEx['ex2']}
              onToggle={() => toggleExercise('ex2')}
            />
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>{BUILD_STEPS[9].doneWhen}</span>
            </div>
          </div>

          {/* ── Step 11: DraggableLinkItem — drag-to-reorder concept ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">11</span>
              <span className="build-step-title">{BUILD_STEPS[10].title}</span>
            </div>
            <p className="build-step-desc">{BUILD_STEPS[10].desc}</p>

            <SectionLabel text="// concept: drag to reorder" />
            <LessonHeading main="Drag to reorder" accent="without libraries" />
            <LessonText>
              The HTML5 drag-and-drop API is built into the browser. You don't need a library. The key pieces are: the <code>draggable</code> attribute on each item, and three event handlers — <code>onDragStart</code>, <code>onDragOver</code>, and <code>onDrop</code>.
            </LessonText>
            <LessonText>
              The logic is two index numbers: where the drag started (<code>dragIndex</code>) and where it landed (<code>dropIndex</code>). With those two numbers you can reorder any array using a splice operation.
            </LessonText>
            <CodeBlock lang="jsx">{`// A draggable list — no libraries, ~30 lines
function DraggableList({ items, onReorder }) {
  const [dragIndex, setDragIndex] = useState(null)

  function handleDrop(dropIndex) {
    if (dragIndex === null || dragIndex === dropIndex) return

    // Splice: remove from old position, insert at new position
    const next = [...items]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(dropIndex, 0, moved)

    onReorder(next)
    setDragIndex(null)
  }

  return (
    <ul>
      {items.map((item, i) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={e => e.preventDefault()}   // required — enables drop
          onDrop={() => handleDrop(i)}
          style={{ opacity: dragIndex === i ? 0.5 : 1 }}
        >
          ⠿ {item.title}
        </li>
      ))}
    </ul>
  )
}`}</CodeBlock>
            <LessonText>
              The <code>onDragOver</code> handler must call <code>e.preventDefault()</code> — without it, the browser treats the drop target as invalid and <code>onDrop</code> never fires. This is one of the counterintuitive parts of the drag-and-drop API.
            </LessonText>
            <LessonText>
              Persisting the order to Supabase is a batch update — loop through the reordered array and set <code>display_order</code> to each item's new index. On next load, <code>ORDER BY display_order</code> retrieves them in the correct sequence.
            </LessonText>
            <Callout>
              <strong>Once you implement drag-and-drop from scratch once, you'll never be intimidated by it again.</strong> It's just two index numbers and an array splice. The browser handles the visual drag behaviour — you only manage the data.
            </Callout>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{BUILD_STEPS[10].prompt}</CodeBlock>
            <PromptCard label={PROMPTS[2].label} text={PROMPTS[2].text} tag={PROMPTS[2].technique} />
            <ExerciseCard
              ex={EXERCISES[2]}
              completed={completedEx['ex3']}
              onToggle={() => toggleExercise('ex3')}
            />
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>{BUILD_STEPS[10].doneWhen}</span>
            </div>
          </div>

          {/* ── Step 12: StatsPanel ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">12</span>
              <span className="build-step-title">{BUILD_STEPS[11].title}</span>
            </div>
            <p className="build-step-desc">{BUILD_STEPS[11].desc}</p>
            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{BUILD_STEPS[11].prompt}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>{BUILD_STEPS[11].doneWhen}</span>
            </div>
          </div>

        </div>
      </div>

      {/* DEPLOYMENT CHECKLIST */}
      <div className="challenge-section">
        <div className="section-label">Deployment checklist</div>
        <div className="capstone-card">
          <h2>Before you call<br />it <em>done</em></h2>
          <p className="desc">
            Run through every item before sharing your live URL. These are the things that work in dev
            but break in production — or expose a security gap you didn't notice.
          </p>
          <div className="deploy-progress">
            <span className="deploy-count">{checkedCount} / {DEPLOY_ITEMS.length}</span>
            <div className="deploy-track">
              <div
                className="deploy-fill"
                style={{ width: `${(checkedCount / DEPLOY_ITEMS.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="deploy-checklist">
            {DEPLOY_ITEMS.map(item => (
              <label key={item.key} className={`deploy-item${checks[item.key] ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  className="deploy-checkbox"
                  checked={!!checks[item.key]}
                  onChange={() => toggleCheck(item.key)}
                />
                <span className="deploy-label">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* SELF-ASSESSMENT RUBRIC */}
      <div className="challenge-section">
        <div className="section-label">Self-assessment rubric</div>
        <div className="capstone-card">
          <h2>How good<br />is it <em>really?</em></h2>
          <p className="desc">
            Be honest. Click the level that reflects your actual implementation, not the one you aimed for.
            The point is to identify gaps, not to feel good.
          </p>
          <div className="rubric">
            <div className="rubric-header">
              <span className="rubric-col-criterion">Criterion</span>
              <span className="rubric-col-levels">Not yet · Partially · Fully</span>
            </div>
            {RUBRIC_CRITERIA.map(criterion => (
              <div key={criterion.key} className="rubric-row">
                <div className="rubric-criterion">
                  <span className="rubric-name">{criterion.label}</span>
                  <span className="rubric-desc">{criterion.desc}</span>
                </div>
                <div className="rubric-levels">
                  {RUBRIC_LEVELS.map(level => (
                    <button
                      key={level.value}
                      className={`rubric-btn${(rubric[criterion.key] ?? -1) === level.value ? ' active' : ''}`}
                      onClick={() => setLevel(criterion.key, level.value)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="rubric-footer">
              <div className="rubric-total">
                <span className="rubric-score">{rubricTotal}</span>
                <span className="rubric-out-of">/ 16</span>
              </div>
              {Object.keys(rubric).length > 0 && (
                <div className="rubric-grade-block">
                  <span className="rubric-grade-badge">{gradeInfo.grade}</span>
                  <span className="rubric-grade-msg">{gradeInfo.msg}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CAPSTONE TEASER */}
      <ComingUp
        kicker="module 7"
        title="Cloudflare Hosting"
        desc="Move beyond Vercel. Cloudflare Pages, Workers, edge functions, and custom domains. Your apps served from 300+ locations worldwide — for free."
      />

      {/* MODULE NAV */}
      <ModuleNav
        prev={{ to: '/module/5', label: '05 Quiz App' }}
        next={{ to: '#', label: '07 Cloudflare Hosting' }}
      />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────
function SectionLabel({ text }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
      {text}
      <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
    </div>
  )
}

function LessonHeading({ main, accent }) {
  return (
    <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1.1, marginBottom: 16 }}>
      {main}<br /><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{accent}</em>
    </h2>
  )
}

function LessonText({ children }) {
  return (
    <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--muted)', marginBottom: 16, maxWidth: 680 }}>
      {children}
    </p>
  )
}

function Callout({ children }) {
  return (
    <div style={{ borderLeft: '3px solid var(--accent)', padding: '16px 20px', margin: '24px 0', background: 'rgba(200,75,47,0.04)' }}>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, color: 'var(--muted)' }}>{children}</p>
    </div>
  )
}
