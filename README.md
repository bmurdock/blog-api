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
POST   /categories      protected
PUT    /categories/:id  protected
DELETE /categories/:id  protected
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

## Protected Routes

Protected routes require this header:

```text
Authorization: Bearer YOUR_TOKEN_HERE
```

The token comes from `POST /users/login`.

Protected user routes only allow a user to update or delete their own user
record. Protected post routes only allow the post author to edit or delete the
post. Category write routes are protected by login, but this demo does not add
roles or admin permissions because that would distract from the basic API flow.

## Data Integrity Notes

Posts store references to users and categories. MongoDB does not automatically
check that referenced documents exist, so the API checks those references when a
post is created or when its category changes.

Deleting a user or category is blocked while posts still reference it. In a
production app, that check and the delete would usually run in a transaction or
be replaced by a soft-delete policy. This teaching repo keeps that part simple
so students can see the basic relationship check without learning MongoDB
transactions first.

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
