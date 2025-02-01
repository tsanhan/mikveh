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

  getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = this.deg2rad(lat2 - lat1); // deg2rad below
    var dLon = this.deg2rad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
  }

  deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }
}
