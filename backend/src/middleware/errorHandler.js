const errorHandler = (err, _req, res, _next) => {
  console.error(err);
  // Errores de APIs externas (OpenAI, etc.) nunca deben reenviar 401/403
  // al cliente porque dispararían un deslogueo involuntario
  let status = err.status || err.statusCode || 500;
  if (err.external && (status === 401 || status === 403)) status = 502;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
};

module.exports = { errorHandler };
