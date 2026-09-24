# Vercel deployment

## Vercel project settings

Import this repository into Vercel with the repository root as the project root. The included `vercel.json` builds `client` and routes `/api/*` to the Express function in `api/index.js`.

Create a Vercel Blob store and add its `BLOB_READ_WRITE_TOKEN` to the Vercel project environment variables. Add these variables for Production, Preview, and Development as needed:

- `MONGO_URI`: the MongoDB Atlas connection string
- `JWT_SECRET`: a long random signing secret
- `BLOB_READ_WRITE_TOKEN`: the read/write token from the Vercel Blob store
- `NODE_ENV`: `production`

MongoDB Atlas must allow connections from Vercel. For a first deployment, allow `0.0.0.0/0` in Atlas Network Access and rely on the database user password and application authorization; narrow the rule later if your hosting network policy supports it.

## Upload API

Authenticated admin and staff users can upload any file with:

```text
POST /api/uploads
Content-Type: multipart/form-data
field: file
```

The response contains the public Blob `url` and `pathname`. Track creation also accepts an optional `file` field at `POST /api/tracks`; the returned Blob metadata is stored with the track document in MongoDB. Files are held in memory only for the request and are never written to the Vercel filesystem.

The upload limit is 50 MB. Do not commit `server/.env`; use `server/.env.example` as the variable reference.
