PassLounge — Product Development Framework
Version:
1.0
Status:
Active
Last Updated:
2025-04-12
Owner:
Student Nurse Lounge
Table of Contents
1.
Team Structure & Ownership
2.
Technology Stack
3.
Repository & Branch Strategy
4.
Environment Architecture
5.
Folder Structure
6.
TypeScript Standards
7.
Component Standards
8.
State Management Standards
9.
Testing Requirements
10.
Git Workflow & PR Process
11.
Definition of Done
12.
Architecture Decision Records
1. Team Structure & Ownership
The PassLounge engineering team is structured as one Senior Engineer and five JuniorEngineers. Each engineer owns a specific domain. Ownership means: you write it, you test it, youreview PRs for it, you are accountable for bugs in it.
Senior Engineer — Tech Lead / Architect
Responsibilities:
Owns the repository structure, CI/CD pipelines, and all three environment configurations
Owns shared infrastructure: Supabase client, TypeScript types, routing guards, Zustandstore setup
Approves all PRs before merge to
main
Writes Architecture Decision Records (ADRs) for any non-trivial technical choice
Unblocks junior engineers on technical problems
Sets and enforces code standards in this document
Files owned:
Junior Engineer 1 — Authentication & User Management
Domain:
Everything related to who is using the app and verifying their identity.
Owns:
Supabase tables:
students
(auth metadata only)
Routes owned:
/login
,
/signup
,
/forgot
src/config/
src/types/
src/store/ ← store setup only, not business logic
src/App.tsx
src/main.tsx
src/routes/
.env.*
vite.config.ts
tailwind.config.ts
tsconfig.json
.github/workflows/
supabase/migrations/
src/features/auth/
├── components/
│ ├── LoginScreen.tsx
│ ├── SignupScreen.tsx
│ └── ForgotPasswordScreen.tsx
├── hooks/
│ └── useAuth.ts
├── services/
│ └── auth.service.ts
└── store/
└── authStore.ts
State owned:
authStore
—
{ user, token, supaStudentId, isAuthenticated, isLoading}
Not responsible for:
what happens after the user logs in (that is the dashboard engineer'sdomain)
Junior Engineer 2 — Onboarding & Student Profile
Domain:
The first-time user experience and student settings.
Owns:
Supabase tables:
students
(profile columns: nickname, tester_type, confidence, test_date,daily_cards, onboarded)
Routes owned:
/onboarding/*
,
/profile
State owned:
studentStore
—
{ nickname, testerType, confidence, testDays,dailyCards, onboarded }
Not responsible for:
auth token — reads
supaStudentId
from
authStore
but never writes to it
src/features/onboarding/
├── components/
│ ├── TesterTypeScreen.tsx
│ ├── ConfidenceScreen.tsx
│ ├── TestDateScreen.tsx
│ ├── CommitmentScreen.tsx
│ └── PlanRevealScreen.tsx
├── hooks/
│ └── useOnboarding.ts
└── services/
└── student.service.ts
src/features/profile/
├── components/
│ └── ProfileTab.tsx
└── hooks/
└── useStudent.ts
src/store/
└── studentStore.ts
Junior Engineer 3 — Study Session & Card Engine
Domain:
The core learning experience — card display, answer flow, session management.
Owns:
Supabase tables:
cards
,
sessions
Routes owned:
/session/*
State owned:
sessionStore
—
{ mode, pool, cards, currentIdx, results, answers,sessionId, isActive, qCount }
Not responsible for:
SR scoring (reads
cardProgressMap
from
srStore
but never writes theSM-2 algorithm)
Junior Engineer 4 — Spaced Repetition Engine
Domain:
The intelligence layer that decides which cards to show and when.
Owns:
src/features/session/
├── components/
│ ├── ModeSelectScreen.tsx
│ ├── PoolSelectScreen.tsx
│ ├── CardScreen.tsx
│ ├── AnswerOption.tsx
│ ├── QuestionLayer.tsx
│ ├── ResultLayer.tsx
│ ├── SessionHUD.tsx
│ ├── SessionComplete.tsx
│ └── SessionNameModal.tsx
├── hooks/
│ ├── useSession.ts
│ └── useCards.ts
├── services/
│ ├── cards.service.ts
│ └── sessions.service.ts
└── store/
└── sessionStore.ts
src/utils/
├── card.utils.ts
└── xp.utils.ts
Supabase tables:
card_progress
Routes owned:
none — pure engine, no UI
State owned:
srStore
—
{ cardProgressMap, cardProgressLoaded, srPendingUpdates }
Interfaces with:
Session Engineer (provides
buildSRPool()
and
saveSRProgress()
) andDashboard Engineer (provides per-card accuracy for strengths/weaknesses breakdown)
Junior Engineer 5 — Dashboard & Analytics
Domain:
The home screen, progress tracking, diagnostic, and all data visualization.
Owns:
src/features/sr/
├── hooks/
│ └── useSREngine.ts
├── services/
│ └── progress.service.ts
└── store/
└── srStore.ts
src/utils/
└── sr.utils.ts
src/config/
└── sr.config.ts ← category weights, difficulty multipliers
supabase/
└── migrations/
└── 002_add_card_progress.sql
Supabase tables:
diagnostic_results
,
sessions
(read-only aggregates)
Routes owned:
/
(home),
/progress
,
/diagnostic
State owned:
dashboardStore
—
{ diagnosticStore, sessionHistory, plStats,streakDays }
2. Technology Stack
Every package choice is justified. No package gets added without a reason.
src/features/dashboard/
├── components/
│ ├── HomeTab.tsx
│ ├── CATScoreCard.tsx
│ ├── StatsGrid.tsx
│ ├── StrengthsWeaknesses.tsx
│ ├── TodaysFocus.tsx
│ └── StreakBadge.tsx
├── hooks/
│ └── useDashboard.ts
└── services/
└── dashboard.service.ts
src/features/diagnostic/
├── components/
│ ├── DiagInfoScreen.tsx
│ └── DiagResultsScreen.tsx
├── hooks/
│ └── useDiagnostic.ts
└── services/
└── diagnostic.service.ts
src/features/progress/
├── components/
│ ├── ProgressTab.tsx
│ ├── SessionHistoryList.tsx
│ └── SessionHistoryItem.tsx
└── hooks/
└── useProgress.ts
src/store/
└── dashboardStore.ts
Core:
react@18 — functional components + hooks, concurrent mode
react-dom@18
typescript@5 — strict mode enabled, no `any`
vite@5 — build tool, replaces deprecated Create React App
Routing:
react-router-dom@6 — declarative routing, nested routes, protected routes
State Management:
zustand@4 — lightweight, no boilerplate, replaces Redux for thisscale
(Redux is appropriate at Netflix scale, not startupscale)
Server State:
@tanstack/react-query@5 — caching, loading states, background refetch forSupabase calls
Database:
@supabase/supabase-js@2 — official SDK, replaces our raw fetch calls to RESTAPI
Styling:
tailwindcss@3 — utility-first, no CSS files to maintain, consistentdesign tokens
clsx — conditional class merging utility
Animations:
framer-motion@11 — card transitions, XP fly animations, screen transitions
Forms:
react-hook-form@7 — performant forms, used for auth and onboarding inputs
zod@3 — schema validation, paired with react-hook-form
Testing:
vitest@1 — Vite-native test runner, replaces Jest
@testing-library/react — component testing, user-centric assertions
@testing-library/user-event — realistic user interaction simulation
msw@2 — mock Supabase API calls in tests
Code Quality:
eslint@8 — linting
3. Repository & Branch Strategy
Branch Structure
Branch Naming Convention
Rules
No one pushes directly to
main
or
release
— ever
Every feature lives on its own branch
PRs require 1 approval (Senior Engineer for
main
, both Senior + product sign-off for
release
)
prettier@3 — formatting
@typescript-eslint — TypeScript-specific linting rules
husky + lint-staged — pre-commit hooks, blocks bad code from entering repo
release ────────────────────────────────────→ production.passlounge.vercel.app
↑ (manual approval + PR from main)
main ──────────────────────────────────────→ staging.passlounge.vercel.app
↑ (PR merged after review + tests pass)
feat/JE1/auth-login-screen
feat/JE1/auth-signup-screen
feat/JE2/onboarding-flow
feat/JE3/card-engine-core
feat/JE4/sr-engine-sm2
feat/JE5/dashboard-stats
fix/JE3/card-answer-bug
feat/{engineer-initials}/{short-description}
fix/{engineer-initials}/{short-description}
refactor/{engineer-initials}/{short-description}
chore/{senior}/{description}
Examples:
feat/JE1/auth-forgot-password
fix/JE3/session-pool-new-cards
refactor/JE4/sr-urgency-mode
chore/SE/setup-ci-pipeline
CI must pass (lint + type check + tests) before PR can be merged
Branch is deleted after merge
4. Environment Architecture
Three Supabase Projects
Environment
Supabase Project
Purpose
Sandbox
passlounge-dev
Local development, break freely, fake data
Staging
passlounge-staging
Pre-production testing, seeded data
Production
passlounge-prod (current)
Real students, never broken
Environment Variables
bash
# .env.development (Sandbox)
VITE_SUPABASE_URL
=
https://
[
dev-project
]
.supabase.co
VITE_SUPABASE_ANON_KEY
=
[
dev-anon-key
]
VITE_ENV
=
sandbox
VITE_ENABLE_QUERY_DEVTOOLS
=
true
VITE_LOG_LEVEL
=
debug
# .env.staging (Staging)
VITE_SUPABASE_URL
=
https://
[
staging-project
]
.supabase.co
VITE_SUPABASE_ANON_KEY
=
[
staging-anon-key
]
VITE_ENV
=
staging
VITE_ENABLE_QUERY_DEVTOOLS
=
false
VITE_LOG_LEVEL
=
warn
# .env.production (Production)
VITE_SUPABASE_URL
=
https://oqinkogrloprvophvuui.supabase.co
VITE_SUPABASE_ANON_KEY
=
[
prod-anon-key
]
VITE_ENV
=
production
VITE_ENABLE_QUERY_DEVTOOLS
=
false
VITE_LOG_LEVEL
=
error
CI/CD Pipeline (GitHub Actions)
5. Folder Structure
Push to feat/* branch:
→ Run: lint, type-check, unit tests
→ Deploy: Vercel preview URL (per-branch)
Push to main (via merged PR):
→ Run: lint, type-check, unit tests, integration tests
→ Deploy: staging.passlounge.vercel.app (auto)
Push to release (via approved PR from main):
→ Run: full test suite
→ Deploy: passlounge.vercel.app (manual approval gate)
passlounge/
├── .github/
│ └── workflows/
│ ├── ci.yml # lint + typecheck + test on every push
│ └── deploy.yml # environment-specific deployments
│
├── supabase/
│ ├── migrations/
│ │ ├── 001_initial_schema.sql
│ │ ├── 002_add_card_progress.sql
│ │ ├── 003_add_onboarded_column.sql
│ │ └── 004_add_daily_cards.sql
│ └── seed/
│ ├── dev_seed.sql # 20 fake students
│ └── staging_seed.sql # 100 fake students, realistic sessions
│
├── src/
│ ├── main.tsx # ReactDOM.createRoot, providers
│ ├── App.tsx # Router, global providers, route tree
│ │
│ ├── config/
│ │ ├── supabase.ts # Single Supabase client instance
│ │ ├── env.ts # Typed env vars (never import.meta.env directly)
│ │ ├── sr.config.ts # SR category weights + difficulty multipliers
│ │ └── nclex.config.ts # NCLEX blueprint percentages, category names
│ │
│ ├── types/
│ │ ├── database.types.ts # Auto-generated from Supabase schema
│ │ ├── card.types.ts # Card, CardProgress, CardCategory
│ │ ├── session.types.ts # Session, SessionMode, SessionPool
│ │ ├── student.types.ts # Student, TesterType, Confidence
│ │ └── sr.types.ts # SRScore, CardProgressMap
│ │
│ ├── store/
│ │ ├── authStore.ts
│ │ ├── sessionStore.ts
│ │ ├── studentStore.ts
│ │ ├── srStore.ts
│ │ └── dashboardStore.ts
│ │
│ ├── routes/
│ │ ├── ProtectedRoute.tsx # Redirects to /login if not authenticated
│ │ ├── OnboardingRoute.tsx # Redirects to / if already onboarded
│ │ └── PublicOnlyRoute.tsx # Redirects to / if already authenticated
│ │
│ ├── components/
│ │ └── ui/ # Shared primitive components (owned bySenior)
│ │ ├── Button/
│ │ │ ├── Button.tsx
│ │ │ ├── Button.test.tsx
│ │ │ └── index.ts
│ │ ├── Card/
│ │ ├── Badge/
│ │ ├── ProgressBar/
│ │ ├── StatBox/
│ │ ├── Screen/
│ │ ├── BottomNav/
│ │ ├── Modal/
│ │ └── LoadingSpinner/
│ │
│ ├── features/ # Domain features, one per engineer
│ │ ├── auth/ # JE1
│ │ ├── onboarding/ # JE2
│ │ ├── profile/ # JE2
│ │ ├── session/ # JE3
│ │ ├── sr/ # JE4
│ │ ├── dashboard/ # JE5
│ │ ├── diagnostic/ # JE5
6. TypeScript Standards
Strict mode is always on.
No exceptions.
│ │ └── progress/ # JE5
│ │
│ ├── hooks/
│ │ └── useSupabase.ts # Returns typed Supabase client from context
│ │
│ └── utils/
│ ├── sr.utils.ts
│ ├── card.utils.ts
│ ├── date.utils.ts
│ └── xp.utils.ts
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── .eslintrc.cjs
├── .prettierrc
├── .env.development
├── .env.staging
├── .env.production
├── .env.example # committed — shows required vars with no values
└── package.json
json
// tsconfig.json
{
"compilerOptions"
:
{
"strict"
:
true
,
"noImplicitAny"
:
true
,
"strictNullChecks"
:
true
,
"noUnusedLocals"
:
true
,
"noUnusedParameters"
:
true
,
"noUncheckedIndexedAccess"
:
true
}
}
Rules Every Engineer Follows
Type Definitions (Senior Engineer maintains these)
typescript
// ❌ NEVER — no `any`
const
handleData
=
(
data
:
any
)
=>
{
...
}
// ✅ Always type your data
const
handleData
=
(
data
:
Card
)
=>
{
...
}
// ❌ NEVER — no type assertions without a comment explaining why
const
card
=
data
as
Card
;
// ✅ Use proper type guards
const
isCard
=
(
data
:
unknown
)
:
data
is
Card
=>
{
return
typeof
data
===
'object'
&&
data
!==
null
&&
'id'
in
data
;
}
;
// ❌ NEVER — no inline object types in component props
const
CardDisplay
=
(
{
card
:
{
id
:
string
,
title
:
string
}
}
)
=>
{
...
}
// ✅ Always define prop types separately
interface
CardDisplayProps
{
card
:
Card
;
onAnswer
:
(
optIdx
:
number
)
=>
void
;
isRevealed
:
boolean
;
}
const
CardDisplay
=
(
{
card
,
onAnswer
,
isRevealed
}
:
CardDisplayProps
)
=>
{
...
}
// ❌ NEVER — no non-null assertions without certainty
const
name
=
student
!
.
nickname
;
// ✅ Handle the null case explicitly
const
name
=
student
?.
nickname
??
'Nurse'
;
typescript
// src/types/card.types.ts
export
type
CardCategory
=
|
'Management of Care'
|
'Safety and Infection Control'
|
'Pharmacology'
|
'Physiological Adaptation'
|
'Reduction of Risk'
|
'Basic Care & Comfort'
|
'Health Promotion'
|
'Psychosocial Integrity'
;
export
type
DifficultyLevel
=
1
|
2
|
3
|
4
|
5
;
export
type
DifficultyLabel
=
'Foundation'
|
'Application'
|
'Analysis'
|
'Complex'
export
interface
Card
{
id
:
string
;
title
:
string
;
cat
:
CardCategory
;
question
:
string
;
opt_a
:
string
;
opt_b
:
string
;
opt_c
:
string
;
opt_d
:
string
;
correct
:
0
|
1
|
2
|
3
;
layer_1
:
string
;
layer_2
:
string
;
layer_3
:
string
;
layer_4
:
string
;
pearl
:
string
;
mnemonic
:
string
;
why_wrong_a
:
string
;
why_wrong_b
:
string
;
why_wrong_c
:
string
;
why_wrong_d
:
string
;
difficulty_level
:
DifficultyLevel
;
difficulty_label
:
DifficultyLabel
;
xp
:
number
;
}
export
interface
CardProgress
{
card_id
:
string
;
student_id
:
string
;
times_seen
:
number
;
7. Component Standards
Component File Structure
times_correct
:
number
;
times_wrong
:
number
;
ease_factor
:
number
;
next_review
:
string
;
last_seen
:
string
;
}
// src/types/session.types.ts
export
type
SessionMode
=
'study'
|
'test'
;
export
type
SessionPool
=
'all'
|
'new'
|
'missed'
;
export
interface
Session
{
id
:
string
;
student_id
:
string
;
name
:
string
;
mode
:
SessionMode
;
card_count
:
number
;
correct
:
number
;
wrong
:
number
;
xp
:
number
;
completed
:
boolean
;
created_at
:
string
;
}
// src/types/student.types.ts
export
type
TesterType
=
'first_time'
|
'repeat'
|
'international'
|
'lpn_transition
export
type
ConfidenceLevel
=
'low'
|
'medium'
|
'high'
;
export
interface
Student
{
id
:
string
;
nickname
:
string
;
tester_type
:
TesterType
;
confidence
:
ConfidenceLevel
;
test_date
:
string
|
null
;
daily_cards
:
number
;
onboarded
:
boolean
;
}
Every component follows the same structure. No exceptions.
typescript
// src/features/session/components/CardScreen.tsx
// 1. External imports (alphabetical)
import
{
useCallback
,
useEffect
}
from
'react'
;
import
{
useNavigate
}
from
'react-router-dom'
;
// 2. Internal imports — types first, then hooks, then components, then utils
import
type
{
Card
}
from
'@/types/card.types'
;
import
{
useSession
}
from
'@/features/session/hooks/useSession'
;
import
{
useSREngine
}
from
'@/features/sr/hooks/useSREngine'
;
import
{
AnswerOption
}
from
'./AnswerOption'
;
import
{
SessionHUD
}
from
'./SessionHUD'
;
import
{
shuffleOptions
}
from
'@/utils/card.utils'
;
// 3. Types for THIS component
interface
CardScreenProps
{
onSessionComplete
:
(
)
=>
void
;
}
// 4. Component — one per file, always default export
const
CardScreen
=
(
{
onSessionComplete
}
:
CardScreenProps
)
=>
{
// 4a. Hooks first (same order every time: store hooks, data hooks, local state)
const
{
cards
,
currentIdx
,
results
,
answer
,
isComplete
}
=
useSession
(
)
;
const
{
srScore
}
=
useSREngine
(
)
;
const
navigate
=
useNavigate
(
)
;
// 4b. Derived state
const
currentCard
=
cards
[
currentIdx
]
;
const
progress
=
(
currentIdx
/
cards
.
length
)
*
100
;
// 4c. Effects
useEffect
(
(
)
=>
{
if
(
isComplete
)
onSessionComplete
(
)
;
}
,
[
isComplete
,
onSessionComplete
]
)
;
// 4d. Handlers — useCallback for handlers passed as props
const
handleAnswer
=
useCallback
(
(
optIdx
:
number
)
=>
{
answer
(
optIdx
)
;
}
,
[
answer
]
)
;
// 4e. Early returns (loading, error, empty states)
if
(
!
currentCard
)
return
<
LoadingSpinner
/
>
;
UI Component Rules
// 4f. Render
return
(
<
div className
=
"flex flex-col h-full bg-navy-950"
>
<
SessionHUD
progress
=
{
progress
}
/
>
<
CardDisplay
card
=
{
currentCard
}
onAnswer
=
{
handleAnswer
}
/
>
<
/
div
>
)
;
}
;
// 5. Always default export at the bottom
export
default
CardScreen
;
typescript
// Shared UI components (in src/components/ui/) take ONLY generic props
// They NEVER import from features/ or stores/
// ✅ Correct — generic, reusable
interface
ButtonProps
{
variant
:
'primary'
|
'secondary'
|
'ghost'
|
'danger'
;
size
?
:
'sm'
|
'md'
|
'lg'
;
isLoading
?
:
boolean
;
isDisabled
?
:
boolean
;
children
:
React
.
ReactNode
;
onClick
?
:
(
)
=>
void
;
}
const
Button
=
(
{
variant
,
size
=
'md'
,
isLoading
=
false
,
isDisabled
=
false
,
children
,
onClick
,
}
:
ButtonProps
)
=>
{
const
baseClasses
=
'rounded-xl font-semibold transition-all duration-200'
;
const
variantClasses
=
{
primary
:
'bg-yellow-400 text-navy-950 hover:bg-yellow-300 active:scale-95'
,
secondary
:
'bg-navy-800 text-white hover:bg-navy-700'
,
ghost
:
'bg-transparent text-gray-400 hover:text-white'
,
danger
:
'bg-red-500 text-white hover:bg-red-400'
,
}
;
const
sizeClasses
=
{
sm
:
'px-4 py-2 text-sm'
,
md
:
'px-6 py-3 text-base'
,
lg
:
'px-8 py-4 text-lg w-full'
,
}
;
return
(
<
button
onClick
=
{
onClick
}
disabled
=
{
isDisabled
||
isLoading
}
className
=
{
`
${
baseClasses
}
${
variantClasses
[
variant
]
}
${
sizeClasses
[
size
]
}
${
isDisabled
||
isLoading
?
'opacity-50 cursor-not-allowed'
:
''
}
Presentational vs Feature Components
8. State Management Standards
Store Structure (Zustand)
Every store follows this pattern:
`
}
>
{
isLoading
?
<
LoadingSpinner
size
=
"sm"
/
>
:
children
}
<
/
button
>
)
;
}
;
src/components/ui/ — Presentational. No business logic. No store access.
Receives everything via props. Fully reusable.
src/features/*/components/ — Feature components. Can access their domain's
store and hooks. Cannot access other domains'
stores directly (use props or context).
typescript
// src/store/sessionStore.ts
import
{
create
}
from
'zustand'
;
import
{
devtools
}
from
'zustand/middleware'
;
import
type
{
Card
,
CardCategory
}
from
'@/types/card.types'
;
import
type
{
SessionMode
,
SessionPool
}
from
'@/types/session.types'
;
// 1. State interface — what data lives here
interface
SessionState
{
mode
:
SessionMode
;
pool
:
SessionPool
;
cards
:
Card
[
]
;
currentIdx
:
number
;
results
:
boolean
[
]
;
answers
:
number
[
]
;
sessionId
:
string
|
null
;
isActive
:
boolean
;
qCount
:
number
;
}
// 2. Actions interface — what can change the state
interface
SessionActions
{
setMode
:
(
mode
:
SessionMode
)
=>
void
;
setPool
:
(
pool
:
SessionPool
)
=>
void
;
setCards
:
(
cards
:
Card
[
]
)
=>
void
;
answer
:
(
optIdx
:
number
)
=>
void
;
nextCard
:
(
)
=>
void
;
startSession
:
(
sessionId
:
string
)
=>
void
;
endSession
:
(
)
=>
void
;
reset
:
(
)
=>
void
;
}
// 3. Initial state — always defined separately so reset() can use it
const
initialState
:
SessionState
=
{
mode
:
'study'
,
pool
:
'all'
,
cards
:
[
]
,
currentIdx
:
0
,
results
:
[
]
,
answers
:
[
]
,
sessionId
:
null
,
isActive
:
false
,
qCount
:
10
,
}
;
// 4. Store creation
export
const
useSessionStore
=
create
<
SessionState
&
SessionActions
>
(
)
(
devtools
(
(
set
,
get
)
=>
(
{
...
initialState
,
setMode
:
(
mode
)
=>
set
(
{
mode
}
,
false
,
'session/setMode'
)
,
setPool
:
(
pool
)
=>
set
(
{
pool
}
,
false
,
'session/setPool'
)
,
setCards
:
(
cards
)
=>
set
(
{
cards
}
,
false
,
'session/setCards'
)
,
answer
:
(
optIdx
)
=>
{
const
{
cards
,
currentIdx
}
=
get
(
)
;
const
card
=
cards
[
currentIdx
]
;
if
(
!
card
)
return
;
const
isCorrect
=
optIdx
===
card
.
correct
;
set
(
(
state
)
=>
(
{
results
:
[
...
state
.
results
,
isCorrect
]
,
answers
:
[
...
state
.
answers
,
optIdx
]
,
}
)
,
false
,
'session/answer'
)
;
}
,
nextCard
:
(
)
=>
set
(
(
state
)
=>
(
{
currentIdx
:
state
.
currentIdx
+
1
}
)
,
false
,
'session/nextCard'
)
,
startSession
:
(
sessionId
)
=>
set
(
{
sessionId
,
isActive
:
true
}
,
false
,
'session/start'
)
,
endSession
:
(
)
=>
set
(
{
isActive
:
false
}
,
false
,
'session/end'
)
,
reset
:
(
)
=>
set
(
initialState
,
false
,
'session/reset'
)
,
}
)
,
{
name
:
'SessionStore'
}
Rules
Stores hold
client state only
— server data lives in TanStack Query cache
Never put server response data directly into a store — use TanStack Query
One store per domain — no cross-domain store imports
Every
set()
call has a descriptive action name (third argument) for devtools
Server State (TanStack Query)
)
)
;
typescript
// src/features/session/hooks/useCards.ts
import
{
useQuery
}
from
'@tanstack/react-query'
;
import
{
useAuthStore
}
from
'@/store/authStore'
;
import
{
fetchCards
}
from
'@/features/session/services/cards.service'
;
export
const
useCards
=
(
)
=>
{
const
{
supaStudentId
}
=
useAuthStore
(
)
;
return
useQuery
(
{
queryKey
:
[
'cards'
]
,
queryFn
:
fetchCards
,
staleTime
:
1000
*
60
*
60
,
// Cards don't change — cache for 1 hour
enabled
:
!
!
supaStudentId
,
// Don't fetch until authenticated
}
)
;
}
;
// src/features/sr/hooks/useSREngine.ts
import
{
useQuery
,
useMutation
,
useQueryClient
}
from
'@tanstack/react-query'
;
import
{
useAuthStore
}
from
'@/store/authStore'
;
import
{
useStudentStore
}
from
'@/store/studentStore'
;
import
{
fetchCardProgress
,
upsertCardProgress
}
from
'@/features/sr/services/progre
import
{
buildSRPool
,
calculateNextReview
}
from
'@/utils/sr.utils'
;
export
const
useSREngine
=
(
)
=>
{
const
{
supaStudentId
}
=
useAuthStore
(
)
;
const
{
testDays
}
=
useStudentStore
(
)
;
const
queryClient
=
useQueryClient
(
)
;
const
{
data
:
cardProgress
=
{
}
}
=
useQuery
(
{
queryKey
:
[
'cardProgress'
,
supaStudentId
]
,
queryFn
:
(
)
=>
fetchCardProgress
(
supaStudentId
!
)
,
enabled
:
!
!
supaStudentId
,
staleTime
:
1000
*
60
*
5
,
}
)
;
const
{
mutate
:
saveProgress
}
=
useMutation
(
{
mutationFn
:
upsertCardProgress
,
onSuccess
:
(
)
=>
{
queryClient
.
invalidateQueries
(
{
queryKey
:
[
'cardProgress'
]
}
)
;
}
,
}
)
;
9. Testing Requirements
Coverage Requirements by Domain
Domain
Unit Tests
Integration Tests
Requirement
SR Engine
✅ Required
✅ Required
90%+ coverage — this is the intelligence of the app
Auth
✅ Required
✅ Required
All happy paths + error states
Session/Cards
✅ Required
✅ Required
Answer flow, pool building, session save
Onboarding
✅ Required
—
All 4 steps, data persistence
Dashboard
✅ Required
—
Stats calculation, empty states
Test File Structure
Test Example — SR Engine (most critical)
return
{
cardProgress
,
buildSRPool
,
saveProgress
}
;
}
;
src/features/sr/
├── services/
│ ├── progress.service.ts
│ └── progress.service.test.ts ← unit test lives next to source
├── hooks/
│ └── useSREngine.ts
└── __tests__/
└── useSREngine.integration.test.ts ← integration tests in __tests__/
src/utils/
├── sr.utils.ts
└── sr.utils.test.ts
typescript
// src/utils/sr.utils.test.ts
import
{
describe
,
it
,
expect
}
from
'vitest'
;
import
{
srScore
,
buildSRPool
,
calculateNextReview
}
from
'./sr.utils'
;
import
type
{
Card
}
from
'@/types/card.types'
;
import
type
{
CardProgress
}
from
'@/types/card.types'
;
const
mockCard
:
Card
=
{
id
:
'card-1'
,
cat
:
'Management of Care'
,
difficulty_level
:
3
,
// ... other required fields
}
;
const
mockProgress
:
CardProgress
=
{
card_id
:
'card-1'
,
times_seen
:
3
,
times_correct
:
2
,
times_wrong
:
1
,
ease_factor
:
2.4
,
next_review
:
new
Date
(
Date
.
now
(
)
-
86400000
)
.
toISOString
(
)
,
// overdue by 1 day
last_seen
:
new
Date
(
)
.
toISOString
(
)
,
student_id
:
'student-1'
,
}
;
describe
(
'srScore'
,
(
)
=>
{
it
(
'returns 9999 for never-seen cards'
,
(
)
=>
{
const
score
=
srScore
(
mockCard
,
{
}
)
;
expect
(
score
)
.
toBe
(
9999
)
;
}
)
;
it
(
'applies MOC category weight of 1.3x'
,
(
)
=>
{
const
mocCard
=
{
...
mockCard
,
cat
:
'Management of Care'
as
const
}
;
const
otherCard
=
{
...
mockCard
,
id
:
'card-2'
,
cat
:
'Psychosocial Integrity'
as
const
progress
=
{
'card-1'
:
mockProgress
,
'card-2'
:
mockProgress
}
;
const
mocScore
=
srScore
(
mocCard
,
progress
)
;
const
otherScore
=
srScore
(
otherCard
,
progress
)
;
expect
(
mocScore
)
.
toBeGreaterThan
(
otherScore
)
;
}
)
;
it
(
'applies urgency mode cap of 7 days when exam within 30 days'
,
(
)
=>
{
const
result
=
calculateNextReview
(
{
existing
:
mockProgress
,
wasCorrect
:
true
,
difficultyLevel
:
5
,
testDays
:
15
,
// within 30 days
}
)
;
const
daysUntilReview
=
(
new
Date
(
result
.
next_review
)
.
getTime
(
)
-
Date
.
now
(
)
)
/
(
1000
*
60
*
60
*
24
)
;
expect
(
daysUntilReview
)
.
toBeLessThanOrEqual
(
7
)
;
}
)
;
it
(
'pushes L4-L5 correct answers further out with 2.5x multiplier'
,
(
)
=>
{
const
l2Result
=
calculateNextReview
(
{
existing
:
mockProgress
,
wasCorrect
:
true
,
difficultyLevel
:
2
,
testDays
:
90
,
}
)
;
const
l5Result
=
calculateNextReview
(
{
existing
:
mockProgress
,
wasCorrect
:
true
,
difficultyLevel
:
5
,
testDays
:
90
,
}
)
;
expect
(
new
Date
(
l5Result
.
next_review
)
.
getTime
(
)
)
.
toBeGreaterThan
(
new
Date
(
l2Result
.
next_review
)
.
getTime
(
)
)
;
}
)
;
}
)
;
describe
(
'buildSRPool'
,
(
)
=>
{
it
(
'places never-seen cards at the front of the pool'
,
(
)
=>
{
const
cards
=
[
mockCard
,
{
...
mockCard
,
id
:
'unseen'
}
]
;
const
progress
=
{
'card-1'
:
mockProgress
}
;
const
pool
=
buildSRPool
(
cards
,
progress
,
2
)
;
expect
(
pool
[
0
]
.
id
)
.
toBe
(
'unseen'
)
;
}
)
;
}
)
;
10. Git Workflow & PR Process
Commit Message Format (Conventional Commits)
Pull Request Template
type(scope): short description
Types: feat | fix | refactor | test | chore | docs | style | perf
Examples:
feat(auth): add forgot password screen with email reset flow
fix(sr): correct urgency mode interval cap calculation
test(sr): add unit tests for buildSRPool never-seen card priority
chore(ci): add lint-staged pre-commit hook
docs(readme): update environment setup instructions
refactor(session): extract card pool logic into useCardPool hook
perf(dashboard): memoize strengths/weaknesses calculation
markdown
Code Review Standards
Senior Engineer reviews every PR against:
1.
Does it follow the folder structure?
2.
Are TypeScript types correct and non-
any
?
3.
Does the component follow the file structure template?
4.
Is the business logic in a hook, not a component?
5.
Does it have tests?
6.
Does it respect domain boundaries?
7.
Is it reading from the correct store?
##
What this PR does
[1-2 sentences describing the change]
##
Domain
[ ] Auth (JE1) [ ] Onboarding/Profile (JE2) [ ] Session/Cards (JE3)
[ ] SR Engine (JE4) [ ] Dashboard/Analytics (JE5) [ ] Shared/Infra (SE)
##
Type of change
[ ] New feature [ ] Bug fix [ ] Refactor [ ] Tests [ ] Chore
##
Testing
-
[ ] Unit tests added/updated
-
[ ] All existing tests pass locally (
`npm run test`
)
-
[ ] Manually tested in sandbox environment
##
Definition of Done checklist
-
[ ] TypeScript compiles with no errors (
`npm run type-check`
)
-
[ ] ESLint passes with no warnings (
`npm run lint`
)
-
[ ] No
`any`
types introduced
-
[ ] No console.log statements left in production code
-
[ ] Component has PropTypes (TypeScript interface)
-
[ ] Tests written for new logic
-
[ ] No breaking changes to other domains' interfaces
##
Screenshots (if UI change)
[Before / After]
##
Notes for reviewer
[Anything the reviewer should specifically look at]
11. Definition of Done
A ticket is not done until every item is checked.
CODE QUALITY:
[ ] TypeScript compiles: npm run type-check passes with 0 errors
[ ] Linting passes: npm run lint passes with 0 warnings
[ ] No `any` types
[ ] No TODO comments (create a ticket instead)
[ ] No console.log in production paths (use logger utility)
[ ] All magic numbers replaced with named constants
TESTING:
[ ] Unit tests written for all new utility functions
[ ] Unit tests written for store actions
[ ] Component renders without errors in tests
[ ] All existing tests still pass
COMPONENT STANDARDS:
[ ] Props interface defined and exported
[ ] Component follows file structure template
[ ] Presentational components have no store imports
[ ] useCallback on all handlers passed as props
STATE:
[ ] No direct store mutation outside of store actions
[ ] Server data fetched via TanStack Query, not stored in Zustand
[ ] Loading and error states handled
ACCESSIBILITY:
[ ] Interactive elements have aria-label or visible text
[ ] Focus management works on modal open/close
[ ] Color is not the only indicator of state
ENVIRONMENTS:
[ ] No hardcoded URLs (use env config)
[ ] Feature works in sandbox environment
[ ] No Supabase URL or keys in source code
12. Architecture Decision Records
ADRs document why a technology was chosen. Any future engineer reading this understandsthe reasoning.
ADR-001: Zustand over Redux for state management
Date: 2025-04-12 | Status: Accepted
Redux is the industry standard at large scale (Netflix, Airbnb). For a startup with 5 engineers anda focused domain, Redux introduces 3x more boilerplate with no benefit at this scale. Zustandprovides the same unidirectional data flow, devtools support, and store slicing with ~90% lesscode. Revisit if the team grows beyond 10 engineers or state complexity increases significantly.
ADR-002: TanStack Query for server state
Date: 2025-04-12 | Status: Accepted
Storing server responses in Zustand requires manual loading states, manual cache invalidation,and manual background refetch logic. TanStack Query handles all three automatically. Thisseparates server state (what's in the database) from client state (what the user is doing) — acritical architectural distinction.
ADR-003: Vite over Create React App
Date: 2025-04-12 | Status: Accepted
Create React App is officially deprecated as of 2023. Vite provides 10-100x faster dev serverstartup, native ES modules, and is the current community standard. The migration cost isminimal.
ADR-004: Feature-based folder structure over type-based
Date: 2025-04-12 | Status: Accepted
Type-based structure (
/components
,
/hooks
,
/services
at the root) groups files by what theyare. Feature-based structure groups files by what they do together. With 5 engineers owningseparate domains, feature-based structure means JE3 works entirely in
/features/session/
without touching files other engineers own. This minimizes merge conflicts and makes domainownership explicit.
ADR-005: TypeScript strict mode
Date: 2025-04-12 | Status: Accepted
Type safety at the boundary between Supabase data and React components is the highest-valueuse of TypeScript. Strict mode catches null reference errors, unused variables, and implicit any atcompile time rather than runtime. The upfront cost is higher; the production bug rate issignificantly lower.
This document is maintained by the Senior Engineer. Proposed changes require a PR with anupdated ADR.
