/**
 * Google Calendar Integration for PayPlan Pro
 * Uses Google Identity Services for OAuth and Google Calendar API
 */

const SCOPES = 'https://www.googleapis.com/auth/calendar';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const PAYPLAN_CALENDAR_NAME = 'PayPlan Bills';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;

/**
 * Load the Google API client library
 */
export const loadGoogleApi = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.gapi && gapiInited) {
      resolve();
      return;
    }

    // Load gapi script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = async () => {
      try {
        await new Promise((res) => window.gapi.load('client', res));
        await window.gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

/**
 * Load Google Identity Services
 */
export const loadGoogleIdentity = (clientId) => {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error('Google Client ID is required'));
      return;
    }

    // Check if already loaded
    if (window.google?.accounts?.oauth2 && gisInited) {
      resolve(tokenClient);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: '', // Will be set during authorization
      });
      gisInited = true;
      resolve(tokenClient);
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

/**
 * Initialize both Google APIs
 */
export const initializeGoogleCalendar = async (clientId) => {
  await loadGoogleApi();
  await loadGoogleIdentity(clientId);
  return true;
};

/**
 * Request user authorization
 */
export const authorizeGoogle = () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Identity not initialized'));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        reject(response);
      } else {
        resolve(response);
      }
    };

    // Check if we already have a token
    if (window.gapi.client.getToken() === null) {
      // Prompt for consent
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Skip consent if already authorized
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

/**
 * Sign out from Google
 */
export const signOutGoogle = () => {
  const token = window.gapi?.client?.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
};

/**
 * Find or create the PayPlan Bills calendar
 */
export const getOrCreatePayPlanCalendar = async () => {
  try {
    // List all calendars
    const response = await window.gapi.client.calendar.calendarList.list();
    const calendars = response.result.items || [];

    // Find existing PayPlan calendar
    const existingCalendar = calendars.find(
      (cal) => cal.summary === PAYPLAN_CALENDAR_NAME
    );

    if (existingCalendar) {
      return existingCalendar.id;
    }

    // Create new calendar
    const createResponse = await window.gapi.client.calendar.calendars.insert({
      resource: {
        summary: PAYPLAN_CALENDAR_NAME,
        description: 'Bill due dates and payment reminders from PayPlan Pro',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    // Set calendar color (green for bills)
    await window.gapi.client.calendar.calendarList.patch({
      calendarId: createResponse.result.id,
      resource: {
        backgroundColor: '#16a34a',
        foregroundColor: '#ffffff',
      },
    });

    return createResponse.result.id;
  } catch (error) {
    console.error('Error getting/creating calendar:', error);
    throw error;
  }
};

/**
 * Get all events from the PayPlan calendar
 */
export const getCalendarEvents = async (calendarId) => {
  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.result.items || [];
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

/**
 * Create or update a bill event
 */
export const syncBillToCalendar = async (calendarId, billInstance, existingEventId = null) => {
  const eventData = {
    summary: `💵 ${billInstance.name} Due`,
    description: [
      `Amount: $${(billInstance.actualPaid || billInstance.amountEstimate || 0).toFixed(2)}`,
      `Category: ${billInstance.category || 'Other'}`,
      billInstance.autopay ? '🔄 Auto-pay enabled' : '',
      billInstance.paid ? '✅ PAID' : '⏳ Pending',
    ].filter(Boolean).join('\n'),
    start: {
      date: billInstance.dueDate, // All-day event
    },
    end: {
      date: billInstance.dueDate,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 3 * 24 * 60 }, // 3 days before
      ],
    },
    colorId: billInstance.paid ? '10' : '11', // Green if paid, red if pending
  };

  try {
    if (existingEventId) {
      // Update existing event
      const response = await window.gapi.client.calendar.events.update({
        calendarId,
        eventId: existingEventId,
        resource: eventData,
      });
      return response.result;
    } else {
      // Create new event
      const response = await window.gapi.client.calendar.events.insert({
        calendarId,
        resource: eventData,
      });
      return response.result;
    }
  } catch (error) {
    console.error('Error syncing bill to calendar:', error);
    throw error;
  }
};

/**
 * Delete an event from the calendar
 */
export const deleteCalendarEvent = async (calendarId, eventId) => {
  try {
    await window.gapi.client.calendar.events.delete({
      calendarId,
      eventId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

/**
 * Sync all bill instances to Google Calendar
 */
export const syncAllBillsToCalendar = async (calendarId, billInstances) => {
  // Get existing events
  const existingEvents = await getCalendarEvents(calendarId);

  // Create a map of existing events by bill instance ID (stored in extendedProperties)
  const eventMap = new Map();
  existingEvents.forEach((event) => {
    // Try to match by summary and date
    const key = `${event.summary?.replace('💵 ', '').replace(' Due', '')}_${event.start?.date}`;
    eventMap.set(key, event.id);
  });

  const results = {
    created: 0,
    updated: 0,
    errors: [],
  };

  // Sync each bill instance
  for (const instance of billInstances) {
    try {
      const key = `${instance.name}_${instance.dueDate}`;
      const existingEventId = eventMap.get(key);

      await syncBillToCalendar(calendarId, instance, existingEventId);

      if (existingEventId) {
        results.updated++;
      } else {
        results.created++;
      }
    } catch (error) {
      results.errors.push({ instance: instance.name, error: error.message });
    }
  }

  return results;
};

/**
 * Delete the PayPlan calendar (for disconnecting)
 */
export const deletePayPlanCalendar = async (calendarId) => {
  try {
    await window.gapi.client.calendar.calendars.delete({
      calendarId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting calendar:', error);
    throw error;
  }
};

/**
 * Check if user is currently authorized
 */
export const isGoogleAuthorized = () => {
  return window.gapi?.client?.getToken() !== null;
};

// Storage keys (also exported from constants/storageKeys.js)
export const GOOGLE_CLIENT_ID_KEY = 'ppp.googleClientId';
export const GOOGLE_CALENDAR_ID_KEY = 'ppp.googleCalendarId';

/**
 * Re-initialize after page reload if we have saved credentials
 */
export const tryRestoreGoogleSession = async (clientId) => {
  if (!clientId) return false;
  try {
    await initializeGoogleCalendar(clientId);
    return true;
  } catch (error) {
    console.warn('Could not restore Google session:', error);
    return false;
  }
};
