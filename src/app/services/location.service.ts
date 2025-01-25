import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  AndroidSettings,
  IOSSettings,
  NativeSettings,
} from 'capacitor-native-settings';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  coordinates = new BehaviorSubject({ lat: 31.768318, lng: 35.213711 });

  constructor() {
    this.getCurrentLocation();
  }

  async getCurrentLocation() {
    try {
      const permissionsCheck = await Geolocation.checkPermissions();
      console.log('Current Permissions', permissionsCheck.location);

      if (permissionsCheck.location !== 'granted') {
        const permissionsRequest = await Geolocation.requestPermissions(); // Request permissions works on physical devices

        if (permissionsRequest.location !== 'granted') {
          console.log('Location Denied');
          this.openSettings(true);
          return null;
        }

        return null;
      }

      let options: PositionOptions = {
        maximumAge: 3000,
        timeout: 10000,
        enableHighAccuracy: true,
      };
      const position = await Geolocation.getCurrentPosition(options);
      console.log('Current Position', position);
      this.coordinates.next({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      return position;
    } catch (error: any) {
      // the location in the device is disabled
      if (error?.message === 'Location services are not enabled') {

        await this.openSettings();
      }
      console.log('Error getting location', error);
      throw error;
    }
  }

  openSettings(app = false) {
    return NativeSettings.open({
      optionAndroid: app
        ? AndroidSettings.ApplicationDetails
        : AndroidSettings.Location,
      optionIOS: app ? IOSSettings.App : IOSSettings.LocationServices,
    });
  }
}
