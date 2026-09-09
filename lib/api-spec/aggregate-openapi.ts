import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modulesDir = path.join(__dirname, 'modules');
const outputFile = path.join(__dirname, 'openapi.yaml');

// Read all module files
const moduleFiles: string[] = fs.readdirSync(modulesDir)
  .filter((file: string) => file.endsWith('.yaml'))
  .sort();

// Base OpenAPI structure
const aggregated: any = {
  openapi: '3.1.0',
  info: {
    title: 'Api',
    version: '0.1.0',
    description: 'Movie streaming platform API — enterprise modular monolith'
  },
  servers: [
    {
      url: '/api',
      description: 'Base API path'
    }
  ],
  tags: [],
  paths: {},
  components: {
    schemas: {},
    securitySchemes: {}
  }
};

// Aggregate all modules
for (const file of moduleFiles) {
  const filePath = path.join(modulesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const module = yaml.load(content) as any;

  // Merge tags
  if (module.tags) {
    aggregated.tags.push(...module.tags);
  }

  // Merge paths
  if (module.paths) {
    Object.assign(aggregated.paths, module.paths);
  }

  // Merge schemas
  if (module.components?.schemas) {
    Object.assign(aggregated.components.schemas, module.components.schemas);
  }

  // Merge security schemes
  if (module.components?.securitySchemes) {
    Object.assign(aggregated.components.securitySchemes, module.components.securitySchemes);
  }
}

// Write aggregated file
fs.writeFileSync(outputFile, yaml.dump(aggregated), 'utf-8');

console.log('✅ OpenAPI spec aggregated successfully');
