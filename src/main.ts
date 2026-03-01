// main.ts - Entry point of the Angular application
// This file bootstraps the Angular application using the standalone approach

import { bootstrapApplication } from '@angular/platform-browser'; // Function to bootstrap standalone Angular apps
import { appConfig } from './app/app.config'; // Application configuration with providers
import { App } from './app/app'; // Root component of the application

// Bootstrap the application with the root component and configuration
// If bootstrapping fails, log the error to the console
bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));