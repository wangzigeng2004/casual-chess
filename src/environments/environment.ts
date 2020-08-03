// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: "[API_KEY]",
    authDomain: "[AUTH_DOMAIN]",
    databaseURL: "[DATABASE_URL]",
    projectId: "[PROJECT_ID]",
    storageBucket: "[STORAGE_BUCKET]",
    messagingSenderId: "[MESSAGING_SENDER_ID]",
    appId: "[APP_ID]"
  },
  imgur: {
    clientId: "[CLIENT_ID]"
  },
  vapidPublicKey: "[VAPID_PUBLIC_KEY]",
  sendNotificationUrl: "[NOTIFICATION_URL]"
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
