// ─────────────────────────────────────────────────────────────────────────────
// Manejador global de errores de Express.
// Captura cualquier error que llegue con next(err) desde los controladores.
// Importante: los errores de APIs externas (OpenAI, Yahoo Finance) que devuelvan
// 401/403 se convierten en 502 para evitar que el frontend desloguee al usuario
// por un fallo del proveedor externo y no de nuestra API.
// ─────────────────────────────────────────────────────────────────────────────

const errorHandler = (err, _req, res, _next) => {
  console.error(err);

  // Evitar que errores externos (OpenAI, etc.) disparen un 401/403 en el cliente
  let status = err.status || err.statusCode || 500;
  if (err.external && (status === 401 || status === 403)) status = 502;

  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
};

module.exports = { errorHandler };
