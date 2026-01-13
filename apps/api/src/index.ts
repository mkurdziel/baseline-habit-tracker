import { buildServer } from './server.js';

async function start() {
  const server = await buildServer();

  // Start server
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    const localUrl = `http://localhost:${port}`;
    console.log(`\n🚀 API Server ready at ${localUrl}`);
    console.log(`   Health check: ${localUrl}/api/health\n`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
