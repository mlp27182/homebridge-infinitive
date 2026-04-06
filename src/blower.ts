import { Service, CharacteristicValue, Logger } from 'homebridge';

import { InfinitivePlatform } from './platform';
import { Infinitive } from './infinitive';

const FAN_MODE_SPEEDS: Record<string, number> = {
  'low': 33,
  'med': 67,
  'high': 100,
};

function speedToFanMode(speed: number): string {
  if (speed <= 33) {
    return 'low';
  } else if (speed <= 67) {
    return 'med';
  } else {
    return 'high';
  }
}

export class HVACBlower {
  private readonly log: Logger;
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
      RotationSpeed,
    } = this.platform.api.hap.Characteristic;

    this.log = this.platform.log;

    this.informationService = new this.platform.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, 'Carrier')
      .setCharacteristic(this.platform.api.hap.Characteristic.Model, 'Infinitive')
      .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, this.platform.config.url);

    this.service = new this.platform.api.hap.Service.Fanv2(this.name);

    this.service.setCharacteristic(Name, `${this.platform.config.name} HVAC Fan`);

    this.service.getCharacteristic(Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(CurrentFanState)
      .onGet(this.getCurrentFanState.bind(this));

    this.service.getCharacteristic(TargetFanState)
      .onGet(this.getTargetFanState.bind(this))
      .onSet(this.setTargetFanState.bind(this));

    this.service.getCharacteristic(RotationSpeed)
      .onGet(this.getRotationSpeed.bind(this))
      .onSet(this.setRotationSpeed.bind(this));
  }

  getServices() {
    return [
      this.informationService,
      this.service,
    ];
  }

  async getActive(): Promise<CharacteristicValue> {
    const { Active } = this.platform.api.hap.Characteristic;
    const { fanMode } = await this.infinitive.fetchThermostatState();
    return fanMode !== 'auto' ? Active.ACTIVE : Active.INACTIVE;
  }

  async setActive(value: CharacteristicValue) {
    const { Active } = this.platform.api.hap.Characteristic;
    if (value === Active.INACTIVE) {
      await this.infinitive.setThermostatState({ fanMode: 'auto' });
    } else {
      await this.infinitive.setThermostatState({ fanMode: 'low' });
      this.service.updateCharacteristic(
        this.platform.api.hap.Characteristic.RotationSpeed,
        FAN_MODE_SPEEDS['low'],
      );
    }
  }

  async getCurrentFanState(): Promise<CharacteristicValue> {
    const { CurrentFanState } = this.platform.api.hap.Characteristic;
    const { fanMode } = await this.infinitive.fetchThermostatState();
    return fanMode !== 'auto' ? CurrentFanState.BLOWING_AIR : CurrentFanState.IDLE;
  }

  async getTargetFanState(): Promise<CharacteristicValue> {
    const { TargetFanState } = this.platform.api.hap.Characteristic;
    const { fanMode } = await this.infinitive.fetchThermostatState();
    return fanMode === 'auto' ? TargetFanState.AUTO : TargetFanState.MANUAL;
  }

  async setTargetFanState(value: CharacteristicValue) {
    const { TargetFanState } = this.platform.api.hap.Characteristic;
    if (value === TargetFanState.AUTO) {
      await this.infinitive.setThermostatState({ fanMode: 'auto' });
    } else {
      await this.infinitive.setThermostatState({ fanMode: 'low' });
      this.service.updateCharacteristic(
        this.platform.api.hap.Characteristic.RotationSpeed,
        FAN_MODE_SPEEDS['low'],
      );
    }
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    const { fanMode } = await this.infinitive.fetchThermostatState();
    return FAN_MODE_SPEEDS[fanMode] ?? 0;
  }

  async setRotationSpeed(value: CharacteristicValue) {
    const fanMode = speedToFanMode(value as number);
    this.log.debug(`Setting fan speed to ${fanMode} (${value}%)`);
    await this.infinitive.setThermostatState({ fanMode });
  }
}
