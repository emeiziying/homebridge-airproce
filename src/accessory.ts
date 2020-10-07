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
  private OnStatus = 0;
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

    this.airproceService = new this.hap.Service.Fan(this.name);
    this.airproceService
      .getCharacteristic(this.hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, this.handleOnGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleOnSet.bind(this));

    this.airproceService
      .getCharacteristic(this.hap.Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 5,
        minStep: 1,
      })
      .on(CharacteristicEventTypes.GET, this.handleRotationSpeedGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleRotationSpeedSet.bind(this));

    this.informationService = new this.hap.Service.AccessoryInformation()
      .setCharacteristic(this.hap.Characteristic.Manufacturer, 'emeiziying')
      .setCharacteristic(this.hap.Characteristic.Model, 'Airproce')
      .setCharacteristic(this.hap.Characteristic.SerialNumber, '001');

    this.log.info('Airproce finished initializing!');

    this.getStatus();
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
   * Handle requests to get the current value of the "On" characteristic
   */
  handleOnGet(callback: CharacteristicGetCallback) {
    this.log.debug('Triggered GET On');

    this.getStatus(() => {
      callback(null, this.OnStatus);

      this.airproceService.updateCharacteristic(
        this.hap.Characteristic.On,
        this.OnStatus,
      );
    });
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  handleOnSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.log.debug('Triggered SET On:', value);

    this.OnStatus = value as number;

    this.updateStatus(this.OnStatus ? 0 : 16, () => {
      callback(null);
    });
  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  handleRotationSpeedGet(callback: CharacteristicGetCallback) {
    this.log.debug('Triggered GET RotationSpeed');

    // this.getStatus(() => {
    //   callback(null, this.rotationSpeed * step);
    // });

    callback(null, this.rotationSpeed);
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  handleRotationSpeedSet(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ) {
    this.log.debug('Triggered SET RotationSpeed:', value);
    
    this.rotationSpeed = value as number;
    this.updateStatus(1, () => {
      callback(null);
    });
  }

  getStatus(callback?) {
    this.sendRequest(
      {
        userId: this.config.userId,
        deviceId: this.config.deviceId,
      },
      (res) => {
        if (res) {
          this.OnStatus = res.control.rank === 0 ? 0 : 1;
          this.rotationSpeed = res.control.rank;
        } else {
          this.OnStatus = 0;
          this.rotationSpeed = 0;
        }

        callback && callback();
      },
    );
  }

  updateStatus(mode, callback) {
    this.sendRequest(
      {
        userId: this.config.userId,
        deviceId: this.config.deviceId,
        rank: this.rotationSpeed,
        mode: mode,
        function: '021300000000',
        time: +new Date(),
        lang: 'zh-CN',
      },
      (res) => {
        if (res) {
          this.OnStatus = res.control.rank === 0 ? 0 : 1;
          this.rotationSpeed = res.control.rank;
        } else {
          this.OnStatus = 0;
          this.rotationSpeed = 0;
        }
        callback(null);
      },
    );
  }

  sendRequest(data: AirproceData, callback?) {
    data.sec = this.getSecret(data);
    this.log.info(JSON.stringify(data));
    axios
      .get('https://wx.airproce.com/appAPI/controlStatus', {
        params: data,
      })
      .then((response) => {
        this.log.info(JSON.stringify(response.data));
        callback && callback(response.data);
      })
      .catch((error) => {
        this.log.info('SendRequest Fail ' + JSON.stringify(error));
        callback && callback(null);
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
