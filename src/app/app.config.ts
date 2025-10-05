import { LocationStrategy, Location, PathLocationStrategy } from '@angular/common';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    {
      provide: Location,
      useFactory: (locationStrategy: LocationStrategy) => {
        // Here we ensure the instance is created correctly.
        return new Location(locationStrategy);
      },
      deps: [LocationStrategy]
    },
    { provide: LocationStrategy, useClass: PathLocationStrategy },
  ],
};
