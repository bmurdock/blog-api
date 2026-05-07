# Blog API

This project is a small Express and MongoDB API for a blog. It is intended as a teaching demo for students who are learning how backend APIs are organized.

The code demonstrates:

- Creating an Express app and mounting routers.
- Splitting routes, controllers, models, and middleware into separate files.
- Using Mongoose schemas to describe MongoDB documents.
- Validating request data before saving it.
- Returning useful HTTP status codes and JSON responses.
- Hashing passwords and issuing JWTs for protected routes.
- Checking simple ownership rules before changing protected resources.
- Keeping references safe with soft deletes.
- Writing small tests with Node's built-in test runner.

## Project Structure

```text
api.js                    Express app setup, middleware, routes, and startup
routes/                   URL definitions for each resource
controllers/              Request handlers and API validation
models/                   Mongoose schemas and models
middleware/               Reusable Express middleware
tests/                    Node test runner examples
package.json              npm scripts and dependencies
```

## Requirements

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB connection string

The default database URL is:

```sh
mongodb://lvh.me:27017/blog
```

You can override it with the `blogDB` environment variable.

## Setup

Install dependencies:

```sh
npm install
```

Start the API:

```sh
npm start
```

Start the API with a local MongoDB URL:

```sh
blogDB=mongodb://localhost:27017/blog npm start
```

The API listens on port `3131` by default. You can override it with `PORT`:

```sh
PORT=4000 npm start
```

## Authentication Setup

JWTs need a signing secret. For local development, the app can use a development fallback secret. For a real app, set one of these instead:

```sh
JWT_SECRET=replace-this-with-a-long-random-value npm start
```

or:

```sh
JWT_KEY_PATH=/path/to/key.pem npm start
```

Do not commit real private keys or production secrets.

## Available Endpoints

### Health

```text
GET /health
```

Returns:

```json
{ "status": "ok" }
```

### Users

```text
GET    /users
GET    /users/:id
POST   /users
POST   /users/login
PUT    /users/:id       protected
DELETE /users/:id       protected
```

Create a user:

```sh
curl -X POST http://localhost:3131/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret"}'
```

Log in:

```sh
curl -X POST http://localhost:3131/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret"}'
```

The login response includes a JWT token.

### Categories

```text
GET    /categories
POST   /categories      protected, admin only
PUT    /categories/:id  protected, admin only
DELETE /categories/:id  protected, admin only
```

Create a category:

```sh
curl -X POST http://localhost:3131/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"JavaScript","icon":"code"}'
```

### Posts

```text
GET    /posts
GET    /posts/category/:category
POST   /posts           protected
PUT    /posts/:id       protected
DELETE /posts/:id       protected
```

Create a post. The API uses the JWT to decide the author, so the client does
not send an `author` field:

```sh
curl -X POST http://localhost:3131/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"title":"First post","body":"Hello API","category":"CATEGORY_ID"}'
```

## Pagination

List endpoints accept `page` and `limit` query parameters:

```text
GET /posts?page=2&limit=10
```

The API defaults to `limit=20` and caps the maximum limit at `100`.
Only whole positive numbers are accepted. Values such as `?limit=10abc` fall
back to the default instead of being partly parsed. The API also caps very large
page numbers so one request cannot ask MongoDB to skip an unbounded number of
documents.

## Protected Routes

Protected routes require this header:

```text
Authorization: Bearer YOUR_TOKEN_HERE
```

The token comes from `POST /users/login`.

Protected user routes only allow a user to update or delete their own user
record. Protected post routes only allow the post author to edit or delete the
post. Category write routes change shared data for the whole blog, so they
require an admin user.

The demo keeps admin support intentionally small: users have a `role` field with
the default value `student`. The JWT identifies the user, and the middleware
checks MongoDB to see whether that user is currently an admin. For a local
lesson, create a normal user first, then promote that user directly in MongoDB:

```sh
mongosh blog --eval 'db.users.updateOne({ username: "alice" }, { $set: { role: "admin" } })'
```

If a user is demoted later, admin-only routes stop working immediately because
the role check reads the current user document.

## Data Integrity Notes

Posts store references to users and categories. MongoDB does not automatically
check that referenced documents exist, so the API checks those references when a
post is created or when its category changes.

Deleting a user or category uses a soft delete. The API sets `deletedAt` instead
of removing the document from MongoDB. Normal list and login queries hide soft
deleted records, but old posts still point at real user and category documents.
This avoids dangling references without introducing MongoDB transactions in a
beginner demo.

Soft-deleted users still reserve their username and email. That makes deletion
behave like account deactivation: the identity remains part of the blog history,
and another person cannot later take the same username or email. Reusing those
fields would require a more advanced database index strategy, so this demo keeps
the rule explicit and simple.

Posts are treated as archived content. Deleting a user or category does not hide
old posts, and `GET /posts/category/:category` can still return posts for a
soft-deleted category id. Creating new posts and changing a post category still
require active users and categories.

Post updates and deletes include the authenticated user's id in the write query.
That means the database operation itself only matches a post owned by the user.
If nothing matches, the controller does one small follow-up check so students can
still see clear `404 Not Found` versus `403 Forbidden` responses.

## Running Tests

Run the test suite:

```sh
npm test
```

The tests use Node's built-in `node:test` module. Most controller tests mock Mongoose methods so they can run without a real MongoDB database.

## Learning Notes

- A route decides which controller function should handle a URL.
- A controller reads the request, validates inputs, calls a model, and sends a response.
- A model defines the shape and rules for database documents.
- Middleware is reusable code that runs before a controller.
- HTTP status codes communicate what happened: `200` for success, `400` for bad input, `401` for missing or invalid auth, `404` for not found, and `409` for a conflict.
