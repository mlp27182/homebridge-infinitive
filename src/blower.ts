import { Service, CharacteristicValue } from 'homebridge';
import Qty from 'js-quantities';

import { InfinitivePlatform } from './platform';
import { Infinitive } from './infinitive';

export class HVACBlower {
  private informationService: Service;
  private service: Service;

  constructor(
        private readonly platform: InfinitivePlatform,
        private readonly infinitive: Infinitive,
        private readonly name: string,
  ) {
    const {
      Name,
      Active,
      CurrentFanState,
      TargetFanState,
      RotationSpeed
    } = this.platform.api.hap.Characteristic;

    this.informationService = new this.platform.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, 'Carrier')
      .setCharacteristic(this.platform.api.hap.Characteristic.Model, 'Infinitive')
      .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, this.platform.config.url);

    this.service = new this.platform.api.hap.Service.Fanv2(this.name);

    this.service.setCharacteristic(Name, `${this.platform.config.name} HVAC Blower`);

    this.service.getCharacteristic(Active)
      .onGet(this.getCurrentTemperature.bind(this));
  }

  getServices() {
    return [
      this.informationService,
      this.service,
    ];
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    const state = await this.infinitive.fetchThermostatState();
    const fanMode = state.fanMode;

    return temperature.to('tempC').scalar;
  }
}
