# Workout Tracker v3 plan

## Main goal

Workout Tracker v3 turns the app from a local single-user tracker into a multi-user app.

The key change is ownership:

- a user owns workouts;
- workouts contain exercises;
- exercises contain sets;
- API endpoints must never return or modify another user's data.

That means v3 is mostly about backend architecture, authentication, authorization, and only then frontend auth flow.

## Recommended auth approach

Use JWT access tokens for v3.

Why JWT fits this learning project:

- it teaches API-style authentication clearly;
- it works well with FastAPI and `fetch`;
- it will still fit if the frontend later moves to React;
- the frontend can send the token in the `Authorization: Bearer <token>` header;
- protected endpoints become easy to understand through a FastAPI dependency like `get_current_user`.

Sessions are also valid, especially for server-rendered websites, but this project already behaves like an API plus static frontend. JWT matches that shape better.

For v3, keep it simple:

- short-lived access token;
- no refresh token yet;
- no roles/admin system yet;
- no email verification yet.

Later, when the basics are solid, you can revisit cookies, refresh tokens, CSRF, and production security.

## New concepts

Authentication answers: "Who are you?"

Authorization answers: "Are you allowed to do this?"

Login alone is not enough. Every protected query must respect ownership.

## Target database model

New table: `user`

Fields:

- `id`: primary key;
- `email`: unique, indexed, required;
- `hashed_password`: required;
- `created_at`: datetime, default current time.

For v3, prefer `email` over `username`. It is more realistic for auth and avoids deciding later how login identifiers should work.

Existing table: `workout`

Add:

- `user_id`: foreign key to `user.id`, required after migration is complete.

Relationship:

- `User.workouts`;
- `Workout.user`.

Workout ownership lives on `Workout`, not on every table. Exercise and set ownership is checked through their parent chain:

- set -> exercise -> workout -> user;
- exercise -> workout -> user.

This avoids duplicating `user_id` everywhere too early.

## Target backend structure

Keep the current v2 style:

```text
app/
  api/v1/
    auth.py
    workouts.py
    exercises.py
    sets.py
  repository/
    users.py
    workouts.py
    exercises.py
    sets.py
  service/
    auth.py
    users.py
    workouts.py
    exercises.py
    sets.py
  models.py
  schemas.py
  dependency.py
  database.py
  security.py
```

Suggested responsibility split:

- `models.py`: database tables and relationships;
- `schemas.py`: request and response shapes;
- `repository/users.py`: database queries for users;
- `service/auth.py`: register, login, password checks, token creation;
- `security.py`: password hashing and JWT helpers;
- `dependency.py`: database dependency and `get_current_user`;
- `api/v1/auth.py`: HTTP routes for register/login/me.

## Planned API endpoints

Public endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

Protected endpoints:

- `GET /api/v1/auth/me`
- `POST /api/v1/workouts`
- `GET /api/v1/workouts`
- `GET /api/v1/workouts/{workout_id}`
- `PATCH /api/v1/workouts/{workout_id}`
- `DELETE /api/v1/workouts/{workout_id}`
- `POST /api/v1/exercises`
- `PATCH /api/v1/exercises/{exercise_id}`
- `DELETE /api/v1/exercises/{exercise_id}`
- `POST /api/v1/sets`
- `PATCH /api/v1/sets/{set_id}`
- `DELETE /api/v1/sets/{set_id}`

## Request and response schemas

Add auth schemas:

```python
class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime
```

Later improvement:

- use Pydantic `EmailStr`;
- add password length validation;
- normalize email with `.lower().strip()`.

## Password hashing design

Never store plain text passwords.

Use a library such as `passlib` with bcrypt.

The app needs two small helper functions:

```python
def hash_password(password: str) -> str:
    ...


def verify_password(plain_password: str, hashed_password: str) -> bool:
    ...
```

Important idea:

- hashing is one-way;
- encryption is reversible with a key;
- passwords should be hashed, not encrypted;
- bcrypt automatically includes a salt, so we do not manually create one.

## JWT design

A JWT access token should contain a small amount of identity data.

For this project:

- `sub`: user id as string;
- `exp`: expiration time.

Do not put password, hashed password, or sensitive profile data inside the token.

The backend flow:

1. User logs in with email and password.
2. Backend verifies password.
3. Backend creates JWT.
4. Frontend stores token.
5. Frontend sends token with protected requests.
6. Backend decodes token in `get_current_user`.
7. Endpoint receives `current_user`.

## Migration plan

This should be done carefully because existing workouts do not have users yet.

Learning-friendly path:

1. Create `user` table.
2. Add `user_id` to `workout` as nullable.
3. Create a temporary/dev user manually or in migration.
4. Assign old workouts to that dev user.
5. Make `workout.user_id` non-nullable.
6. Add foreign key constraint and index.

For a personal learning project, this is easier to understand than trying to do everything in one migration.

## Step-by-step implementation plan

### Phase 1: design and dependencies

Goal: understand the architecture before changing behavior.

Tasks:

- choose JWT for v3;
- add required packages to `requirements.txt`;
- decide env variables:
  - `SECRET_KEY`;
  - `ALGORITHM`;
  - `ACCESS_TOKEN_EXPIRE_MINUTES`;
- document auth flow.

Checkpoint questions:

- What is the difference between authentication and authorization?
- Why do we hash passwords instead of encrypting them?
- Why should `SECRET_KEY` live in `.env`?

### Phase 2: User model and migration

Goal: add users to the database safely.

Tasks:

- add `User` model;
- add `User.workouts` relationship;
- add `Workout.user_id`;
- create Alembic migration;
- apply migration;
- inspect tables in DBeaver.

Checkpoint questions:

- Which table owns the relationship: `user` or `workout`?
- Why does `workout.user_id` point to `user.id`?
- What would break if old workouts had no `user_id`?

### Phase 3: schemas and user repository

Goal: create the data shapes and database helpers for users.

Tasks:

- add register/login/token/user response schemas;
- create `repository/users.py`;
- implement:
  - get user by id;
  - get user by email;
  - create user;
  - check if email exists.

Checkpoint questions:

- Why should the API response not include `hashed_password`?
- Should duplicate email return 400 or 409? Why?

### Phase 4: password hashing

Goal: safely store passwords.

Tasks:

- create `security.py`;
- add `hash_password`;
- add `verify_password`;
- manually test that the same password does not store as plain text.

Checkpoint questions:

- Why can two hashes for the same password look different?
- Why should we not write our own password hashing algorithm?

### Phase 5: register endpoint

Goal: create users from API.

Tasks:

- create `service/auth.py`;
- create `api/v1/auth.py`;
- add `POST /auth/register`;
- include auth router in `main.py`;
- test with FastAPI docs or a request client.

Checkpoint questions:

- Where should duplicate email validation live?
- Why does route code stay thin?

### Phase 6: login and JWT

Goal: issue tokens for valid users.

Tasks:

- add token creation helper;
- add login service;
- add `POST /auth/login`;
- return `TokenResponse`;
- test valid and invalid login.

Checkpoint questions:

- What does the frontend need from login?
- Why is the token returned only after password verification?

### Phase 7: current user dependency

Goal: teach FastAPI how to read the logged-in user.

Tasks:

- add OAuth2 bearer dependency;
- decode token;
- load user from database;
- return `current_user`;
- add `GET /auth/me`.

Checkpoint questions:

- Why does `get_current_user` need the database?
- What should happen if the token is missing, expired, or invalid?

### Phase 8: protect workouts

Goal: users can see only their own workouts.

Tasks:

- add `current_user` dependency to workout endpoints;
- create workouts with `user_id=current_user.id`;
- filter workout list by `user_id`;
- fetch workout detail by both `workout_id` and `user_id`;
- update/delete only by both `workout_id` and `user_id`.

Checkpoint questions:

- Why is `filter(Workout.id == workout_id)` no longer enough?
- Why should a forbidden/missing workout usually return 404 here?

### Phase 9: protect exercises and sets

Goal: nested resources also respect workout ownership.

Tasks:

- when creating exercise, verify parent workout belongs to current user;
- when editing/deleting exercise, verify exercise belongs to a workout owned by current user;
- when creating set, verify parent exercise belongs to current user's workout;
- when editing/deleting set, verify set belongs to current user's workout through exercise.

Checkpoint questions:

- Why not trust `workout_id` or `exercise_id` from the frontend?
- How can a JOIN help check ownership?

### Phase 10: frontend auth flow

Goal: let a user register, login, logout, and use protected API.

Tasks:

- add auth state:
  - current token;
  - current user;
  - logged-in/logged-out UI mode;
- add register form;
- add login form;
- add logout button;
- add helper for authenticated fetch;
- hide workouts until logged in;
- handle 401 by logging user out or showing login screen.

Checkpoint questions:

- Where does the token live in JavaScript?
- Why must every protected `fetch` include the `Authorization` header?
- What should the UI show while checking `/auth/me`?

### Phase 11: frontend structure review

Goal: decide whether vanilla JS is still comfortable.

Stay with vanilla JS if:

- auth state remains understandable;
- render functions are still readable;
- event handlers are easy to find.

Consider React if:

- UI state becomes hard to synchronize;
- too many functions manually rebuild the DOM;
- forms and conditional screens start spreading across the file.

Do not move to React just because it is popular. Move when it solves a real problem you can already feel.

### Phase 12: polish and v4 preparation

Goal: leave v3 stable and understandable.

Tasks:

- improve error messages;
- improve mobile layout lightly;
- update README;
- document auth flow;
- add simple manual test checklist;
- prepare ideas for progress charts and analytics in v4.

## Suggested first coding task

Do not start with JWT immediately.

Start with the database identity layer:

1. Add `User` model.
2. Add `user_id` to `Workout`.
3. Create migration.
4. Verify in DBeaver.

This gives the rest of auth somewhere real to attach.

## First model sketch

This is only a sketch, not final code to paste blindly:

```python
class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now())

    workouts = relationship("Workout", back_populates="user")
```

Workout will later receive:

```python
user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"))
user = relationship("User", back_populates="workouts")
```

Migration detail: because existing workouts already exist, `user_id` may need to be nullable at first, then filled, then made required.

## Manual test checklist for v3

Backend:

- register new user;
- duplicate email fails;
- login with correct password succeeds;
- login with wrong password fails;
- `/auth/me` works with token;
- `/auth/me` fails without token;
- user A cannot see user B workouts;
- user A cannot edit/delete user B workout;
- user A cannot add exercise to user B workout;
- user A cannot edit/delete user B exercise;
- user A cannot add/edit/delete sets inside user B workout.

Frontend:

- logged-out user sees login/register;
- logged-in user sees workouts;
- logout hides private data;
- refresh behavior is understood and intentional;
- expired/invalid token is handled.

## Current decision log

- Use JWT access tokens for v3.
- Use `email` as the login identifier.
- Keep vanilla JS for now.
- Keep current backend layering.
- Add React only if frontend state becomes painful enough to justify it.
- Start implementation with `User` model and database ownership, not with UI.
