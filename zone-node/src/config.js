/**
 * Configuration module for Zone Node
 */

function parseDatabaseConfig() {
  // Support SPRING_DATASOURCE_URL (e.g., jdbc:postgresql://traffic-db:5432/traffic_monitoring)
  const springUrl = process.env.SPRING_DATASOURCE_URL;
  const springUser = process.env.SPRING_DATASOURCE_USERNAME;
  const springPass = process.env.SPRING_DATASOURCE_PASSWORD;

  if (springUrl) {
    let cleanUrl = springUrl.replace(/^jdbc:/, '');
    try {
      const parsed = new URL(cleanUrl);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        database: parsed.pathname.replace(/^\//, ''),
        user: springUser || parsed.username || 'traffic_admin',
        password: springPass || parsed.password || 'traffic_secret',
      };
    } catch {
      // Fallback if URL parsing fails
    }
  }

  if (process.env.DATABASE_URL) {
    const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
    return {
      connectionString: process.env.DATABASE_URL,
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'traffic_monitoring',
    user: process.env.DB_USER || 'traffic_admin',
    password: process.env.DB_PASSWORD || 'traffic_secret',
  };
}

export const config = {
  port: parseInt(process.env.SERVER_PORT || process.env.PORT || '8081', 10),
  zoneId: (process.env.ZONE_ID || 'NORTH').toUpperCase(),
  zoneName: process.env.ZONE_NAME || 'North District',
  db: parseDatabaseConfig(),
};
