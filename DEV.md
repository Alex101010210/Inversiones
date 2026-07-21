<!-- Root-level dev launcher docs -->
# Investment ERP – Root

Run `backend` and `frontend` in two separate terminals, or install `concurrently`:

```bash
npm init -y
npm install -D concurrently
```

Then add to `package.json`:
```json
{
  "scripts": {
    "dev": "concurrently \"cd backend && npm run dev\" \"cd frontend && npm run dev\""
  }
}
```
