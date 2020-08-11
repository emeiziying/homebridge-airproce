import {
  Service,
  CharacteristicValue,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
  AccessoryConfig,
  AccessoryPlugin,
  API,
  Logging,
  HAP,
} from 'homebridge';

import sha1 from 'js-sha1';
import axios from 'axios';

interface AirproceData {
  userId: string;
  deviceId: string;
  rank?: number;
  mode?: number;
  function?: string;
  time?: number;
  lang?: string;
  sec?: string;
}

export class AirproceAccessory implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly config: AccessoryConfig;
  private readonly name: string;
  private readonly hash: string;
  private activeStatus = 0;
  private rotationSpeed = 0;

  private readonly airproceService: Service;
  private readonly informationService: Service;
  private readonly hap: HAP;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.config = config;
    this.name = config.name;
    this.hash = config.hash;
    this.hap = api.hap;

    this.log.debug('Airproce Accessory Plugin Loaded');

    this.airproceService = new this.hap.Service.AirPurifier(this.name);
    this.airproceService
      .getCharacteristic(this.hap.Characteristic.Active)
      .on(CharacteristicEventTypes.GET, this.handleActiveGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleActiveSet.bind(this));

    this.airproceService
      .getCharacteristic(this.hap.Characteristic.RotationSpeed)
      .on(CharacteristicEventTypes.GET, this.handleRotationSpeedGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleRotationSpeedSet.bind(this));

    this.informationService = new this.hap.Service.AccessoryInformation()
      .setCharacteristic(this.hap.Characteristic.Manufacturer, 'emeiziying')
      .setCharacteristic(this.hap.Characteristic.Model, 'Airproce')
      .setCharacteristic(this.hap.Characteristic.SerialNumber, '001');

    this.log.info('Airproce finished initializing!');

    this.log.info(
      this.getSecret({
        deviceId: '75461',
        rank: 5,
        mode: 1,
        function: '021300000000',
        time: +new Date(),
        lang: 'zh-CN',
        userId: '86013',
      }),
    );
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log('Identify!');
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [this.informationService, this.airproceService];
  }

  /**
   * Handle requests to get the current value of the "Active" characteristic
   */
  handleActiveGet(callback: CharacteristicGetCallback) {
    this.log.debug('Triggered GET Active');
    callback(null, this.activeStatus);
  }

  /**
   * Handle requests to set the "Active" characteristic
   */
  handleActiveSet(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ) {
    this.log.debug('Triggered SET Active:', value);
    this.activeStatus = value as number;
    callback(null);
  }

  /**
   * Handle requests to get the current value of the "Active" characteristic
   */
  handleRotationSpeedGet(callback: CharacteristicGetCallback) {
    this.log.debug('Triggered GET RotationSpeed');
    const step = 100 / this.config.segment;
    callback(null, this.rotationSpeed * step);
  }

  /**
   * Handle requests to set the "Active" characteristic
   */
  handleRotationSpeedSet(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ) {
    this.log.debug('Triggered SET RotationSpeed:', value);
    const speed = value as number;
    const step = 100 / this.config.segment;
    this.rotationSpeed = Math.ceil(speed / step);
    callback(null);
  }

  httpGet(data: AirproceData) {
    axios.get('https://wx.airproce.com/appAPI/controlStatus', {
      params: data,
    });
  }

  getSecret(data: AirproceData) {
    const keys = Object.keys(data).sort();

    let tmp = this.config.hash;
    for (let i = 0; i < keys.length; i++) {
      tmp += keys[i] + data[keys[i]];
    }

    const hash = sha1.create();
    hash.update(tmp);

    return hash.hex().substr(0, 8);
  }
}
