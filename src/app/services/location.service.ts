import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  AndroidSettings,
  IOSSettings,
  NativeSettings,
} from 'capacitor-native-settings';
import { BehaviorSubject, map, Observable } from 'rxjs';
import {
  Location,
  HebrewCalendar,
  CalOptions,
  HDate,
  Event,
  CandleLightingEvent,
} from '@hebcal/core';
import cities from '../../assets/data/cities.json';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  cities = [...cities];
  coordinates$ = new BehaviorSubject({ lat: 31.768318, lng: 35.213711 });
  mapCenter$: Observable<google.maps.LatLngLiteral> = this.coordinates$.pipe(
    map((coordinates) => {
      const rtn: google.maps.LatLngLiteral = {
        lat: coordinates.lat,
        lng: coordinates.lng,
      };
      return rtn;
    })
  );
  closestCity$ = this.coordinates$.pipe(
    map(({ lat, lng }) => {
      // gte the city that is closest to the coordinates
      let closest = Location.lookup(this.cities[0]) as Location;
      for (const city of this.cities.slice(1)) {
        const location = Location.lookup(city) as Location;
        const disClosest = this.calcDistance(
          lat,
          lng,
          closest.getLatitude(),
          closest.getLongitude()
        );
        const disCurrent = this.calcDistance(
          lat,
          lng,
          location.getLatitude(),
          location.getLongitude()
        );
        if (disCurrent < disClosest) {
          closest = location;
        }
      }
      return closest;
    })
  );


  constructor() {
    this.getCurrentLocation();

  }

  calcDistance(latA: number, lonA: number, latB: number, lonB: number) {
    const dis = Math.sqrt(
      Math.abs(Math.abs(latA) - Math.abs(latB)) ** 2 +
        Math.abs(Math.abs(lonA) - Math.abs(lonB)) ** 2
    );
    return dis;
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
      }


      let options: PositionOptions = {
        maximumAge: 3000,
        timeout: 10000,
        enableHighAccuracy: true,
      };
      const position = await Geolocation.getCurrentPosition(options);
      console.log('Current Position', position);
      this.coordinates$.next({
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

  setMapCenter(lat: number, lng: number) {
    this.coordinates$.next({ lat, lng });
  }
}
