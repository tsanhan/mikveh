import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { ChangeDetectionStrategy, Component, OnInit, signal, Signal } from '@angular/core';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { Geolocation, PositionOptions } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonContent]
})
export class MapComponent {
  lat = signal(0);
  lng = signal(0);

  constructor() { }

  async getCurrentLocation(){
    try {
      const permissionsCheck = await Geolocation.checkPermissions();
      console.log('Current Permissions',permissionsCheck.location);

      if(permissionsCheck.location !== 'granted'){
        const permissionsRequest = await Geolocation.requestPermissions(); // Request permissions works on physical devices

        if(permissionsRequest.location !== 'granted'){
          console.log('Location Denied');
          this.openSettings(true);
          return null;
        }

        return null;
      }


      let options: PositionOptions = {
        maximumAge: 3000,
        timeout: 10000,
        enableHighAccuracy: true
      };
      const position = await Geolocation.getCurrentPosition(options);
      console.log('Current Position', position);
      this.lat.set(position.coords.latitude);
      this.lng.set(position.coords.longitude);
      return position;
    } catch (error : any) {
      // the location in the device is disabled
      if (error?.message === "Location services are not enabled") {
       await this.openSettings();
      }
      console.log('Error getting location', error);
      throw(error);
    }

  }

  openSettings(app = false) {
    return NativeSettings.open({
      optionAndroid: app ? AndroidSettings.ApplicationDetails : AndroidSettings.Location,
      optionIOS:  app ? IOSSettings.App : IOSSettings.LocationServices
    })
  }



}
