#!/usr/bin/env node

// Entry point for the IndexYourNiche CLI
import('../dist/index.js').catch((err) => {
  console.error('Failed to start CLI:', err.message);
  process.exit(1);
});
