// Environment variable validation

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = !isDevelopment;

  // Production-only requirements
  if (isProduction) {
    // API keys for core functionality
    if (!process.env.VALYU_API_KEY) {
      warnings.push('VALYU_API_KEY missing - patent/web search will fail');
    }
    if (!process.env.DAYTONA_API_KEY) {
      warnings.push('DAYTONA_API_KEY missing - code execution will fail');
    }
    if (!process.env.OPENAI_API_KEY) {
      warnings.push('OPENAI_API_KEY missing - will use Vercel AI Gateway');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function logEnvironmentStatus(): void {
  const validation = validateEnvironment();

  if (!validation.valid) {
    validation.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
}
